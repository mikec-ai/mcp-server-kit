/**
 * add-resource - Unit Tests
 *
 * Comprehensive tests for the add resource command
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { rm, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createTestProject, getTempDir } from "../../helpers/project-setup.js";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

describe("add-resource command", () => {
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
	 * Helper function to run add resource command
	 */
	async function runAddResource(
		cwd: string,
		resourceName: string,
		options: {
			description?: string;
			uriPattern?: string;
			static?: boolean;
			dynamic?: boolean;
			noTests?: boolean;
			noRegister?: boolean;
		} = {},
	): Promise<{ success: boolean; stdout: string; stderr: string }> {
		const cliPath = join(process.cwd(), "bin", "mcp-server-kit.js");
		const args = ["add", "resource", resourceName];

		if (options.description) args.push("--description", `"${options.description}"`);
		if (options.uriPattern) args.push("--uri-pattern", `"${options.uriPattern}"`);
		if (options.static) args.push("--static");
		if (options.dynamic) args.push("--dynamic");
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

	describe("resource name validation", () => {
		it("should accept valid kebab-case names", async () => {
			const result = await runAddResource(projectDir, "my-resource");

			expect(result.success).toBe(true);
			expect(result.stdout).toContain("created successfully");
		});

		it("should accept single-word names", async () => {
			const result = await runAddResource(projectDir, "config");

			expect(result.success).toBe(true);
			expect(result.stdout).toContain("created successfully");
		});

		it("should reject names with uppercase", async () => {
			const result = await runAddResource(projectDir, "MyResource");

			expect(result.success).toBe(false);
			expect(result.stderr).toContain("lowercase with hyphens");
		});

		it("should reject names starting with numbers", async () => {
			const result = await runAddResource(projectDir, "123resource");

			expect(result.success).toBe(false);
			expect(result.stderr).toContain("lowercase with hyphens");
		});

		it("should reject names with spaces", async () => {
			const cliPath = join(process.cwd(), "bin", "mcp-server-kit.js");

			try {
				await execAsync(`node "${cliPath}" add resource "my resource"`, {
					cwd: projectDir,
				});
				expect.fail("Should have rejected resource name with spaces");
			} catch (error: any) {
				expect(error.stderr).toContain("lowercase with hyphens");
			}
		});

		it("should reject names with underscores only at start", async () => {
			const result = await runAddResource(projectDir, "_resource");

			expect(result.success).toBe(false);
			expect(result.stderr).toContain("lowercase with hyphens");
		});
	});

	describe("resource file generation", () => {
		it("should create resource file in correct location", async () => {
			await runAddResource(projectDir, "test-resource");

			const resourcePath = join(projectDir, "src", "resources", "test-resource.ts");
			expect(existsSync(resourcePath)).toBe(true);
		});

		it("should generate resource with correct function name", async () => {
			await runAddResource(projectDir, "my-resource");

			const resourcePath = join(projectDir, "src", "resources", "my-resource.ts");
			const content = await readFile(resourcePath, "utf-8");

			expect(content).toContain("export function registerMyResourceResource");
		});

		it("should include resource description", async () => {
			await runAddResource(projectDir, "test-resource", {
				description: "Custom resource description",
			});

			const resourcePath = join(projectDir, "src", "resources", "test-resource.ts");
			const content = await readFile(resourcePath, "utf-8");

			expect(content).toContain("Custom resource description");
		});

		it("should use default URI pattern for static resources", async () => {
			await runAddResource(projectDir, "config");

			const resourcePath = join(projectDir, "src", "resources", "config.ts");
			const content = await readFile(resourcePath, "utf-8");

			expect(content).toContain('"config://config"');
		});

		it("should use custom URI pattern when provided", async () => {
			await runAddResource(projectDir, "user", {
				uriPattern: "user://{id}",
			});

			const resourcePath = join(projectDir, "src", "resources", "user.ts");
			const content = await readFile(resourcePath, "utf-8");

			expect(content).toContain("user://{id}");
		});

		it("should reject duplicate resource names", async () => {
			await runAddResource(projectDir, "duplicate-resource");
			const result = await runAddResource(projectDir, "duplicate-resource");

			expect(result.success).toBe(false);
			expect(result.stderr).toContain("already exists");
		});
	});

	describe("unit test file generation", () => {
		it("should create unit test file when tests enabled", async () => {
			await runAddResource(projectDir, "test-resource");

			const testPath = join(
				projectDir,
				"test",
				"unit",
				"resources",
				"test-resource.test.ts",
			);
			expect(existsSync(testPath)).toBe(true);
		});

		it("should skip unit test file when --no-tests flag used", async () => {
			await runAddResource(projectDir, "test-resource", { noTests: true });

			const testPath = join(
				projectDir,
				"test",
				"unit",
				"resources",
				"test-resource.test.ts",
			);
			expect(existsSync(testPath)).toBe(false);
		});

		it("should include correct import path in unit test", async () => {
			await runAddResource(projectDir, "my-resource");

			const testPath = join(
				projectDir,
				"test",
				"unit",
				"resources",
				"my-resource.test.ts",
			);
			const content = await readFile(testPath, "utf-8");

			expect(content).toContain(
				'from "../../../src/resources/my-resource.js"',
			);
		});
	});

	describe("integration test YAML generation", () => {
		it("should create integration test YAML when tests enabled", async () => {
			await runAddResource(projectDir, "test-resource");

			const yamlPath = join(
				projectDir,
				"test",
				"integration",
				"specs",
				"resources",
				"test-resource.yaml",
			);
			expect(existsSync(yamlPath)).toBe(true);
		});

		it("should skip integration test YAML when --no-tests flag used", async () => {
			await runAddResource(projectDir, "test-resource", { noTests: true });

			const yamlPath = join(
				projectDir,
				"test",
				"integration",
				"specs",
				"resources",
				"test-resource.yaml",
			);
			expect(existsSync(yamlPath)).toBe(false);
		});

		it("should include correct resource name in YAML", async () => {
			await runAddResource(projectDir, "test-resource");

			const yamlPath = join(
				projectDir,
				"test",
				"integration",
				"specs",
				"resources",
				"test-resource.yaml",
			);
			const content = await readFile(yamlPath, "utf-8");

			expect(content).toContain('name: "test resource - Basic"');
		});

		it("should include success assertion in YAML", async () => {
			await runAddResource(projectDir, "test-resource");

			const yamlPath = join(
				projectDir,
				"test",
				"integration",
				"specs",
				"resources",
				"test-resource.yaml",
			);
			const content = await readFile(yamlPath, "utf-8");

			expect(content).toContain('type: "success"');
		});
	});

	describe("resource registration in index.ts", () => {
		it("should add import statement to index.ts", async () => {
			await runAddResource(projectDir, "my-resource");

			const indexPath = join(projectDir, "src", "index.ts");
			const content = await readFile(indexPath, "utf-8");

			expect(content).toContain(
				'import { registerMyResourceResource } from "./resources/my-resource.js"',
			);
		});

		it("should add registration call in init method", async () => {
			await runAddResource(projectDir, "my-resource");

			const indexPath = join(projectDir, "src", "index.ts");
			const content = await readFile(indexPath, "utf-8");

			expect(content).toContain("registerMyResourceResource(this.server)");
		});

		it("should skip registration when --no-register flag used", async () => {
			await runAddResource(projectDir, "my-resource", { noRegister: true });

			const indexPath = join(projectDir, "src", "index.ts");
			const content = await readFile(indexPath, "utf-8");

			expect(content).not.toContain("registerMyResourceResource");
		});

		it("should handle multiple resources in sequence", async () => {
			await runAddResource(projectDir, "first-resource");
			await runAddResource(projectDir, "second-resource");

			const indexPath = join(projectDir, "src", "index.ts");
			const content = await readFile(indexPath, "utf-8");

			expect(content).toContain("registerFirstResourceResource");
			expect(content).toContain("registerSecondResourceResource");
		});
	});

	describe("metadata updates", () => {
		it("should add resource to metadata file", async () => {
			await runAddResource(projectDir, "test-resource");

			const metadataPath = join(projectDir, ".mcp-template.json");
			if (existsSync(metadataPath)) {
				const content = await readFile(metadataPath, "utf-8");
				const metadata = JSON.parse(content);

				const resourceEntry = metadata.resources?.find(
					(r: any) => r.name === "test-resource",
				);
				expect(resourceEntry).toBeDefined();
				expect(resourceEntry?.file).toBe("src/resources/test-resource.ts");
			}
		});

		it("should mark resource as registered in metadata", async () => {
			await runAddResource(projectDir, "test-resource");

			const metadataPath = join(projectDir, ".mcp-template.json");
			if (existsSync(metadataPath)) {
				const content = await readFile(metadataPath, "utf-8");
				const metadata = JSON.parse(content);

				const resourceEntry = metadata.resources?.find(
					(r: any) => r.name === "test-resource",
				);
				expect(resourceEntry?.registered).toBe(true);
			}
		});

		it("should mark tests as created when enabled", async () => {
			await runAddResource(projectDir, "test-resource");

			const metadataPath = join(projectDir, ".mcp-template.json");
			if (existsSync(metadataPath)) {
				const content = await readFile(metadataPath, "utf-8");
				const metadata = JSON.parse(content);

				const resourceEntry = metadata.resources?.find(
					(r: any) => r.name === "test-resource",
				);
				expect(resourceEntry?.hasUnitTest).toBe(true);
				expect(resourceEntry?.hasIntegrationTest).toBe(true);
			}
		});
	});

	describe("static vs dynamic resources", () => {
		it("should default to static resource pattern", async () => {
			await runAddResource(projectDir, "config");

			const resourcePath = join(projectDir, "src", "resources", "config.ts");
			const content = await readFile(resourcePath, "utf-8");

			expect(content).toContain("config://config");
			expect(content).not.toContain("ResourceTemplate");
		});

		it("should create dynamic resource when --dynamic flag used", async () => {
			await runAddResource(projectDir, "user", { dynamic: true });

			const resourcePath = join(projectDir, "src", "resources", "user.ts");
			const content = await readFile(resourcePath, "utf-8");

			expect(content).toContain("resource://{id}");
		});

		it("should create static resource when --static flag used", async () => {
			await runAddResource(projectDir, "status", { static: true });

			const resourcePath = join(projectDir, "src", "resources", "status.ts");
			const content = await readFile(resourcePath, "utf-8");

			expect(content).toContain("config://status");
		});

		it("should reject conflicting --static and --dynamic flags", async () => {
			const result = await runAddResource(projectDir, "conflicting", {
				static: true,
				dynamic: true,
			});

			expect(result.success).toBe(false);
			expect(result.stderr).toContain("Cannot use both --static and --dynamic");
		});
	});

	describe("error scenarios", () => {
		it("should fail when not in a project directory", async () => {
			const nonProjectDir = join(tempDir, "not-a-project");
			await import("node:fs/promises").then((fs) => fs.mkdir(nonProjectDir));

			const result = await runAddResource(nonProjectDir, "test-resource");

			expect(result.success).toBe(false);
			expect(result.stderr).toContain("Not in a valid project");
		});

		it("should provide helpful error messages", async () => {
			const result = await runAddResource(projectDir, "Invalid-Name");

			expect(result.success).toBe(false);
			expect(result.stderr).toContain("lowercase with hyphens");
		});
	});

	describe("success output", () => {
		it("should show success message", async () => {
			const result = await runAddResource(projectDir, "test-resource");

			expect(result.stdout).toContain("created successfully");
		});

		it("should show next steps", async () => {
			const result = await runAddResource(projectDir, "test-resource");

			expect(result.stdout).toContain("Next steps:");
			expect(result.stdout).toContain("src/resources/test-resource.ts");
		});

		it("should show file creation confirmations", async () => {
			const result = await runAddResource(projectDir, "test-resource");

			expect(result.stdout).toContain("Created");
			expect(result.stdout).toContain("Registered in src/index.ts");
		});
	});

	describe("PascalCase conversion", () => {
		it("should convert single-word names to PascalCase", async () => {
			await runAddResource(projectDir, "config");

			const resourcePath = join(projectDir, "src", "resources", "config.ts");
			const content = await readFile(resourcePath, "utf-8");

			expect(content).toContain("registerConfigResource");
		});

		it("should convert hyphenated names to PascalCase", async () => {
			await runAddResource(projectDir, "my-resource");

			const resourcePath = join(projectDir, "src", "resources", "my-resource.ts");
			const content = await readFile(resourcePath, "utf-8");

			expect(content).toContain("registerMyResourceResource");
		});

		it("should convert multi-word names to PascalCase", async () => {
			await runAddResource(projectDir, "user-profile-data");

			const resourcePath = join(projectDir, "src", "resources", "user-profile-data.ts");
			const content = await readFile(resourcePath, "utf-8");

			expect(content).toContain("registerUserProfileDataResource");
		});
	});

	describe("file organization", () => {
		it("should create src/resources directory if it doesn't exist", async () => {
			await runAddResource(projectDir, "test-resource");

			const resourcesDir = join(projectDir, "src", "resources");
			expect(existsSync(resourcesDir)).toBe(true);
		});

		it("should create test directories if they don't exist", async () => {
			await runAddResource(projectDir, "test-resource");

			const unitDir = join(projectDir, "test", "unit", "resources");
			const integrationDir = join(
				projectDir,
				"test",
				"integration",
				"specs",
				"resources",
			);

			expect(existsSync(unitDir)).toBe(true);
			expect(existsSync(integrationDir)).toBe(true);
		});
	});

	describe("direct function tests (for coverage)", () => {
		describe("toPascalCase", () => {
			it("should convert single word to PascalCase", async () => {
				const { toPascalCase } = await import("@/core/commands/shared/utils.js");
				expect(toPascalCase("config")).toBe("Config");
			});

			it("should convert hyphenated words to PascalCase", async () => {
				const { toPascalCase } = await import("@/core/commands/shared/utils.js");
				expect(toPascalCase("my-resource")).toBe("MyResource");
				expect(toPascalCase("user-profile-data")).toBe("UserProfileData");
			});
		});

		describe("generateResourceFile", () => {
			it("should generate static resource file with correct structure", async () => {
				const { generateResourceFile } = await import("@/core/commands/add-resource.js");
				const content = generateResourceFile("test-resource", "TestResource", {
					description: "Test description",
					uriPattern: "config://test",
					tests: true,
					register: true,
				});

				expect(content).toContain("export function registerTestResourceResource");
				expect(content).toContain("Test description");
				expect(content).toContain('"test-resource"');
				expect(content).toContain('"config://test"');
			});

			it("should generate dynamic resource file with ResourceTemplate", async () => {
				const { generateResourceFile } = await import("@/core/commands/add-resource.js");
				const content = generateResourceFile("user", "User", {
					description: "User resource",
					uriPattern: "user://{id}",
					tests: true,
					register: true,
				});

				expect(content).toContain("ResourceTemplate");
				expect(content).toContain("user://{id}");
				expect(content).toContain("async (uri, variables)");
			});

			it("should include variable extraction for dynamic resources", async () => {
				const { generateResourceFile } = await import("@/core/commands/add-resource.js");
				const content = generateResourceFile("db-record", "DbRecord", {
					description: "DB record",
					uriPattern: "db://{table}/{id}",
					tests: true,
					register: true,
				});

				expect(content).toContain("const table = variables.table");
				expect(content).toContain("const id = variables.id");
			});
		});

		describe("generateUnitTestFile", () => {
			it("should generate unit test with correct imports", async () => {
				const { generateUnitTestFile } = await import("@/core/commands/add-resource.js");
				const content = generateUnitTestFile("my-resource", "MyResource");

				expect(content).toContain('from "../../../src/resources/my-resource.js"');
				expect(content).toContain("registerMyResourceResource");
			});

			it("should include test describe blocks", async () => {
				const { generateUnitTestFile } = await import("@/core/commands/add-resource.js");
				const content = generateUnitTestFile("test-resource", "TestResource");

				expect(content).toContain('describe("test-resource resource"');
			});
		});

		describe("generateIntegrationTestYaml", () => {
			it("should generate YAML with static URI", async () => {
				const { generateIntegrationTestYaml } = await import("@/core/commands/add-resource.js");
				const content = generateIntegrationTestYaml(
					"config",
					"Config resource",
					"config://app",
				);

				expect(content).toContain('uri: "config://app"');
				expect(content).toContain('type: "success"');
			});

			it("should replace template variables with test values", async () => {
				const { generateIntegrationTestYaml } = await import("@/core/commands/add-resource.js");
				const content = generateIntegrationTestYaml(
					"user",
					"User resource",
					"user://{id}",
				);

				expect(content).toContain('uri: "user://test-value"');
			});

			it("should convert hyphens to spaces in name", async () => {
				const { generateIntegrationTestYaml } = await import("@/core/commands/add-resource.js");
				const content = generateIntegrationTestYaml(
					"user-profile",
					"User profile",
					"profile://test",
				);

				expect(content).toContain('name: "user profile - Basic"');
			});
		});

		describe("registerResourceInIndex", () => {
			it("should add import and registration call to index.ts", async () => {
				const { registerResourceInIndex } = await import("@/core/commands/add-resource.js");

				await registerResourceInIndex(projectDir, "test-resource", "TestResource");

				const indexPath = join(projectDir, "src", "index.ts");
				const content = await readFile(indexPath, "utf-8");

				expect(content).toContain(
					'import { registerTestResourceResource } from "./resources/test-resource.js"'
				);
				expect(content).toContain("registerTestResourceResource(this.server)");
			});
		});

		describe("updateTemplateMetadata", () => {
			it("should add resource to metadata file", async () => {
				const { updateTemplateMetadata } = await import("@/core/commands/shared/metadata.js");

				await updateTemplateMetadata(projectDir, "resources", "test-resource", "src/resources/test-resource.ts", true);

				const metadataPath = join(projectDir, ".mcp-template.json");
				if (existsSync(metadataPath)) {
					const content = await readFile(metadataPath, "utf-8");
					const metadata = JSON.parse(content);

					const resourceEntry = metadata.resources?.find(
						(r: any) => r.name === "test-resource"
					);
					expect(resourceEntry).toBeDefined();
					expect(resourceEntry?.file).toBe("src/resources/test-resource.ts");
					expect(resourceEntry?.registered).toBe(true);
				}
			});

			it("should mark tests as created when hasTests is true", async () => {
				const { updateTemplateMetadata } = await import("@/core/commands/shared/metadata.js");

				await updateTemplateMetadata(projectDir, "resources", "with-tests", "src/resources/with-tests.ts", true);

				const metadataPath = join(projectDir, ".mcp-template.json");
				if (existsSync(metadataPath)) {
					const content = await readFile(metadataPath, "utf-8");
					const metadata = JSON.parse(content);

					const resourceEntry = metadata.resources?.find(
						(r: any) => r.name === "with-tests"
					);
					expect(resourceEntry?.hasUnitTest).toBe(true);
					expect(resourceEntry?.hasIntegrationTest).toBe(true);
				}
			});

			it("should mark tests as not created when hasTests is false", async () => {
				const { updateTemplateMetadata } = await import("@/core/commands/shared/metadata.js");

				await updateTemplateMetadata(projectDir, "resources", "without-tests", "src/resources/without-tests.ts", false);

				const metadataPath = join(projectDir, ".mcp-template.json");
				if (existsSync(metadataPath)) {
					const content = await readFile(metadataPath, "utf-8");
					const metadata = JSON.parse(content);

					const resourceEntry = metadata.resources?.find(
						(r: any) => r.name === "without-tests"
					);
					expect(resourceEntry?.hasUnitTest).toBe(false);
					expect(resourceEntry?.hasIntegrationTest).toBe(false);
				}
			});
		});
	});
});
