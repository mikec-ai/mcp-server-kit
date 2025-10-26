/**
 * add-prompt - Unit Tests
 *
 * Comprehensive tests for the add prompt command
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { rm, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createTestProject, getTempDir } from "../../helpers/project-setup.js";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

describe("add-prompt command", () => {
	let projectDir: string;
	let tempDir: string;

	beforeEach(async () => {
		// Create a fresh test project for each test
		projectDir = await createTestProject();
		tempDir = getTempDir(projectDir);
	});

	afterEach(async () => {
		// Clean up temp directory
		if (tempDir && existsSync(tempDir)) {
			await rm(tempDir, { recursive: true, force: true });
		}
	});

	/**
	 * Helper function to run add prompt command
	 */
	async function runAddPrompt(
		cwd: string,
		promptName: string,
		options: {
			description?: string;
			noTests?: boolean;
			noRegister?: boolean;
		} = {},
	): Promise<{ success: boolean; stdout: string; stderr: string }> {
		const cliPath = join(process.cwd(), "bin", "mcp-server-kit.js");
		const args = ["add", "prompt", promptName];

		if (options.description) args.push("--description", `"${options.description}"`);
		if (options.noTests) args.push("--no-tests");
		if (options.noRegister) args.push("--no-register");

		try {
			const { stdout, stderr } = await execAsync(
				`node "${cliPath}" ${args.join(" ")}`,
				{ cwd },
			);
			return { success: true, stdout, stderr };
		} catch (error: any) {
			return { success: false, stdout: error.stdout || "", stderr: error.stderr || "" };
		}
	}

	describe("prompt name validation", () => {
		it("should accept valid kebab-case names", async () => {
			const result = await runAddPrompt(projectDir, "my-prompt");

			expect(result.success).toBe(true);
			expect(result.stdout).toContain("created successfully");
		});

		it("should accept single-word names", async () => {
			const result = await runAddPrompt(projectDir, "reviewer");

			expect(result.success).toBe(true);
			expect(result.stdout).toContain("created successfully");
		});

		it("should reject names with uppercase", async () => {
			const result = await runAddPrompt(projectDir, "MyPrompt");

			expect(result.success).toBe(false);
			expect(result.stderr).toContain("lowercase with hyphens");
		});

		it("should reject names starting with numbers", async () => {
			const result = await runAddPrompt(projectDir, "123prompt");

			expect(result.success).toBe(false);
			expect(result.stderr).toContain("lowercase with hyphens");
		});

		it("should reject names with spaces", async () => {
			const cliPath = join(process.cwd(), "bin", "mcp-server-kit.js");

			try {
				await execAsync(`node "${cliPath}" add prompt "my prompt"`, {
					cwd: projectDir,
				});
				expect.fail("Should have rejected prompt name with spaces");
			} catch (error: any) {
				expect(error.stderr).toContain("lowercase with hyphens");
			}
		});

		it("should reject names with underscores only at start", async () => {
			const result = await runAddPrompt(projectDir, "_prompt");

			expect(result.success).toBe(false);
			expect(result.stderr).toContain("lowercase with hyphens");
		});
	});

	describe("prompt file generation", () => {
		it("should create prompt file in correct location", async () => {
			await runAddPrompt(projectDir, "test-prompt");

			const promptPath = join(projectDir, "src", "prompts", "test-prompt.ts");
			expect(existsSync(promptPath)).toBe(true);
		});

		it("should generate prompt with correct function name", async () => {
			await runAddPrompt(projectDir, "my-prompt");

			const promptPath = join(projectDir, "src", "prompts", "my-prompt.ts");
			const content = await readFile(promptPath, "utf-8");

			expect(content).toContain("export function registerMyPromptPrompt");
		});

		it("should include prompt description", async () => {
			await runAddPrompt(projectDir, "test-prompt", {
				description: "Custom prompt description",
			});

			const promptPath = join(projectDir, "src", "prompts", "test-prompt.ts");
			const content = await readFile(promptPath, "utf-8");

			expect(content).toContain("Custom prompt description");
		});

		it("should include args schema", async () => {
			await runAddPrompt(projectDir, "test-prompt");

			const promptPath = join(projectDir, "src", "prompts", "test-prompt.ts");
			const content = await readFile(promptPath, "utf-8");

			expect(content).toContain("const TestPromptArgsSchema = z.object({");
		});

		it("should reject duplicate prompt names", async () => {
			await runAddPrompt(projectDir, "duplicate-prompt");
			const result = await runAddPrompt(projectDir, "duplicate-prompt");

			expect(result.success).toBe(false);
			expect(result.stderr).toContain("already exists");
		});
	});

	describe("unit test file generation", () => {
		it("should create unit test file when tests enabled", async () => {
			await runAddPrompt(projectDir, "test-prompt");

			const testPath = join(
				projectDir,
				"test",
				"unit",
				"prompts",
				"test-prompt.test.ts",
			);
			expect(existsSync(testPath)).toBe(true);
		});

		it("should skip unit test file when --no-tests flag used", async () => {
			await runAddPrompt(projectDir, "test-prompt", { noTests: true });

			const testPath = join(
				projectDir,
				"test",
				"unit",
				"prompts",
				"test-prompt.test.ts",
			);
			expect(existsSync(testPath)).toBe(false);
		});

		it("should include correct import path in unit test", async () => {
			await runAddPrompt(projectDir, "my-prompt");

			const testPath = join(
				projectDir,
				"test",
				"unit",
				"prompts",
				"my-prompt.test.ts",
			);
			const content = await readFile(testPath, "utf-8");

			expect(content).toContain(
				'from "../../../src/prompts/my-prompt.js"',
			);
		});
	});

	describe("integration test YAML generation", () => {
		it("should create integration test YAML when tests enabled", async () => {
			await runAddPrompt(projectDir, "test-prompt");

			const yamlPath = join(
				projectDir,
				"test",
				"integration",
				"specs",
				"prompts",
				"test-prompt.yaml",
			);
			expect(existsSync(yamlPath)).toBe(true);
		});

		it("should skip integration test YAML when --no-tests flag used", async () => {
			await runAddPrompt(projectDir, "test-prompt", { noTests: true });

			const yamlPath = join(
				projectDir,
				"test",
				"integration",
				"specs",
				"prompts",
				"test-prompt.yaml",
			);
			expect(existsSync(yamlPath)).toBe(false);
		});

		it("should include correct prompt name in YAML", async () => {
			await runAddPrompt(projectDir, "test-prompt");

			const yamlPath = join(
				projectDir,
				"test",
				"integration",
				"specs",
				"prompts",
				"test-prompt.yaml",
			);
			const content = await readFile(yamlPath, "utf-8");

			expect(content).toContain('name: "test prompt - Basic"');
		});

		it("should include success assertion in YAML", async () => {
			await runAddPrompt(projectDir, "test-prompt");

			const yamlPath = join(
				projectDir,
				"test",
				"integration",
				"specs",
				"prompts",
				"test-prompt.yaml",
			);
			const content = await readFile(yamlPath, "utf-8");

			expect(content).toContain('type: "success"');
		});
	});

	describe("prompt registration in index.ts", () => {
		it("should add import statement to index.ts", async () => {
			await runAddPrompt(projectDir, "my-prompt");

			const indexPath = join(projectDir, "src", "index.ts");
			const content = await readFile(indexPath, "utf-8");

			expect(content).toContain(
				'import { registerMyPromptPrompt } from "./prompts/my-prompt.js"',
			);
		});

		it("should add registration call in init method", async () => {
			await runAddPrompt(projectDir, "my-prompt");

			const indexPath = join(projectDir, "src", "index.ts");
			const content = await readFile(indexPath, "utf-8");

			expect(content).toContain("registerMyPromptPrompt(this.server)");
		});

		it("should skip registration when --no-register flag used", async () => {
			await runAddPrompt(projectDir, "my-prompt", { noRegister: true });

			const indexPath = join(projectDir, "src", "index.ts");
			const content = await readFile(indexPath, "utf-8");

			expect(content).not.toContain("registerMyPromptPrompt");
		});

		it("should handle multiple prompts in sequence", async () => {
			await runAddPrompt(projectDir, "first-prompt");
			await runAddPrompt(projectDir, "second-prompt");

			const indexPath = join(projectDir, "src", "index.ts");
			const content = await readFile(indexPath, "utf-8");

			expect(content).toContain("registerFirstPromptPrompt");
			expect(content).toContain("registerSecondPromptPrompt");
		});
	});

	describe("metadata updates", () => {
		it("should add prompt to metadata file", async () => {
			await runAddPrompt(projectDir, "test-prompt");

			const metadataPath = join(projectDir, ".mcp-template.json");
			if (existsSync(metadataPath)) {
				const content = await readFile(metadataPath, "utf-8");
				const metadata = JSON.parse(content);

				const promptEntry = metadata.prompts?.find(
					(p: any) => p.name === "test-prompt",
				);
				expect(promptEntry).toBeDefined();
				expect(promptEntry?.file).toBe("src/prompts/test-prompt.ts");
			}
		});

		it("should mark prompt as registered in metadata", async () => {
			await runAddPrompt(projectDir, "test-prompt");

			const metadataPath = join(projectDir, ".mcp-template.json");
			if (existsSync(metadataPath)) {
				const content = await readFile(metadataPath, "utf-8");
				const metadata = JSON.parse(content);

				const promptEntry = metadata.prompts?.find(
					(p: any) => p.name === "test-prompt",
				);
				expect(promptEntry?.registered).toBe(true);
			}
		});

		it("should mark tests as created when enabled", async () => {
			await runAddPrompt(projectDir, "test-prompt");

			const metadataPath = join(projectDir, ".mcp-template.json");
			if (existsSync(metadataPath)) {
				const content = await readFile(metadataPath, "utf-8");
				const metadata = JSON.parse(content);

				const promptEntry = metadata.prompts?.find(
					(p: any) => p.name === "test-prompt",
				);
				expect(promptEntry?.hasUnitTest).toBe(true);
				expect(promptEntry?.hasIntegrationTest).toBe(true);
			}
		});
	});

	describe("error scenarios", () => {
		it("should fail when not in a project directory", async () => {
			const nonProjectDir = join(tempDir, "not-a-project");
			await import("node:fs/promises").then((fs) => fs.mkdir(nonProjectDir));

			const result = await runAddPrompt(nonProjectDir, "test-prompt");

			expect(result.success).toBe(false);
			expect(result.stderr).toContain("Not in a valid project");
		});

		it("should provide helpful error messages", async () => {
			const result = await runAddPrompt(projectDir, "Invalid-Name");

			expect(result.success).toBe(false);
			expect(result.stderr).toContain("lowercase with hyphens");
		});
	});

	describe("success output", () => {
		it("should show success message", async () => {
			const result = await runAddPrompt(projectDir, "test-prompt");

			expect(result.stdout).toContain("created successfully");
		});

		it("should show next steps", async () => {
			const result = await runAddPrompt(projectDir, "test-prompt");

			expect(result.stdout).toContain("Next steps:");
			expect(result.stdout).toContain("src/prompts/test-prompt.ts");
		});

		it("should show file creation confirmations", async () => {
			const result = await runAddPrompt(projectDir, "test-prompt");

			expect(result.stdout).toContain("Created");
			expect(result.stdout).toContain("Registered in src/index.ts");
		});
	});

	describe("PascalCase conversion", () => {
		it("should convert single-word names to PascalCase", async () => {
			await runAddPrompt(projectDir, "reviewer");

			const promptPath = join(projectDir, "src", "prompts", "reviewer.ts");
			const content = await readFile(promptPath, "utf-8");

			expect(content).toContain("registerReviewerPrompt");
		});

		it("should convert hyphenated names to PascalCase", async () => {
			await runAddPrompt(projectDir, "my-prompt");

			const promptPath = join(projectDir, "src", "prompts", "my-prompt.ts");
			const content = await readFile(promptPath, "utf-8");

			expect(content).toContain("registerMyPromptPrompt");
		});

		it("should convert multi-word names to PascalCase", async () => {
			await runAddPrompt(projectDir, "code-review-helper");

			const promptPath = join(projectDir, "src", "prompts", "code-review-helper.ts");
			const content = await readFile(promptPath, "utf-8");

			expect(content).toContain("registerCodeReviewHelperPrompt");
		});
	});

	describe("file organization", () => {
		it("should create src/prompts directory if it doesn't exist", async () => {
			await runAddPrompt(projectDir, "test-prompt");

			const promptsDir = join(projectDir, "src", "prompts");
			expect(existsSync(promptsDir)).toBe(true);
		});

		it("should create test directories if they don't exist", async () => {
			await runAddPrompt(projectDir, "test-prompt");

			const unitDir = join(projectDir, "test", "unit", "prompts");
			const integrationDir = join(
				projectDir,
				"test",
				"integration",
				"specs",
				"prompts",
			);

			expect(existsSync(unitDir)).toBe(true);
			expect(existsSync(integrationDir)).toBe(true);
		});
	});

	describe("updateTemplateMetadata", () => {
		it("should add prompt to metadata file", async () => {
			const { updateTemplateMetadata } = await import("@/core/commands/shared/metadata.js");

			await updateTemplateMetadata(projectDir, "prompts", "test-prompt", "src/prompts/test-prompt.ts", true);

			const metadataPath = join(projectDir, ".mcp-template.json");
			if (existsSync(metadataPath)) {
				const content = await readFile(metadataPath, "utf-8");
				const metadata = JSON.parse(content);

				const promptEntry = metadata.prompts?.find(
					(p: any) => p.name === "test-prompt"
				);
				expect(promptEntry).toBeDefined();
				expect(promptEntry?.file).toBe("src/prompts/test-prompt.ts");
				expect(promptEntry?.registered).toBe(true);
			}
		});

		it("should mark tests as created when hasTests is true", async () => {
			const { updateTemplateMetadata } = await import("@/core/commands/shared/metadata.js");

			await updateTemplateMetadata(projectDir, "prompts", "with-tests", "src/prompts/with-tests.ts", true);

			const metadataPath = join(projectDir, ".mcp-template.json");
			if (existsSync(metadataPath)) {
				const content = await readFile(metadataPath, "utf-8");
				const metadata = JSON.parse(content);

				const promptEntry = metadata.prompts?.find(
					(p: any) => p.name === "with-tests"
				);
				expect(promptEntry?.hasUnitTest).toBe(true);
				expect(promptEntry?.hasIntegrationTest).toBe(true);
			}
		});

		it("should mark tests as not created when hasTests is false", async () => {
			const { updateTemplateMetadata } = await import("@/core/commands/shared/metadata.js");

			await updateTemplateMetadata(projectDir, "prompts", "without-tests", "src/prompts/without-tests.ts", false);

			const metadataPath = join(projectDir, ".mcp-template.json");
			if (existsSync(metadataPath)) {
				const content = await readFile(metadataPath, "utf-8");
				const metadata = JSON.parse(content);

				const promptEntry = metadata.prompts?.find(
					(p: any) => p.name === "without-tests"
				);
				expect(promptEntry?.hasUnitTest).toBe(false);
				expect(promptEntry?.hasIntegrationTest).toBe(false);
			}
		});
	});
});
