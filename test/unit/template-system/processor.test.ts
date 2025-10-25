/**
 * Unit Tests for TemplateProcessor
 *
 * Tests project scaffolding, variable substitution, and lifecycle hooks.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { TemplateProcessor } from "@/core/template-system/processor";
import { TemplateRegistry } from "@/core/template-system/registry";
import type { ScaffoldOptions } from "@/core/template-system/types";
import { mkdtemp, rm, readFile, access, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("TemplateProcessor", () => {
	let registry: TemplateRegistry;
	let processor: TemplateProcessor;
	let tempDir: string;

	beforeEach(async () => {
		// Create temp directory for each test
		tempDir = await mkdtemp(join(tmpdir(), "mcp-test-"));

		registry = new TemplateRegistry();
		processor = new TemplateProcessor(registry);
	});

	afterEach(async () => {
		// Clean up temp directory
		if (tempDir) {
			await rm(tempDir, { recursive: true, force: true });
		}
	});

	describe("scaffold", () => {
		it("should scaffold a project from template", async () => {
			const options: ScaffoldOptions = {
				template: "cloudflare-remote",
				targetDir: join(tempDir, "test-project"),
				variables: {
					PROJECT_NAME: "test-project",
					DESCRIPTION: "Test MCP server",
					PORT: "8788",
					MCP_SERVER_NAME: "Test Server",
				},
				noInstall: true, // Skip installation for tests
			};

			const result = await processor.scaffold(options);

			expect(result.success).toBe(true);
			expect(result.template).toBe("cloudflare-remote");
			expect(result.path).toBe(options.targetDir);
		});

		it("should create target directory", async () => {
			const targetDir = join(tempDir, "new-project");

			const options: ScaffoldOptions = {
				template: "cloudflare-remote",
				targetDir,
				variables: {
					PROJECT_NAME: "new-project",
					DESCRIPTION: "Test",
					PORT: "8788",
					MCP_SERVER_NAME: "Test",
				},
				noInstall: true,
			};

			await processor.scaffold(options);

			// Directory should exist
			await expect(access(targetDir)).resolves.toBeUndefined();
		});

		it("should copy template files", async () => {
			const targetDir = join(tempDir, "test-files");

			const options: ScaffoldOptions = {
				template: "cloudflare-remote",
				targetDir,
				variables: {
					PROJECT_NAME: "test-files",
					DESCRIPTION: "Test",
					PORT: "8788",
					MCP_SERVER_NAME: "Test",
				},
				noInstall: true,
			};

			await processor.scaffold(options);

			// Check for essential files
			await expect(access(join(targetDir, "package.json"))).resolves.toBeUndefined();
			await expect(access(join(targetDir, "tsconfig.json"))).resolves.toBeUndefined();
			await expect(access(join(targetDir, "README.md"))).resolves.toBeUndefined();
			await expect(access(join(targetDir, "src", "index.ts"))).resolves.toBeUndefined();
		});

		it("should process Handlebars templates", async () => {
			const targetDir = join(tempDir, "handlebars-test");
			const projectName = "handlebars-test-project";

			const options: ScaffoldOptions = {
				template: "cloudflare-remote",
				targetDir,
				variables: {
					PROJECT_NAME: projectName,
					DESCRIPTION: "Handlebars test",
					PORT: "8788",
					MCP_SERVER_NAME: "Test Server",
				},
				noInstall: true,
			};

			await processor.scaffold(options);

			// Check that variables were substituted
			const packageJson = await readFile(join(targetDir, "package.json"), "utf-8");
			expect(packageJson).toContain(projectName);

			const readme = await readFile(join(targetDir, "README.md"), "utf-8");
			expect(readme).toContain("Handlebars test");
		});

		it("should write scaffold metadata", async () => {
			const targetDir = join(tempDir, "metadata-test");

			const options: ScaffoldOptions = {
				template: "cloudflare-remote",
				targetDir,
				variables: {
					PROJECT_NAME: "metadata-test",
					DESCRIPTION: "Test",
					PORT: "8788",
					MCP_SERVER_NAME: "Test",
				},
				noInstall: true,
			};

			await processor.scaffold(options);

			// Check for metadata file
			const metadataPath = join(targetDir, ".mcp-template.json");
			await expect(access(metadataPath)).resolves.toBeUndefined();

			const metadata = JSON.parse(await readFile(metadataPath, "utf-8"));
			expect(metadata.id).toBe("cloudflare-remote");
			expect(metadata.version).toMatch(/^\d+\.\d+\.\d+$/);
			expect(metadata.variables.PROJECT_NAME).toBe("metadata-test");
			expect(metadata.scaffolded_at).toBeTruthy();
		});

		it("should return error for invalid template", async () => {
			const options: ScaffoldOptions = {
				template: "non-existent",
				targetDir: join(tempDir, "error-test"),
				variables: {
					PROJECT_NAME: "error-test",
				},
				noInstall: true,
			};

			const result = await processor.scaffold(options);

			expect(result.success).toBe(false);
			expect(result.error).toBeTruthy();
			expect(result.error).toContain("Template not found");
		});
	});

	describe("variable validation", () => {
		it("should require all required variables", async () => {
			const options: ScaffoldOptions = {
				template: "cloudflare-remote",
				targetDir: join(tempDir, "missing-vars"),
				variables: {
					// Missing required PROJECT_NAME
					DESCRIPTION: "Test",
				},
				noInstall: true,
			};

			const result = await processor.scaffold(options);

			expect(result.success).toBe(false);
			expect(result.error).toContain("Required variable missing");
		});

		it("should use default values for optional variables", async () => {
			const targetDir = join(tempDir, "default-vars");

			const options: ScaffoldOptions = {
				template: "cloudflare-remote",
				targetDir,
				variables: {
					PROJECT_NAME: "default-vars",
					// PORT and DESCRIPTION will use defaults
				},
				noInstall: true,
			};

			const result = await processor.scaffold(options);

			expect(result.success).toBe(true);

			// Check that defaults were used
			const wranglerConfig = await readFile(join(targetDir, "wrangler.jsonc"), "utf-8");
			expect(wranglerConfig).toContain("8788"); // Default PORT
		});

		it("should validate variable patterns", async () => {
			const options: ScaffoldOptions = {
				template: "cloudflare-remote",
				targetDir: join(tempDir, "invalid-port"),
				variables: {
					PROJECT_NAME: "invalid-port",
					PORT: "not-a-number", // Invalid port
				},
				noInstall: true,
			};

			const result = await processor.scaffold(options);

			expect(result.success).toBe(false);
			expect(result.error).toContain("does not match pattern");
		});

		it("should allow extra variables not in definition", async () => {
			const targetDir = join(tempDir, "extra-vars");

			const options: ScaffoldOptions = {
				template: "cloudflare-remote",
				targetDir,
				variables: {
					PROJECT_NAME: "extra-vars",
					DESCRIPTION: "Test",
					PORT: "8788",
					MCP_SERVER_NAME: "Test",
					EXTRA_VAR: "extra-value", // Not in template definition
				},
				noInstall: true,
			};

			const result = await processor.scaffold(options);

			expect(result.success).toBe(true);
		});
	});

	describe("package manager support", () => {
		it("should skip installation when noInstall is true", async () => {
			const targetDir = join(tempDir, "no-install");

			const options: ScaffoldOptions = {
				template: "cloudflare-remote",
				targetDir,
				variables: {
					PROJECT_NAME: "no-install",
					DESCRIPTION: "Test",
					PORT: "8788",
					MCP_SERVER_NAME: "Test",
				},
				noInstall: true,
			};

			const result = await processor.scaffold(options);

			expect(result.success).toBe(true);
			// node_modules should not exist
			try {
				await access(join(targetDir, "node_modules"));
				expect.fail("node_modules should not exist");
			} catch {
				// Expected - no installation happened
			}
		});
	});

	describe("directory structure", () => {
		it("should create proper directory structure", async () => {
			const targetDir = join(tempDir, "structure-test");

			const options: ScaffoldOptions = {
				template: "cloudflare-remote",
				targetDir,
				variables: {
					PROJECT_NAME: "structure-test",
					DESCRIPTION: "Test",
					PORT: "8788",
					MCP_SERVER_NAME: "Test",
				},
				noInstall: true,
			};

			await processor.scaffold(options);

			// Check for directories
			const entries = await readdir(targetDir);
			expect(entries).toContain("src");
			expect(entries).toContain("test");

			// Check src structure
			const srcEntries = await readdir(join(targetDir, "src"));
			expect(srcEntries).toContain("index.ts");
			expect(srcEntries).toContain("tools");

			// Check test structure
			const testEntries = await readdir(join(targetDir, "test"));
			expect(testEntries).toContain("unit");
			expect(testEntries).toContain("integration");
		});

		it("should not include .hbs extensions in output files", async () => {
			const targetDir = join(tempDir, "no-hbs");

			const options: ScaffoldOptions = {
				template: "cloudflare-remote",
				targetDir,
				variables: {
					PROJECT_NAME: "no-hbs",
					DESCRIPTION: "Test",
					PORT: "8788",
					MCP_SERVER_NAME: "Test",
				},
				noInstall: true,
			};

			await processor.scaffold(options);

			// Check that package.json exists (not package.json.hbs)
			await expect(access(join(targetDir, "package.json"))).resolves.toBeUndefined();

			// Ensure .hbs file doesn't exist
			try {
				await access(join(targetDir, "package.json.hbs"));
				expect.fail("package.json.hbs should not exist in output");
			} catch {
				// Expected
			}
		});
	});
});
