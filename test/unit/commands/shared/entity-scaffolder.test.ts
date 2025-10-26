/**
 * EntityScaffolder - Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
	EntityScaffolder,
	type ScaffoldConfig,
} from "@/core/commands/shared/entity-scaffolder.js";

describe("EntityScaffolder", () => {
	let tempDir: string;
	let scaffolder: EntityScaffolder;

	beforeEach(async () => {
		tempDir = join("/tmp", `scaffolder-test-${Date.now()}`);
		await mkdir(tempDir, { recursive: true });
		await mkdir(join(tempDir, "src"), { recursive: true });
		await mkdir(join(tempDir, "test"), { recursive: true });

		// Create package.json to make it a valid project
		await writeFile(
			join(tempDir, "package.json"),
			JSON.stringify({ name: "test-project" }),
			"utf-8",
		);

		// Create index.ts
		const indexContent = `
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export class MCPServerAgent extends McpAgent<Env> {
	server = new McpServer({
		name: "test-server",
		version: "1.0.0",
	});

	async init() {
	}
}
`.trim();
		await writeFile(join(tempDir, "src", "index.ts"), indexContent, "utf-8");

		scaffolder = new EntityScaffolder();
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	describe("scaffold - Tools", () => {
		it("should scaffold a complete tool", async () => {
			const config: ScaffoldConfig = {
				entityType: "tool",
				name: "test-tool",
				description: "Test tool description",
			};

			const result = await scaffolder.scaffold(tempDir, config);

			expect(result.success).toBe(true);
			expect(result.registered).toBe(true);
			expect(result.filesCreated).toHaveLength(3); // entity + unit test + integration test
		});

		it("should create tool file with correct content", async () => {
			const config: ScaffoldConfig = {
				entityType: "tool",
				name: "my-tool",
				description: "My tool description",
			};

			await scaffolder.scaffold(tempDir, config);

			const toolPath = join(tempDir, "src", "tools", "my-tool.ts");
			expect(existsSync(toolPath)).toBe(true);

			const content = await readFile(toolPath, "utf-8");
			expect(content).toContain("MyTool Tool");
			expect(content).toContain("My tool description");
			expect(content).toContain("registerMyToolTool");
			expect(content).toContain('server.tool(');
		});

		it("should create tool unit test file", async () => {
			const config: ScaffoldConfig = {
				entityType: "tool",
				name: "my-tool",
			};

			await scaffolder.scaffold(tempDir, config);

			const unitTestPath = join(
				tempDir,
				"test",
				"unit",
				"tools",
				"my-tool.test.ts",
			);
			expect(existsSync(unitTestPath)).toBe(true);

			const content = await readFile(unitTestPath, "utf-8");
			expect(content).toContain("MyTool Tool - Unit Tests");
			expect(content).toContain("registerMyToolTool");
		});

		it("should create tool integration test file", async () => {
			const config: ScaffoldConfig = {
				entityType: "tool",
				name: "my-tool",
			};

			await scaffolder.scaffold(tempDir, config);

			const integrationTestPath = join(
				tempDir,
				"test",
				"integration",
				"specs",
				"my-tool.yaml",
			);
			expect(existsSync(integrationTestPath)).toBe(true);

			const content = await readFile(integrationTestPath, "utf-8");
			expect(content).toContain('tool: "my-tool"');
			expect(content).toContain('type: "success"');
		});

		it("should register tool in index.ts", async () => {
			const config: ScaffoldConfig = {
				entityType: "tool",
				name: "my-tool",
			};

			await scaffolder.scaffold(tempDir, config);

			const indexContent = await readFile(
				join(tempDir, "src", "index.ts"),
				"utf-8",
			);
			expect(indexContent).toContain(
				'import { registerMyToolTool } from "./tools/my-tool.js";',
			);
			expect(indexContent).toContain("registerMyToolTool(this.server);");
		});
	});

	describe("scaffold - Prompts", () => {
		it("should scaffold a complete prompt", async () => {
			const config: ScaffoldConfig = {
				entityType: "prompt",
				name: "test-prompt",
				description: "Test prompt description",
			};

			const result = await scaffolder.scaffold(tempDir, config);

			expect(result.success).toBe(true);
			expect(result.registered).toBe(true);
			expect(result.filesCreated).toHaveLength(3);
		});

		it("should create prompt file with correct content", async () => {
			const config: ScaffoldConfig = {
				entityType: "prompt",
				name: "my-prompt",
				description: "My prompt description",
			};

			await scaffolder.scaffold(tempDir, config);

			const promptPath = join(tempDir, "src", "prompts", "my-prompt.ts");
			expect(existsSync(promptPath)).toBe(true);

			const content = await readFile(promptPath, "utf-8");
			expect(content).toContain("MyPrompt Prompt");
			expect(content).toContain("My prompt description");
			expect(content).toContain("registerMyPromptPrompt");
			expect(content).toContain('server.prompt(');
		});

		it("should create prompt integration test in prompts subdirectory", async () => {
			const config: ScaffoldConfig = {
				entityType: "prompt",
				name: "my-prompt",
			};

			await scaffolder.scaffold(tempDir, config);

			const integrationTestPath = join(
				tempDir,
				"test",
				"integration",
				"specs",
				"prompts",
				"my-prompt.yaml",
			);
			expect(existsSync(integrationTestPath)).toBe(true);

			const content = await readFile(integrationTestPath, "utf-8");
			expect(content).toContain('type: "prompt"');
			expect(content).toContain('prompt: "my-prompt"');
		});
	});

	describe("scaffold - Resources", () => {
		it("should scaffold a static resource", async () => {
			const config: ScaffoldConfig = {
				entityType: "resource",
				name: "my-resource",
				description: "My resource description",
				resourceOptions: {
					static: true,
				},
			};

			const result = await scaffolder.scaffold(tempDir, config);

			expect(result.success).toBe(true);
			expect(result.registered).toBe(true);
			expect(result.filesCreated).toHaveLength(3);
		});

		it("should create static resource with correct URI pattern", async () => {
			const config: ScaffoldConfig = {
				entityType: "resource",
				name: "config-data",
				resourceOptions: {
					static: true,
				},
			};

			await scaffolder.scaffold(tempDir, config);

			const resourcePath = join(
				tempDir,
				"src",
				"resources",
				"config-data.ts",
			);
			const content = await readFile(resourcePath, "utf-8");

			expect(content).toContain("✓ STATIC RESOURCE");
			expect(content).toContain("config://config-data");
			expect(content).not.toContain("ResourceTemplate");
		});

		it("should scaffold a dynamic resource", async () => {
			const config: ScaffoldConfig = {
				entityType: "resource",
				name: "user-data",
				description: "User data resource",
				resourceOptions: {
					dynamic: true,
				},
			};

			const result = await scaffolder.scaffold(tempDir, config);

			expect(result.success).toBe(true);
		});

		it("should create dynamic resource with correct URI pattern", async () => {
			const config: ScaffoldConfig = {
				entityType: "resource",
				name: "user-data",
				resourceOptions: {
					dynamic: true,
				},
			};

			await scaffolder.scaffold(tempDir, config);

			const resourcePath = join(tempDir, "src", "resources", "user-data.ts");
			const content = await readFile(resourcePath, "utf-8");

			expect(content).toContain("⚠️  DYNAMIC RESOURCE");
			expect(content).toContain("resource://{id}");
			expect(content).toContain("ResourceTemplate");
		});

		it("should use explicit URI pattern when provided", async () => {
			const config: ScaffoldConfig = {
				entityType: "resource",
				name: "api-data",
				resourceOptions: {
					uriPattern: "api://{userId}/{resourceId}",
				},
			};

			await scaffolder.scaffold(tempDir, config);

			const resourcePath = join(tempDir, "src", "resources", "api-data.ts");
			const content = await readFile(resourcePath, "utf-8");

			expect(content).toContain("api://{userId}/{resourceId}");
		});

		it("should create resource integration test in resources subdirectory", async () => {
			const config: ScaffoldConfig = {
				entityType: "resource",
				name: "my-resource",
				resourceOptions: {
					static: true,
				},
			};

			await scaffolder.scaffold(tempDir, config);

			const integrationTestPath = join(
				tempDir,
				"test",
				"integration",
				"specs",
				"resources",
				"my-resource.yaml",
			);
			expect(existsSync(integrationTestPath)).toBe(true);

			const content = await readFile(integrationTestPath, "utf-8");
			expect(content).toContain('type: "resource"');
			expect(content).toContain('uri: "config://my-resource"');
		});
	});

	describe("scaffold - Flags", () => {
		it("should skip test generation when generateTests is false", async () => {
			const config: ScaffoldConfig = {
				entityType: "tool",
				name: "my-tool",
				generateTests: false,
			};

			const result = await scaffolder.scaffold(tempDir, config);

			expect(result.success).toBe(true);
			expect(result.filesCreated).toHaveLength(1); // Only entity file

			const unitTestPath = join(
				tempDir,
				"test",
				"unit",
				"tools",
				"my-tool.test.ts",
			);
			expect(existsSync(unitTestPath)).toBe(false);

			const integrationTestPath = join(
				tempDir,
				"test",
				"integration",
				"specs",
				"my-tool.yaml",
			);
			expect(existsSync(integrationTestPath)).toBe(false);
		});

		it("should skip registration when autoRegister is false", async () => {
			const config: ScaffoldConfig = {
				entityType: "tool",
				name: "my-tool",
				autoRegister: false,
			};

			const result = await scaffolder.scaffold(tempDir, config);

			expect(result.success).toBe(true);
			expect(result.registered).toBe(false);

			const indexContent = await readFile(
				join(tempDir, "src", "index.ts"),
				"utf-8",
			);
			expect(indexContent).not.toContain("registerMyToolTool");
		});

		it("should generate tests by default", async () => {
			const config: ScaffoldConfig = {
				entityType: "tool",
				name: "my-tool",
				// generateTests not specified, should default to true
			};

			const result = await scaffolder.scaffold(tempDir, config);

			expect(result.filesCreated).toHaveLength(3);
		});

		it("should register by default", async () => {
			const config: ScaffoldConfig = {
				entityType: "tool",
				name: "my-tool",
				// autoRegister not specified, should default to true
			};

			const result = await scaffolder.scaffold(tempDir, config);

			expect(result.registered).toBe(true);
		});
	});

	describe("scaffold - Error Handling", () => {
		it("should throw error for invalid name", async () => {
			const config: ScaffoldConfig = {
				entityType: "tool",
				name: "InvalidName",
			};

			await expect(scaffolder.scaffold(tempDir, config)).rejects.toThrow(
				"Tool name must be lowercase with hyphens",
			);
		});

		it("should throw error when not in a project", async () => {
			const nonProjectDir = join("/tmp", `non-project-${Date.now()}`);
			await mkdir(nonProjectDir, { recursive: true });

			const config: ScaffoldConfig = {
				entityType: "tool",
				name: "my-tool",
			};

			await expect(scaffolder.scaffold(nonProjectDir, config)).rejects.toThrow(
				"Not in a valid project directory",
			);

			await rm(nonProjectDir, { recursive: true, force: true });
		});

		it("should throw error when entity already exists", async () => {
			const config: ScaffoldConfig = {
				entityType: "tool",
				name: "existing-tool",
			};

			// Create the tool file manually
			await mkdir(join(tempDir, "src", "tools"), { recursive: true });
			await writeFile(
				join(tempDir, "src", "tools", "existing-tool.ts"),
				"// existing tool",
				"utf-8",
			);

			await expect(scaffolder.scaffold(tempDir, config)).rejects.toThrow(
				"Tool already exists",
			);
		});

		it("should throw error for resource with conflicting flags", async () => {
			const config: ScaffoldConfig = {
				entityType: "resource",
				name: "my-resource",
				resourceOptions: {
					static: true,
					dynamic: true,
				},
			};

			await expect(scaffolder.scaffold(tempDir, config)).rejects.toThrow(
				"Cannot use both --static and --dynamic flags",
			);
		});
	});

	describe("scaffold - Default Description", () => {
		it("should use TODO when description is not provided", async () => {
			const config: ScaffoldConfig = {
				entityType: "tool",
				name: "my-tool",
			};

			await scaffolder.scaffold(tempDir, config);

			const toolPath = join(tempDir, "src", "tools", "my-tool.ts");
			const content = await readFile(toolPath, "utf-8");

			expect(content).toContain("TODO: Add description");
		});

		it("should use provided description", async () => {
			const config: ScaffoldConfig = {
				entityType: "tool",
				name: "my-tool",
				description: "Custom description",
			};

			await scaffolder.scaffold(tempDir, config);

			const toolPath = join(tempDir, "src", "tools", "my-tool.ts");
			const content = await readFile(toolPath, "utf-8");

			expect(content).toContain("Custom description");
			expect(content).not.toContain("TODO: Add description");
		});
	});

	describe("static helper methods", () => {
		it("should return correct emoji for each entity type", () => {
			expect(EntityScaffolder.getEntityEmoji("tool")).toBe("🔧");
			expect(EntityScaffolder.getEntityEmoji("prompt")).toBe("📝");
			expect(EntityScaffolder.getEntityEmoji("resource")).toBe("📦");
		});

		it("should return correct display name for each entity type", () => {
			expect(EntityScaffolder.getEntityDisplayName("tool")).toBe("Tool");
			expect(EntityScaffolder.getEntityDisplayName("prompt")).toBe("Prompt");
			expect(EntityScaffolder.getEntityDisplayName("resource")).toBe(
				"Resource",
			);
		});
	});
});
