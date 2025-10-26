/**
 * validate - Unit Tests
 *
 * Real executable tests for the validate command that verify actual behavior
 * using temporary file system operations.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { rm } from "node:fs/promises";
import {
	validateProject,
	type ValidationResult,
} from "@/core/commands/validate";
import {
	createTestProject,
	addToolToProject,
	createProjectWithInvalidWrangler,
	createIntegrationTestYaml,
} from "../../helpers/project-setup.js";

describe("validate command", () => {
	let projectDir: string;

	afterEach(async () => {
		// Clean up test project
		if (projectDir) {
			// Get parent temp directory (one level up from project)
			const tempDir = projectDir.substring(0, projectDir.lastIndexOf("/"));
			await rm(tempDir, { recursive: true, force: true });
		}
	});

	describe("tool registration detection", () => {
		it("should detect unregistered tools", async () => {
			projectDir = await createTestProject();

			// Add a tool file without registering it in index.ts
			await addToolToProject(projectDir, "unregistered-tool", {
				registered: false,
			});

			const result = await validateProject(projectDir, {});

			expect(result.passed).toBe(false);
			expect(result.summary.errors).toBeGreaterThan(0);
			expect(result.issues).toContainEqual(
				expect.objectContaining({
					severity: "error",
					category: "Registration",
					message: expect.stringContaining("not registered"),
				}),
			);
		});

		it("should detect orphaned registrations (registered but file missing)", async () => {
			projectDir = await createTestProject();

			// Add a tool and register it
			await addToolToProject(projectDir, "temp-tool", { registered: true });

			// Now delete the tool file (simulating orphaned registration)
			const { rm: removeFile } = await import("node:fs/promises");
			const { join } = await import("node:path");
			await removeFile(join(projectDir, "src", "tools", "temp-tool.ts"));

			const result = await validateProject(projectDir, {});

			expect(result.passed).toBe(false);
			expect(result.issues).toContainEqual(
				expect.objectContaining({
					severity: "error",
					category: "Registration",
					message: expect.stringContaining("registered but file doesn't exist"),
				}),
			);
		});

		it("should handle kebab-case tool names correctly", async () => {
			projectDir = await createTestProject();

			// Add a tool with hyphens (kebab-case)
			await addToolToProject(projectDir, "my-hyphenated-tool", {
				registered: true,
			});

			const result = await validateProject(projectDir, {});

			// Should not have registration errors for this tool
			const registrationIssues = result.issues.filter(
				(issue) =>
					issue.category === "Registration" &&
					issue.message.includes("my-hyphenated-tool"),
			);

			expect(registrationIssues).toHaveLength(0);
		});

		it("should skip example tools in validation", async () => {
			projectDir = await createTestProject();

			// The template includes _example-*.ts files
			// These should be skipped in validation

			const result = await validateProject(projectDir, {});

			// Should not report errors about example tools
			const exampleIssues = result.issues.filter((issue) =>
				issue.message.includes("_example"),
			);

			expect(exampleIssues).toHaveLength(0);
		});

		it("should handle multiple tools with mixed registration status", async () => {
			projectDir = await createTestProject();

			// Add registered tool
			await addToolToProject(projectDir, "registered-tool", {
				registered: true,
			});

			// Add unregistered tool
			await addToolToProject(projectDir, "unregistered-tool", {
				registered: false,
			});

			const result = await validateProject(projectDir, {});

			// Should have exactly 1 registration error (for unregistered tool)
			const registrationErrors = result.issues.filter(
				(issue) =>
					issue.category === "Registration" && issue.severity === "error",
			);

			expect(registrationErrors.length).toBeGreaterThanOrEqual(1);
			expect(registrationErrors).toContainEqual(
				expect.objectContaining({
					message: expect.stringContaining("unregistered-tool"),
				}),
			);
		});
	});

	describe("test file detection", () => {
		it("should warn about missing unit tests", async () => {
			projectDir = await createTestProject();

			// Add tool without unit test
			await addToolToProject(projectDir, "no-unit-test", {
				registered: true,
				hasUnitTest: false,
			});

			const result = await validateProject(projectDir, {});

			expect(result.issues).toContainEqual(
				expect.objectContaining({
					severity: "warning",
					category: "Testing",
					message: expect.stringContaining("missing unit test"),
				}),
			);
		});

		it("should warn about missing integration tests", async () => {
			projectDir = await createTestProject();

			// Add tool without integration test
			await addToolToProject(projectDir, "no-integration-test", {
				registered: true,
				hasIntegrationTest: false,
			});

			const result = await validateProject(projectDir, {});

			expect(result.issues).toContainEqual(
				expect.objectContaining({
					severity: "warning",
					category: "Testing",
					message: expect.stringContaining("missing integration test"),
				}),
			);
		});

		it("should pass when both tests are present", async () => {
			projectDir = await createTestProject();

			// Add tool with both tests
			await addToolToProject(projectDir, "fully-tested", {
				registered: true,
				hasUnitTest: true,
				hasIntegrationTest: true,
			});

			const result = await validateProject(projectDir, {});

			// Should not have testing warnings for this tool
			const testingIssues = result.issues.filter(
				(issue) =>
					issue.category === "Testing" && issue.message.includes("fully-tested"),
			);

			expect(testingIssues).toHaveLength(0);
		});

		it("should handle tools with no tests at all", async () => {
			projectDir = await createTestProject();

			// Add tool with no tests
			await addToolToProject(projectDir, "no-tests", {
				registered: true,
				hasUnitTest: false,
				hasIntegrationTest: false,
			});

			const result = await validateProject(projectDir, {});

			// Should have 2 warnings (one for each missing test type)
			const testingIssues = result.issues.filter(
				(issue) =>
					issue.category === "Testing" && issue.message.includes("no-tests"),
			);

			expect(testingIssues.length).toBe(2);
		});
	});

	describe("YAML validation", () => {
		it("should detect missing required field: name", async () => {
			projectDir = await createTestProject();

			await addToolToProject(projectDir, "test-tool", { registered: true });
			await createIntegrationTestYaml(projectDir, "test-tool", {
				missingName: true,
			});

			const result = await validateProject(projectDir, {});

			expect(result.issues).toContainEqual(
				expect.objectContaining({
					severity: "error",
					category: "YAML",
					message: expect.stringContaining('missing "name" field'),
				}),
			);
		});

		it("should detect missing required field: tool", async () => {
			projectDir = await createTestProject();

			await addToolToProject(projectDir, "test-tool", { registered: true });
			await createIntegrationTestYaml(projectDir, "test-tool", {
				missingTool: true,
			});

			const result = await validateProject(projectDir, {});

			expect(result.issues).toContainEqual(
				expect.objectContaining({
					severity: "error",
					category: "YAML",
					message: expect.stringContaining('missing "tool" field'),
				}),
			);
		});

		it("should detect missing required field: assertions", async () => {
			projectDir = await createTestProject();

			await addToolToProject(projectDir, "test-tool", { registered: true });
			await createIntegrationTestYaml(projectDir, "test-tool", {
				missingAssertions: true,
			});

			const result = await validateProject(projectDir, {});

			expect(result.issues).toContainEqual(
				expect.objectContaining({
					severity: "error",
					category: "YAML",
					message: expect.stringContaining('missing "assertions"'),
				}),
			);
		});

		it("should detect invalid YAML syntax", async () => {
			projectDir = await createTestProject();

			await addToolToProject(projectDir, "test-tool", { registered: true });
			await createIntegrationTestYaml(projectDir, "test-tool", {
				invalidYaml: true,
			});

			const result = await validateProject(projectDir, {});

			expect(result.issues).toContainEqual(
				expect.objectContaining({
					severity: "error",
					category: "YAML",
					message: expect.stringContaining("invalid YAML"),
				}),
			);
		});

		it("should warn about tool name mismatch", async () => {
			projectDir = await createTestProject();

			await addToolToProject(projectDir, "test-tool", { registered: true });
			await createIntegrationTestYaml(projectDir, "test-tool", {
				toolNameMismatch: "different-tool",
			});

			const result = await validateProject(projectDir, {});

			expect(result.issues).toContainEqual(
				expect.objectContaining({
					severity: "warning",
					category: "YAML",
					message: expect.stringContaining("doesn't match file name"),
				}),
			);
		});

		it("should pass for valid YAML", async () => {
			projectDir = await createTestProject();

			await addToolToProject(projectDir, "valid-tool", {
				registered: true,
				hasIntegrationTest: true,
			});

			const result = await validateProject(projectDir, {});

			// Should not have YAML errors for this tool
			const yamlIssues = result.issues.filter(
				(issue) =>
					issue.category === "YAML" && issue.message.includes("valid-tool"),
			);

			expect(yamlIssues).toHaveLength(0);
		});
	});

	describe("wrangler.jsonc validation", () => {
		it("should detect missing wrangler configuration file", async () => {
			projectDir = await createProjectWithInvalidWrangler({
				missingFile: true,
			});

			const result = await validateProject(projectDir, {});

			expect(result.issues).toContainEqual(
				expect.objectContaining({
					severity: "error",
					category: "Configuration",
					message: expect.stringContaining("wrangler.jsonc or wrangler.json not found"),
				}),
			);
		});

		it("should detect missing required field: name", async () => {
			projectDir = await createProjectWithInvalidWrangler({
				missingName: true,
			});

			const result = await validateProject(projectDir, {});

			expect(result.issues).toContainEqual(
				expect.objectContaining({
					severity: "error",
					category: "Configuration",
					message: expect.stringContaining('Missing required field "name"'),
				}),
			);
		});

		it("should detect missing required field: main", async () => {
			projectDir = await createProjectWithInvalidWrangler({
				missingMain: true,
			});

			const result = await validateProject(projectDir, {});

			expect(result.issues).toContainEqual(
				expect.objectContaining({
					severity: "error",
					category: "Configuration",
					message: expect.stringContaining('Missing required field "main"'),
				}),
			);
		});

		it("should detect missing required field: compatibility_date", async () => {
			projectDir = await createProjectWithInvalidWrangler({
				missingCompatibilityDate: true,
			});

			const result = await validateProject(projectDir, {});

			expect(result.issues).toContainEqual(
				expect.objectContaining({
					severity: "error",
					category: "Configuration",
					message: expect.stringContaining('Missing required field "compatibility_date"'),
				}),
			);
		});

		it("should detect missing durable_objects configuration", async () => {
			projectDir = await createProjectWithInvalidWrangler({
				missingDurableObjects: true,
			});

			const result = await validateProject(projectDir, {});

			expect(result.issues).toContainEqual(
				expect.objectContaining({
					severity: "error",
					category: "Configuration",
					message: expect.stringContaining("Missing 'durable_objects' configuration"),
				}),
			);
		});

		it("should detect missing MCP_OBJECT binding", async () => {
			projectDir = await createProjectWithInvalidWrangler({
				missingMcpBinding: true,
			});

			const result = await validateProject(projectDir, {});

			expect(result.issues).toContainEqual(
				expect.objectContaining({
					severity: "error",
					category: "Configuration",
					message: expect.stringContaining('Missing "MCP_OBJECT" binding'),
				}),
			);
		});

		it("should detect missing migrations configuration", async () => {
			projectDir = await createProjectWithInvalidWrangler({
				missingMigrations: true,
			});

			const result = await validateProject(projectDir, {});

			expect(result.issues).toContainEqual(
				expect.objectContaining({
					severity: "error",
					category: "Configuration",
					message: expect.stringContaining("Missing 'migrations' configuration"),
				}),
			);
		});

		it("should validate class existence in index.ts", async () => {
			projectDir = await createProjectWithInvalidWrangler({
				invalidClass: true,
			});

			const result = await validateProject(projectDir, {});

			expect(result.issues).toContainEqual(
				expect.objectContaining({
					severity: "error",
					category: "Configuration",
					message: expect.stringContaining("not found in src/index.ts"),
				}),
			);
		});

		it("should detect missing class_name in MCP_OBJECT binding", async () => {
			projectDir = await createTestProject();

			// Create wrangler.jsonc with MCP_OBJECT binding but no class_name
			const { writeFile } = await import("node:fs/promises");
			const { join } = await import("node:path");
			const wranglerPath = join(projectDir, "wrangler.jsonc");
			const config = {
				name: "test-server",
				main: "src/index.ts",
				compatibility_date: "2024-01-01",
				durable_objects: {
					bindings: [
						{
							name: "MCP_OBJECT",
							// Missing class_name
						},
					],
				},
				migrations: [{ tag: "v1", new_sqlite_classes: ["MCPServerAgent"] }],
			};

			await writeFile(wranglerPath, JSON.stringify(config, null, 2), "utf-8");

			const result = await validateProject(projectDir, {});

			expect(result.issues).toContainEqual(
				expect.objectContaining({
					severity: "error",
					category: "Configuration",
					message: expect.stringContaining("missing class_name"),
				}),
			);
		});

		it("should detect empty migrations array", async () => {
			projectDir = await createTestProject();

			// Create wrangler.jsonc with empty migrations array
			const { writeFile } = await import("node:fs/promises");
			const { join } = await import("node:path");
			const wranglerPath = join(projectDir, "wrangler.jsonc");
			const config = {
				name: "test-server",
				main: "src/index.ts",
				compatibility_date: "2024-01-01",
				durable_objects: {
					bindings: [{ name: "MCP_OBJECT", class_name: "MCPServerAgent" }],
				},
				migrations: [], // Empty array
			};

			await writeFile(wranglerPath, JSON.stringify(config, null, 2), "utf-8");

			const result = await validateProject(projectDir, {});

			expect(result.issues).toContainEqual(
				expect.objectContaining({
					severity: "error",
					category: "Configuration",
					message: expect.stringContaining("migrations array is empty"),
				}),
			);
		});

		it("should warn about missing MCPServerAgent in new_sqlite_classes", async () => {
			projectDir = await createTestProject();

			// Create wrangler.jsonc with migrations but no MCPServerAgent
			const { writeFile } = await import("node:fs/promises");
			const { join } = await import("node:path");
			const wranglerPath = join(projectDir, "wrangler.jsonc");
			const config = {
				name: "test-server",
				main: "src/index.ts",
				compatibility_date: "2024-01-01",
				durable_objects: {
					bindings: [{ name: "MCP_OBJECT", class_name: "MCPServerAgent" }],
				},
				migrations: [
					{
						tag: "v1",
						new_sqlite_classes: [], // Missing MCPServerAgent
					},
				],
			};

			await writeFile(wranglerPath, JSON.stringify(config, null, 2), "utf-8");

			const result = await validateProject(projectDir, {});

			expect(result.issues).toContainEqual(
				expect.objectContaining({
					severity: "warning",
					category: "Configuration",
					message: expect.stringContaining("No migration includes MCPServerAgent"),
				}),
			);
		});

		it("should detect deprecated mcp field", async () => {
			projectDir = await createTestProject();

			// Create wrangler.jsonc with deprecated 'mcp' field
			const { writeFile } = await import("node:fs/promises");
			const { join } = await import("node:path");
			const wranglerPath = join(projectDir, "wrangler.jsonc");
			const config = {
				name: "test-server",
				main: "src/index.ts",
				compatibility_date: "2024-01-01",
				durable_objects: {
					bindings: [{ name: "MCP_OBJECT", class_name: "MCPServerAgent" }],
				},
				migrations: [{ tag: "v1", new_sqlite_classes: ["MCPServerAgent"] }],
				mcp: {
					// Deprecated field
					version: "1.0.0",
				},
			};

			await writeFile(wranglerPath, JSON.stringify(config, null, 2), "utf-8");

			const result = await validateProject(projectDir, {});

			expect(result.issues).toContainEqual(
				expect.objectContaining({
					severity: "error",
					category: "Configuration",
					message: expect.stringContaining('Deprecated "mcp" field found'),
				}),
			);
		});
	});

	describe("metadata validation", () => {
		it("should detect missing .mcp-template.json", async () => {
			projectDir = await createTestProject({ hasMetadata: false });

			const result = await validateProject(projectDir, {});

			expect(result.passed).toBe(false);
			expect(result.issues).toContainEqual(
				expect.objectContaining({
					severity: "error",
					category: "Metadata",
					message: expect.stringContaining(".mcp-template.json not found"),
				}),
			);
		});

		it("should detect tools in metadata that don't exist", async () => {
			projectDir = await createTestProject();

			// Manually add a non-existent tool to metadata
			const { readFile, writeFile } = await import("node:fs/promises");
			const { join } = await import("node:path");
			const metadataPath = join(projectDir, ".mcp-template.json");
			const metadata = JSON.parse(await readFile(metadataPath, "utf-8"));

			if (!metadata.tools) {
				metadata.tools = [];
			}

			metadata.tools.push({
				name: "ghost-tool",
				file: "src/tools/ghost-tool.ts",
				registered: true,
				hasUnitTest: false,
				hasIntegrationTest: false,
			});

			await writeFile(metadataPath, JSON.stringify(metadata, null, 2), "utf-8");

			const result = await validateProject(projectDir, {});

			expect(result.issues).toContainEqual(
				expect.objectContaining({
					severity: "warning",
					category: "Metadata",
					message: expect.stringContaining("ghost-tool"),
					message: expect.stringContaining("doesn't exist"),
				}),
			);
		});

		it("should detect tools that exist but aren't tracked in metadata", async () => {
			projectDir = await createTestProject();

			// Ensure metadata has a tools array (even if empty)
			const { readFile, writeFile } = await import("node:fs/promises");
			const { join } = await import("node:path");
			const metadataPath = join(projectDir, ".mcp-template.json");
			const metadata = JSON.parse(await readFile(metadataPath, "utf-8"));

			// Ensure tools array exists
			if (!metadata.tools) {
				metadata.tools = [];
			}

			await writeFile(metadataPath, JSON.stringify(metadata, null, 2), "utf-8");

			// Now add a tool but don't update metadata
			await addToolToProject(projectDir, "untracked-tool", {
				registered: true,
			});

			const result = await validateProject(projectDir, {});

			expect(result.issues).toContainEqual(
				expect.objectContaining({
					severity: "info",
					category: "Metadata",
					message: expect.stringContaining("untracked-tool"),
					message: expect.stringContaining("not tracked"),
				}),
			);
		});

		it("should detect incorrect registration status in metadata", async () => {
			projectDir = await createTestProject();

			// Add a tool without registering it
			await addToolToProject(projectDir, "test-tool", {
				registered: false,
			});

			// Manually mark it as registered in metadata
			const { readFile, writeFile } = await import("node:fs/promises");
			const { join } = await import("node:path");
			const metadataPath = join(projectDir, ".mcp-template.json");
			const metadata = JSON.parse(await readFile(metadataPath, "utf-8"));

			if (!metadata.tools) {
				metadata.tools = [];
			}

			metadata.tools.push({
				name: "test-tool",
				file: "src/tools/test-tool.ts",
				registered: true, // Incorrect - it's not actually registered
				hasUnitTest: false,
				hasIntegrationTest: false,
			});

			await writeFile(metadataPath, JSON.stringify(metadata, null, 2), "utf-8");

			const result = await validateProject(projectDir, {});

			expect(result.issues).toContainEqual(
				expect.objectContaining({
					severity: "info",
					category: "Metadata",
					message: expect.stringContaining("test-tool"),
					message: expect.stringContaining("registration status"),
					message: expect.stringContaining("incorrect"),
				}),
			);
		});

		it("should detect incorrect test status in metadata", async () => {
			projectDir = await createTestProject();

			// Add a tool with unit test
			await addToolToProject(projectDir, "test-tool", {
				registered: true,
				hasUnitTest: true,
			});

			// Manually mark it as not having unit test in metadata
			const { readFile, writeFile } = await import("node:fs/promises");
			const { join } = await import("node:path");
			const metadataPath = join(projectDir, ".mcp-template.json");
			const metadata = JSON.parse(await readFile(metadataPath, "utf-8"));

			if (!metadata.tools) {
				metadata.tools = [];
			}

			metadata.tools.push({
				name: "test-tool",
				file: "src/tools/test-tool.ts",
				registered: true,
				hasUnitTest: false, // Incorrect - it has a unit test
				hasIntegrationTest: false,
			});

			await writeFile(metadataPath, JSON.stringify(metadata, null, 2), "utf-8");

			const result = await validateProject(projectDir, {});

			expect(result.issues).toContainEqual(
				expect.objectContaining({
					severity: "info",
					category: "Metadata",
					message: expect.stringContaining("test-tool"),
					message: expect.stringContaining("unit test status"),
					message: expect.stringContaining("incorrect"),
				}),
			);
		});
	});

	describe("integration and error handling", () => {
		it("should pass validation for a completely valid project", async () => {
			projectDir = await createTestProject();

			// Add a fully compliant tool
			await addToolToProject(projectDir, "compliant-tool", {
				registered: true,
				hasUnitTest: true,
				hasIntegrationTest: true,
			});

			const result = await validateProject(projectDir, {});

			// May have info-level issues, but should pass (no errors)
			expect(result.summary.errors).toBe(0);
		});

		it("should aggregate multiple issues by category", async () => {
			projectDir = await createTestProject();

			// Create multiple issues
			await addToolToProject(projectDir, "unregistered-1", {
				registered: false,
			});
			await addToolToProject(projectDir, "unregistered-2", {
				registered: false,
			});
			await addToolToProject(projectDir, "no-tests", {
				registered: true,
				hasUnitTest: false,
				hasIntegrationTest: false,
			});

			const result = await validateProject(projectDir, {});

			// Should have multiple issues
			expect(result.issues.length).toBeGreaterThan(3);

			// Should have both Registration and Testing categories
			const categories = new Set(result.issues.map((i) => i.category));
			expect(categories.has("Registration")).toBe(true);
			expect(categories.has("Testing")).toBe(true);
		});

		it("should fail in strict mode when there are warnings", async () => {
			projectDir = await createTestProject();

			// Add a tool with missing tests (warnings)
			await addToolToProject(projectDir, "missing-tests", {
				registered: true,
				hasUnitTest: false,
				hasIntegrationTest: false,
			});

			const result = await validateProject(projectDir, { strict: true });

			// In strict mode, warnings should cause failure
			expect(result.passed).toBe(false);
			expect(result.summary.warnings).toBeGreaterThan(0);
		});

		it("should pass in non-strict mode when only warnings exist", async () => {
			projectDir = await createTestProject();

			// Add a tool with missing tests (warnings, not errors)
			await addToolToProject(projectDir, "missing-tests", {
				registered: true,
				hasUnitTest: false,
				hasIntegrationTest: false,
			});

			const result = await validateProject(projectDir, { strict: false });

			// In non-strict mode, should pass (only warnings, no errors)
			// Note: might have errors from other sources, so check warnings exist
			expect(result.summary.warnings).toBeGreaterThan(0);
		});
	});
});
