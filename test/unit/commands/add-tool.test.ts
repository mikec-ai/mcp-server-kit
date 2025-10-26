/**
 * add-tool - Unit Tests
 *
 * Real executable tests for the add tool command that verify actual behavior
 * using temporary file system operations.
 */

import { describe, it, expect, afterEach } from "vitest";
import { rm, readFile, access } from "node:fs/promises";
import { join } from "node:path";
import { createTestProject, getTempDir } from "../../helpers/project-setup.js";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

describe("add-tool command", () => {
	let projectDir: string;

	afterEach(async () => {
		if (projectDir) {
			await rm(getTempDir(projectDir), { recursive: true, force: true });
		}
	});

	/**
	 * Helper to run add-tool command
	 */
	async function runAddTool(
		cwd: string,
		toolName: string,
		options: {
			description?: string;
			noTests?: boolean;
			noRegister?: boolean;
			template?: string;
		} = {},
	): Promise<{ success: boolean; stdout: string; stderr: string }> {
		const cliPath = join(process.cwd(), "bin", "mcp-server-kit.js");

		const args = ["add", "tool", toolName];

		if (options.description) {
			args.push("--description", `"${options.description}"`);
		}
		if (options.noTests) {
			args.push("--no-tests");
		}
		if (options.noRegister) {
			args.push("--no-register");
		}
		if (options.template) {
			args.push("--template", options.template);
		}

		try {
			const { stdout, stderr } = await execAsync(`node "${cliPath}" ${args.join(" ")}`, {
				cwd,
			});
			return { success: true, stdout, stderr };
		} catch (error: any) {
			return {
				success: false,
				stdout: error.stdout || "",
				stderr: error.stderr || "",
			};
		}
	}

	describe("tool name validation", () => {
		it("should accept valid lowercase tool names", async () => {
			projectDir = await createTestProject();

			const result = await runAddTool(projectDir, "my-tool");

			expect(result.success).toBe(true);

			// Verify tool file was created
			const toolPath = join(projectDir, "src", "tools", "my-tool.ts");
			await expect(access(toolPath)).resolves.toBeUndefined();
		});

		it("should accept tool names with hyphens", async () => {
			projectDir = await createTestProject();

			const result = await runAddTool(projectDir, "fetch-data-tool");

			expect(result.success).toBe(true);
			await expect(
				access(join(projectDir, "src", "tools", "fetch-data-tool.ts")),
			).resolves.toBeUndefined();
		});

		it("should reject uppercase tool names", async () => {
			projectDir = await createTestProject();

			const result = await runAddTool(projectDir, "MyTool");

			expect(result.success).toBe(false);
			expect(result.stderr).toContain("lowercase with hyphens");
		});

		it("should reject tool names with underscores", async () => {
			projectDir = await createTestProject();

			const result = await runAddTool(projectDir, "my_tool");

			expect(result.success).toBe(false);
			expect(result.stderr).toContain("lowercase with hyphens");
		});

		it("should reject tool names starting with numbers", async () => {
			projectDir = await createTestProject();

			const result = await runAddTool(projectDir, "123tool");

			expect(result.success).toBe(false);
			expect(result.stderr).toContain("lowercase with hyphens");
		});

		it("should reject tool names with spaces", async () => {
			projectDir = await createTestProject();

			// Need to quote the entire tool name when passing to shell
			const cliPath = join(process.cwd(), "bin", "mcp-server-kit.js");
			try {
				await execAsync(`node "${cliPath}" add tool "my tool"`, {
					cwd: projectDir,
				});
				// Should not get here
				expect.fail("Should have rejected tool name with spaces");
			} catch (error: any) {
				expect(error.stderr).toContain("lowercase with hyphens");
			}
		});
	});

	describe("tool file generation", () => {
		it("should create tool file with correct structure", async () => {
			projectDir = await createTestProject();

			await runAddTool(projectDir, "analyze-code");

			const toolPath = join(projectDir, "src", "tools", "analyze-code.ts");
			const content = await readFile(toolPath, "utf-8");

			// Check for key elements
			expect(content).toContain("AnalyzeCode Tool");
			expect(content).toContain("const AnalyzeCodeParamsSchema");
			expect(content).toContain("export function registerAnalyzeCodeTool");
			expect(content).toContain('"analyze-code"');
			expect(content).toContain("server.tool(");
			expect(content).toContain("AnalyzeCodeParamsSchema.shape");
		});

		it("should include custom description in tool file", async () => {
			projectDir = await createTestProject();

			await runAddTool(projectDir, "custom-tool", {
				description: "Custom tool description",
			});

			const toolPath = join(projectDir, "src", "tools", "custom-tool.ts");
			const content = await readFile(toolPath, "utf-8");

			expect(content).toContain("Custom tool description");
		});

		it("should use default description when not provided", async () => {
			projectDir = await createTestProject();

			await runAddTool(projectDir, "default-tool");

			const toolPath = join(projectDir, "src", "tools", "default-tool.ts");
			const content = await readFile(toolPath, "utf-8");

			expect(content).toContain("TODO: Add description");
		});

		it("should generate valid TypeScript code", async () => {
			projectDir = await createTestProject();

			await runAddTool(projectDir, "valid-tool");

			const toolPath = join(projectDir, "src", "tools", "valid-tool.ts");
			const content = await readFile(toolPath, "utf-8");

			// Check for imports
			expect(content).toContain('import type { McpServer }');
			expect(content).toContain('import { z } from "zod"');

			// Check for proper async/await structure
			expect(content).toContain("async (params) =>");
		});

		it("should error when tool already exists", async () => {
			projectDir = await createTestProject();

			// Create tool first time
			await runAddTool(projectDir, "existing-tool");

			// Try to create again
			const result = await runAddTool(projectDir, "existing-tool");

			expect(result.success).toBe(false);
			expect(result.stderr).toContain("already exists");
		});
	});

	describe("unit test file generation", () => {
		it("should create unit test file by default", async () => {
			projectDir = await createTestProject();

			await runAddTool(projectDir, "tested-tool");

			const testPath = join(
				projectDir,
				"test",
				"unit",
				"tools",
				"tested-tool.test.ts",
			);
			await expect(access(testPath)).resolves.toBeUndefined();
		});

		it("should generate correct unit test structure", async () => {
			projectDir = await createTestProject();

			await runAddTool(projectDir, "my-tool");

			const testPath = join(projectDir, "test", "unit", "tools", "my-tool.test.ts");
			const content = await readFile(testPath, "utf-8");

			expect(content).toContain("MyTool Tool - Unit Tests");
			expect(content).toContain('from "../../../src/tools/my-tool.js"');
			expect(content).toContain("registerMyToolTool");
			expect(content).toContain('describe("my-tool tool"');
			expect(content).toContain('"should register the tool"');
			expect(content).toContain('"should handle valid parameters"');
			expect(content).toContain('"should validate parameters"');
			expect(content).toContain('"should handle errors gracefully"');
		});

		it("should skip unit test when --no-tests is used", async () => {
			projectDir = await createTestProject();

			await runAddTool(projectDir, "no-test-tool", { noTests: true });

			const testPath = join(
				projectDir,
				"test",
				"unit",
				"tools",
				"no-test-tool.test.ts",
			);

			await expect(access(testPath)).rejects.toThrow();
		});
	});

	describe("integration test file generation", () => {
		it("should create integration test YAML by default", async () => {
			projectDir = await createTestProject();

			await runAddTool(projectDir, "integration-tool");

			const yamlPath = join(
				projectDir,
				"test",
				"integration",
				"specs",
				"integration-tool.yaml",
			);
			await expect(access(yamlPath)).resolves.toBeUndefined();
		});

		it("should generate correct YAML structure", async () => {
			projectDir = await createTestProject();

			await runAddTool(projectDir, "yaml-tool", {
				description: "YAML test tool",
			});

			const yamlPath = join(
				projectDir,
				"test",
				"integration",
				"specs",
				"yaml-tool.yaml",
			);
			const content = await readFile(yamlPath, "utf-8");

			expect(content).toContain('name: "yaml-tool - Basic"');
			expect(content).toContain('tool: "yaml-tool"');
			expect(content).toContain("YAML test tool");
			expect(content).toContain("arguments:");
			expect(content).toContain("assertions:");
			expect(content).toContain('- type: "success"');
			expect(content).toContain('- type: "response_time_ms"');
			expect(content).toContain("max: 5000");
		});

		it("should skip integration test when --no-tests is used", async () => {
			projectDir = await createTestProject();

			await runAddTool(projectDir, "no-yaml-tool", { noTests: true });

			const yamlPath = join(
				projectDir,
				"test",
				"integration",
				"specs",
				"no-yaml-tool.yaml",
			);

			await expect(access(yamlPath)).rejects.toThrow();
		});
	});

	describe("tool registration in index.ts", () => {
		it("should register tool in index.ts by default", async () => {
			projectDir = await createTestProject();

			await runAddTool(projectDir, "registered-tool");

			const indexPath = join(projectDir, "src", "index.ts");
			const content = await readFile(indexPath, "utf-8");

			expect(content).toContain(
				'import { registerRegisteredToolTool } from "./tools/registered-tool.js"',
			);
			expect(content).toContain("registerRegisteredToolTool(this.server)");
		});

		it("should add import after last tool import", async () => {
			projectDir = await createTestProject();

			// Add first tool
			await runAddTool(projectDir, "first-tool");
			// Add second tool
			await runAddTool(projectDir, "second-tool");

			const indexPath = join(projectDir, "src", "index.ts");
			const content = await readFile(indexPath, "utf-8");

			// Verify both imports exist and second comes after first
			const firstImportIndex = content.indexOf('from "./tools/first-tool.js"');
			const secondImportIndex = content.indexOf('from "./tools/second-tool.js"');

			expect(firstImportIndex).toBeGreaterThan(-1);
			expect(secondImportIndex).toBeGreaterThan(firstImportIndex);
		});

		it("should add registration call after last register call", async () => {
			projectDir = await createTestProject();

			await runAddTool(projectDir, "first-tool");
			await runAddTool(projectDir, "second-tool");

			const indexPath = join(projectDir, "src", "index.ts");
			const content = await readFile(indexPath, "utf-8");

			// Verify both registrations exist
			const firstRegIndex = content.indexOf("registerFirstToolTool(this.server)");
			const secondRegIndex = content.indexOf("registerSecondToolTool(this.server)");

			expect(firstRegIndex).toBeGreaterThan(-1);
			expect(secondRegIndex).toBeGreaterThan(firstRegIndex);
		});

		it("should skip registration when --no-register is used", async () => {
			projectDir = await createTestProject();

			await runAddTool(projectDir, "unregistered-tool", { noRegister: true });

			const indexPath = join(projectDir, "src", "index.ts");
			const content = await readFile(indexPath, "utf-8");

			expect(content).not.toContain("registerUnregisteredToolTool");
		});
	});

	describe("metadata updates", () => {
		it("should update .mcp-template.json with tool metadata", async () => {
			projectDir = await createTestProject();

			await runAddTool(projectDir, "metadata-tool");

			const metadataPath = join(projectDir, ".mcp-template.json");
			const content = await readFile(metadataPath, "utf-8");
			const metadata = JSON.parse(content);

			expect(metadata.tools).toBeDefined();
			expect(metadata.tools).toContainEqual(
				expect.objectContaining({
					name: "metadata-tool",
					file: "src/tools/metadata-tool.ts",
					registered: true,
					hasUnitTest: true,
					hasIntegrationTest: true,
				}),
			);
		});

		it("should track tools without tests in metadata", async () => {
			projectDir = await createTestProject();

			await runAddTool(projectDir, "no-tests-tool", { noTests: true });

			const metadataPath = join(projectDir, ".mcp-template.json");
			const metadata = JSON.parse(await readFile(metadataPath, "utf-8"));

			const tool = metadata.tools.find((t: any) => t.name === "no-tests-tool");
			expect(tool).toBeDefined();
			expect(tool.hasUnitTest).toBe(false);
			expect(tool.hasIntegrationTest).toBe(false);
		});

		it("should handle missing .mcp-template.json gracefully", async () => {
			projectDir = await createTestProject({ hasMetadata: false });

			// Should succeed even without metadata file
			const result = await runAddTool(projectDir, "orphan-tool");

			expect(result.success).toBe(true);

			// Tool file should still be created
			await expect(
				access(join(projectDir, "src", "tools", "orphan-tool.ts")),
			).resolves.toBeUndefined();
		});
	});

	describe("error scenarios", () => {
		it("should error when not in a valid project directory", async () => {
			const { tmpdir } = await import("node:os");
			const { mkdtemp } = await import("node:fs/promises");
			const emptyDir = await mkdtemp(join(tmpdir(), "empty-"));

			const result = await runAddTool(emptyDir, "orphan-tool");

			expect(result.success).toBe(false);
			expect(result.stderr).toContain("Not in a valid project directory");

			await rm(emptyDir, { recursive: true, force: true });
		});

		it("should error when src/index.ts is missing", async () => {
			projectDir = await createTestProject();

			// Delete index.ts
			await rm(join(projectDir, "src", "index.ts"));

			const result = await runAddTool(projectDir, "no-index-tool");

			expect(result.success).toBe(false);
			expect(result.stderr).toContain("src/index.ts not found");
		});
	});

	describe("success output", () => {
		it("should provide clear success message", async () => {
			projectDir = await createTestProject();

			const result = await runAddTool(projectDir, "success-tool");

			expect(result.success).toBe(true);
			expect(result.stdout).toContain("Tool 'success-tool' created successfully");
		});

		it("should show next steps in output", async () => {
			projectDir = await createTestProject();

			const result = await runAddTool(projectDir, "next-steps-tool");

			expect(result.stdout).toContain("Next steps:");
			expect(result.stdout).toContain("Edit src/tools/next-steps-tool.ts");
			expect(result.stdout).toContain("npm test");
			expect(result.stdout).toContain("npm run validate");
		});

		it("should show which files were created", async () => {
			projectDir = await createTestProject();

			const result = await runAddTool(projectDir, "files-tool");

			expect(result.stdout).toContain("Created");
			expect(result.stdout).toContain("src/tools/files-tool.ts");
			expect(result.stdout).toContain("test/unit/tools/files-tool.test.ts");
			expect(result.stdout).toContain("test/integration/specs/files-tool.yaml");
			expect(result.stdout).toContain("Registered in src/index.ts");
		});
	});

	describe("PascalCase conversion", () => {
		it("should correctly convert simple names", async () => {
			projectDir = await createTestProject();

			await runAddTool(projectDir, "simple");

			const content = await readFile(
				join(projectDir, "src", "tools", "simple.ts"),
				"utf-8",
			);

			expect(content).toContain("registerSimpleTool");
			expect(content).toContain("const SimpleParamsSchema");
		});

		it("should correctly convert hyphenated names", async () => {
			projectDir = await createTestProject();

			await runAddTool(projectDir, "fetch-user-data");

			const content = await readFile(
				join(projectDir, "src", "tools", "fetch-user-data.ts"),
				"utf-8",
			);

			expect(content).toContain("registerFetchUserDataTool");
			expect(content).toContain("const FetchUserDataParamsSchema");
		});

		it("should correctly convert multi-word names", async () => {
			projectDir = await createTestProject();

			await runAddTool(projectDir, "analyze-code-complexity");

			const content = await readFile(
				join(projectDir, "src", "tools", "analyze-code-complexity.ts"),
				"utf-8",
			);

			expect(content).toContain("registerAnalyzeCodeComplexityTool");
		});
	});

	describe("file organization", () => {
		it("should create src/tools directory if it doesn't exist", async () => {
			projectDir = await createTestProject();

			// Remove tools directory
			await rm(join(projectDir, "src", "tools"), {
				recursive: true,
				force: true,
			});

			const result = await runAddTool(projectDir, "new-dir-tool");

			expect(result.success).toBe(true);
			await expect(
				access(join(projectDir, "src", "tools", "new-dir-tool.ts")),
			).resolves.toBeUndefined();
		});

		it("should create test directories if they don't exist", async () => {
			projectDir = await createTestProject();

			// Remove test directories
			await rm(join(projectDir, "test"), { recursive: true, force: true });

			const result = await runAddTool(projectDir, "test-dirs-tool");

			expect(result.success).toBe(true);
			await expect(
				access(join(projectDir, "test", "unit", "tools", "test-dirs-tool.test.ts")),
			).resolves.toBeUndefined();
			await expect(
				access(
					join(projectDir, "test", "integration", "specs", "test-dirs-tool.yaml"),
				),
			).resolves.toBeUndefined();
		});
	});
});
