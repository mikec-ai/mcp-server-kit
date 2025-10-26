/**
 * List Tools Command - Unit Tests
 *
 * Tests for the `mcp-server-kit list tools` command.
 *
 * Coverage goals:
 * - Tool discovery from src/tools/ directory
 * - Registration detection from src/index.ts
 * - Test coverage detection (unit and integration)
 * - Filter functionality (registered, unregistered, tested, untested)
 * - Example tool filtering (--show-examples)
 * - JSON output format
 * - Error scenarios
 * - Direct function tests for helpers
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import {
	createTestProject,
	addToolToProject,
} from "../../helpers/project-setup.js";

const execAsync = promisify(exec);

describe("list tools command - Integration Tests", () => {
	let projectDir: string;
	const cliPath = join(process.cwd(), "bin", "mcp-server-kit.js");

	beforeEach(async () => {
		projectDir = await createTestProject();
	});

	afterEach(async () => {
		if (projectDir && existsSync(projectDir)) {
			await rm(projectDir, { recursive: true, force: true });
		}
	});

	describe("Basic functionality", () => {
		it("should list tools in a project with no custom tools", async () => {
			const { stdout } = await execAsync(`node "${cliPath}" list tools`, {
				cwd: projectDir,
			});

			expect(stdout).toContain("Found");
			expect(stdout).toContain("tool");
			expect(stdout).toContain("Summary:");
		});

		it("should list tools after adding custom tools", async () => {
			// Add some tools
			await addToolToProject(projectDir, "test-tool", {
				description: "Test tool",
			});
			await addToolToProject(projectDir, "another-tool", {
				description: "Another tool",
			});

			const { stdout } = await execAsync(`node "${cliPath}" list tools`, {
				cwd: projectDir,
			});

			expect(stdout).toContain("test-tool");
			expect(stdout).toContain("another-tool");
		});

		it("should show registration status correctly", async () => {
			// Add a registered tool
			await addToolToProject(projectDir, "registered-tool", {
				description: "Registered tool",
				registered: true,
			});

			const { stdout } = await execAsync(`node "${cliPath}" list tools`, {
				cwd: projectDir,
			});

			expect(stdout).toContain("registered-tool");
			expect(stdout).toContain("✓"); // Should show checkmark for registered
		});

		it("should show test coverage status", async () => {
			// Add a tool with tests
			await addToolToProject(projectDir, "tested-tool", {
				description: "Tested tool",
				hasUnitTest: true,
				hasIntegrationTest: true,
			});

			const { stdout } = await execAsync(`node "${cliPath}" list tools`, {
				cwd: projectDir,
			});

			expect(stdout).toContain("tested-tool");
			expect(stdout).toContain("Summary:");
		});
	});

	describe("Filter options", () => {
		beforeEach(async () => {
			// Create a variety of tools for filtering tests
			await addToolToProject(projectDir, "registered-tested", {
				description: "Registered and tested",
				registered: true,
				hasUnitTest: true,
				hasIntegrationTest: true,
			});
			await addToolToProject(projectDir, "registered-untested", {
				description: "Registered but no tests",
				registered: true,
			});
			await addToolToProject(projectDir, "unregistered-tested", {
				description: "Unregistered but has tests",
				registered: false,
				hasUnitTest: true,
				hasIntegrationTest: true,
			});
			await addToolToProject(projectDir, "unregistered-untested", {
				description: "Unregistered and no tests",
				registered: false,
			});
		});

		it("should filter by registered tools", async () => {
			const { stdout } = await execAsync(
				`node "${cliPath}" list tools --filter registered`,
				{ cwd: projectDir },
			);

			expect(stdout).toContain("registered-tested");
			expect(stdout).toContain("registered-untested");
			expect(stdout).not.toContain("unregistered-tested");
			expect(stdout).not.toContain("unregistered-untested");
		});

		it("should filter by unregistered tools", async () => {
			const { stdout } = await execAsync(
				`node "${cliPath}" list tools --filter unregistered`,
				{ cwd: projectDir },
			);

			// Use JSON output to avoid substring matching issues
			const { stdout: jsonOutput } = await execAsync(
				`node "${cliPath}" list tools --filter unregistered --json`,
				{ cwd: projectDir },
			);
			const parsed = JSON.parse(jsonOutput);
			const names = parsed.map((t: any) => t.name);

			expect(names).not.toContain("registered-tested");
			expect(names).not.toContain("registered-untested");
			expect(names).toContain("unregistered-tested");
			expect(names).toContain("unregistered-untested");
		});

		it("should filter by tested tools", async () => {
			const { stdout } = await execAsync(
				`node "${cliPath}" list tools --filter tested`,
				{ cwd: projectDir },
			);

			expect(stdout).toContain("registered-tested");
			expect(stdout).toContain("unregistered-tested");
			expect(stdout).not.toContain("registered-untested");
			expect(stdout).not.toContain("unregistered-untested");
		});

		it("should filter by untested tools", async () => {
			const { stdout } = await execAsync(
				`node "${cliPath}" list tools --filter untested`,
				{ cwd: projectDir },
			);

			expect(stdout).not.toContain("registered-tested");
			expect(stdout).not.toContain("unregistered-tested");
			expect(stdout).toContain("registered-untested");
			expect(stdout).toContain("unregistered-untested");
		});

		it("should show all tools with --filter all", async () => {
			const { stdout } = await execAsync(
				`node "${cliPath}" list tools --filter all`,
				{ cwd: projectDir },
			);

			expect(stdout).toContain("registered-tested");
			expect(stdout).toContain("registered-untested");
			expect(stdout).toContain("unregistered-tested");
			expect(stdout).toContain("unregistered-untested");
		});
	});

	describe("JSON output", () => {
		it("should output JSON format with --json flag", async () => {
			await addToolToProject(projectDir, "json-tool", {
				description: "Tool for JSON test",
			});

			const { stdout } = await execAsync(`node "${cliPath}" list tools --json`, {
				cwd: projectDir,
			});

			const parsed = JSON.parse(stdout);
			expect(Array.isArray(parsed)).toBe(true);
			expect(parsed.some((t: any) => t.name === "json-tool")).toBe(true);
		});

		it("should include all properties in JSON output", async () => {
			await addToolToProject(projectDir, "full-tool", {
				description: "Full tool with all properties",
				registered: true,
				hasUnitTest: true,
				hasIntegrationTest: true,
			});

			const { stdout } = await execAsync(`node "${cliPath}" list tools --json`, {
				cwd: projectDir,
			});

			const parsed = JSON.parse(stdout);
			const tool = parsed.find((t: any) => t.name === "full-tool");

			expect(tool).toBeDefined();
			expect(tool).toHaveProperty("name");
			expect(tool).toHaveProperty("file");
			expect(tool).toHaveProperty("registered");
			expect(tool).toHaveProperty("hasUnitTest");
			expect(tool).toHaveProperty("hasIntegrationTest");
		});

		it("should combine --json with --filter", async () => {
			await addToolToProject(projectDir, "registered-json", {
				registered: true,
			});
			await addToolToProject(projectDir, "unregistered-json", {
				registered: false,
			});

			const { stdout } = await execAsync(
				`node "${cliPath}" list tools --json --filter registered`,
				{ cwd: projectDir },
			);

			const parsed = JSON.parse(stdout);
			expect(parsed.some((t: any) => t.name === "registered-json")).toBe(true);
			expect(parsed.some((t: any) => t.name === "unregistered-json")).toBe(
				false,
			);
		});
	});

	describe("Example tools", () => {
		it("should hide example tools by default", async () => {
			// Create an example tool
			const exampleToolPath = join(projectDir, "src", "tools", "_example-tool.ts");
			const exampleContent = `
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerExampleTool(server: McpServer): void {
  server.tool("example-tool", "Example tool", {}, async () => {
    return { content: [{ type: "text" as const, text: "Example" }] };
  });
}
`;
			await writeFile(exampleToolPath, exampleContent, "utf-8");

			const { stdout } = await execAsync(`node "${cliPath}" list tools`, {
				cwd: projectDir,
			});

			expect(stdout).not.toContain("_example-tool");
		});

		it("should show example tools with --show-examples flag", async () => {
			// Create an example tool
			const exampleToolPath = join(projectDir, "src", "tools", "_example-tool.ts");
			const exampleContent = `
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerExampleTool(server: McpServer): void {
  server.tool("example-tool", "Example tool", {}, async () => {
    return { content: [{ type: "text" as const, text: "Example" }] };
  });
}
`;
			await writeFile(exampleToolPath, exampleContent, "utf-8");

			const { stdout } = await execAsync(
				`node "${cliPath}" list tools --show-examples`,
				{ cwd: projectDir },
			);

			expect(stdout).toContain("_example-tool");
		});
	});

	describe("Error scenarios", () => {
		it("should error when not in an MCP project", async () => {
			const tempDir = await mkdtemp(join(tmpdir(), "not-mcp-"));

			try {
				await execAsync(`node "${cliPath}" list tools`, { cwd: tempDir });
				expect.fail("Should have thrown an error");
			} catch (error: any) {
				expect(error.stderr || error.stdout).toContain(
					"src/tools/ directory not found",
				);
			} finally {
				await rm(tempDir, { recursive: true, force: true });
			}
		});

		it("should handle projects with missing index.ts gracefully", async () => {
			// Remove index.ts
			const indexPath = join(projectDir, "src", "index.ts");
			if (existsSync(indexPath)) {
				await rm(indexPath);
			}

			// Should still work, just show all tools as unregistered
			const { stdout } = await execAsync(`node "${cliPath}" list tools`, {
				cwd: projectDir,
			});

			expect(stdout).toContain("Found");
		});

		it("should handle empty tools directory", async () => {
			// Ensure tools directory exists but is empty
			const toolsDir = join(projectDir, "src", "tools");
			if (existsSync(toolsDir)) {
				// Remove all .ts files
				const fs = await import("node:fs/promises");
				const entries = await fs.readdir(toolsDir);
				for (const entry of entries) {
					if (entry.endsWith(".ts")) {
						await rm(join(toolsDir, entry));
					}
				}
			}

			const { stdout } = await execAsync(`node "${cliPath}" list tools`, {
				cwd: projectDir,
			});

			expect(stdout).toContain("No tools found");
		});
	});

	describe("Table output format", () => {
		it("should include summary statistics", async () => {
			await addToolToProject(projectDir, "stat-tool-1", { registered: true });
			await addToolToProject(projectDir, "stat-tool-2", {
				hasUnitTest: true,
				hasIntegrationTest: true,
			});

			const { stdout } = await execAsync(`node "${cliPath}" list tools`, {
				cwd: projectDir,
			});

			expect(stdout).toContain("Summary:");
			expect(stdout).toContain("Registered:");
			expect(stdout).toContain("Unit tests:");
			expect(stdout).toContain("Integration tests:");
		});

		it("should show tool descriptions when available", async () => {
			await addToolToProject(projectDir, "described-tool", {
				description: "This is a detailed description",
			});

			const { stdout } = await execAsync(`node "${cliPath}" list tools`, {
				cwd: projectDir,
			});

			expect(stdout).toContain("described-tool");
			expect(stdout).toContain("This is a detailed description");
		});

		it("should include column headers", async () => {
			const { stdout } = await execAsync(`node "${cliPath}" list tools`, {
				cwd: projectDir,
			});

			expect(stdout).toContain("NAME");
			expect(stdout).toContain("REG");
			expect(stdout).toContain("UNIT");
			expect(stdout).toContain("INT");
			expect(stdout).toContain("FILE");
		});
	});
});

describe("list tools command - Direct Function Tests", () => {
	describe("toKebabCase()", () => {
		it("should convert PascalCase to kebab-case", async () => {
			const { toKebabCase } = await import(
				"@/core/commands/list-tools.js"
			);

			expect(toKebabCase("TestTool")).toBe("test-tool");
			expect(toKebabCase("APIClient")).toBe("a-p-i-client");
			expect(toKebabCase("HTMLParser")).toBe("h-t-m-l-parser");
		});

		it("should handle single word", async () => {
			const { toKebabCase } = await import(
				"@/core/commands/list-tools.js"
			);

			expect(toKebabCase("Tool")).toBe("tool");
		});

		it("should handle already kebab-case", async () => {
			const { toKebabCase } = await import(
				"@/core/commands/list-tools.js"
			);

			expect(toKebabCase("test-tool")).toBe("test-tool");
		});

		it("should not add leading hyphen", async () => {
			const { toKebabCase } = await import(
				"@/core/commands/list-tools.js"
			);

			expect(toKebabCase("Test")).toBe("test");
			expect(toKebabCase("T")).toBe("t");
		});
	});

	describe("filterTools()", () => {
		const mockTools = [
			{
				name: "registered-tested",
				file: "src/tools/registered-tested.ts",
				registered: true,
				hasUnitTest: true,
				hasIntegrationTest: true,
			},
			{
				name: "registered-untested",
				file: "src/tools/registered-untested.ts",
				registered: true,
				hasUnitTest: false,
				hasIntegrationTest: false,
			},
			{
				name: "unregistered-tested",
				file: "src/tools/unregistered-tested.ts",
				registered: false,
				hasUnitTest: true,
				hasIntegrationTest: false,
			},
			{
				name: "unregistered-untested",
				file: "src/tools/unregistered-untested.ts",
				registered: false,
				hasUnitTest: false,
				hasIntegrationTest: false,
			},
		];

		it("should filter registered tools", async () => {
			const { filterTools } = await import(
				"@/core/commands/list-tools.js"
			);

			const result = filterTools(mockTools, "registered");

			expect(result).toHaveLength(2);
			expect(result.every((t) => t.registered)).toBe(true);
		});

		it("should filter unregistered tools", async () => {
			const { filterTools } = await import(
				"@/core/commands/list-tools.js"
			);

			const result = filterTools(mockTools, "unregistered");

			expect(result).toHaveLength(2);
			expect(result.every((t) => !t.registered)).toBe(true);
		});

		it("should filter tested tools", async () => {
			const { filterTools } = await import(
				"@/core/commands/list-tools.js"
			);

			const result = filterTools(mockTools, "tested");

			expect(result).toHaveLength(2);
			expect(
				result.every((t) => t.hasUnitTest || t.hasIntegrationTest),
			).toBe(true);
		});

		it("should filter untested tools", async () => {
			const { filterTools } = await import(
				"@/core/commands/list-tools.js"
			);

			const result = filterTools(mockTools, "untested");

			expect(result).toHaveLength(2);
			expect(
				result.every((t) => !t.hasUnitTest && !t.hasIntegrationTest),
			).toBe(true);
		});

		it("should return all tools for 'all' filter", async () => {
			const { filterTools } = await import(
				"@/core/commands/list-tools.js"
			);

			const result = filterTools(mockTools, "all");

			expect(result).toHaveLength(4);
		});

		it("should return all tools for unknown filter", async () => {
			const { filterTools } = await import(
				"@/core/commands/list-tools.js"
			);

			const result = filterTools(mockTools, "unknown");

			expect(result).toHaveLength(4);
		});
	});

	describe("checkToolRegistrations()", () => {
		let tempDir: string;

		beforeEach(async () => {
			tempDir = await mkdtemp(join(tmpdir(), "list-tools-test-"));
		});

		afterEach(async () => {
			if (tempDir && existsSync(tempDir)) {
				await rm(tempDir, { recursive: true, force: true });
			}
		});

		it("should detect registered tools from index.ts", async () => {
			const { checkToolRegistrations } = await import(
				"@/core/commands/list-tools.js"
			);

			const indexPath = join(tempDir, "index.ts");
			const indexContent = `
import { registerTestTool } from "./tools/test.js";
import { registerAnotherTool } from "./tools/another.js";

export class MyServer {
  async init() {
    registerTestTool(this.server);
    registerAnotherTool(this.server);
  }
}
`;
			await writeFile(indexPath, indexContent, "utf-8");

			const registered = await checkToolRegistrations(indexPath);

			// registerTestTool extracts "Test" → toKebabCase → "test"
			// registerAnotherTool extracts "Another" → toKebabCase → "another"
			expect(registered).toContain("test");
			expect(registered).toContain("another");
			expect(registered).toHaveLength(2);
		});

		it("should handle hyphenated tool names correctly", async () => {
			const { checkToolRegistrations } = await import(
				"@/core/commands/list-tools.js"
			);

			const indexPath = join(tempDir, "index.ts");
			const indexContent = `
import { registerApiClientTool } from "./tools/api-client.js";

export class MyServer {
  async init() {
    registerApiClientTool(this.server);
  }
}
`;
			await writeFile(indexPath, indexContent, "utf-8");

			const registered = await checkToolRegistrations(indexPath);

			expect(registered).toContain("api-client");
		});

		it("should return empty array for missing file", async () => {
			const { checkToolRegistrations } = await import(
				"@/core/commands/list-tools.js"
			);

			const registered = await checkToolRegistrations(
				join(tempDir, "nonexistent.ts"),
			);

			expect(registered).toEqual([]);
		});

		it("should return empty array for file with no registrations", async () => {
			const { checkToolRegistrations } = await import(
				"@/core/commands/list-tools.js"
			);

			const indexPath = join(tempDir, "index.ts");
			const indexContent = `
export class MyServer {
  async init() {
    // No tool registrations
  }
}
`;
			await writeFile(indexPath, indexContent, "utf-8");

			const registered = await checkToolRegistrations(indexPath);

			expect(registered).toEqual([]);
		});
	});

	describe("discoverTools()", () => {
		let projectDir: string;

		beforeEach(async () => {
			projectDir = await createTestProject();
		});

		afterEach(async () => {
			if (projectDir && existsSync(projectDir)) {
				await rm(projectDir, { recursive: true, force: true });
			}
		});

		it("should discover tools in src/tools/ directory", async () => {
			const { discoverTools } = await import(
				"@/core/commands/list-tools.js"
			);

			await addToolToProject(projectDir, "discovery-tool");

			const tools = await discoverTools(projectDir);

			expect(tools.some((t) => t.name === "discovery-tool")).toBe(true);
		});

		it("should exclude example tools by default", async () => {
			const { discoverTools } = await import(
				"@/core/commands/list-tools.js"
			);

			// Create example tool
			const examplePath = join(projectDir, "src", "tools", "_example.ts");
			const exampleContent = `
export function registerExampleTool(server: any): void {}
`;
			await writeFile(examplePath, exampleContent, "utf-8");

			const tools = await discoverTools(projectDir, false);

			expect(tools.some((t) => t.name === "_example")).toBe(false);
		});

		it("should include example tools when includeExamples is true", async () => {
			const { discoverTools } = await import(
				"@/core/commands/list-tools.js"
			);

			// Create example tool
			const examplePath = join(projectDir, "src", "tools", "_example.ts");
			const exampleContent = `
export function registerExampleTool(server: any): void {}
`;
			await writeFile(examplePath, exampleContent, "utf-8");

			const tools = await discoverTools(projectDir, true);

			expect(tools.some((t) => t.name === "_example")).toBe(true);
		});

		it("should detect registration status", async () => {
			const { discoverTools } = await import(
				"@/core/commands/list-tools.js"
			);

			await addToolToProject(projectDir, "registered-discovery", {
				registered: true,
			});

			const tools = await discoverTools(projectDir);
			const tool = tools.find((t) => t.name === "registered-discovery");

			expect(tool).toBeDefined();
			expect(tool?.registered).toBe(true);
		});

		it("should detect unit test presence", async () => {
			const { discoverTools } = await import(
				"@/core/commands/list-tools.js"
			);

			await addToolToProject(projectDir, "unit-tested", {
				hasUnitTest: true,
			});

			const tools = await discoverTools(projectDir);
			const tool = tools.find((t) => t.name === "unit-tested");

			expect(tool).toBeDefined();
			expect(tool?.hasUnitTest).toBe(true);
		});

		it("should detect integration test presence", async () => {
			const { discoverTools } = await import(
				"@/core/commands/list-tools.js"
			);

			await addToolToProject(projectDir, "integration-tested", {
				hasIntegrationTest: true,
			});

			const tools = await discoverTools(projectDir);
			const tool = tools.find((t) => t.name === "integration-tested");

			expect(tool).toBeDefined();
			expect(tool?.hasIntegrationTest).toBe(true);
		});

		it("should extract description from tool file", async () => {
			const { discoverTools } = await import(
				"@/core/commands/list-tools.js"
			);

			await addToolToProject(projectDir, "described", {
				description: "This is my description",
			});

			const tools = await discoverTools(projectDir);
			const tool = tools.find((t) => t.name === "described");

			expect(tool).toBeDefined();
			expect(tool?.description).toBe("This is my description");
		});

		it("should handle tools with no description", async () => {
			const { discoverTools } = await import(
				"@/core/commands/list-tools.js"
			);

			// Create tool without description
			const toolPath = join(projectDir, "src", "tools", "no-desc.ts");
			const toolContent = `
export function registerNoDescTool(server: any): void {
  server.tool("no-desc", "", {}, async () => {
    return { content: [] };
  });
}
`;
			await writeFile(toolPath, toolContent, "utf-8");

			const tools = await discoverTools(projectDir);
			const tool = tools.find((t) => t.name === "no-desc");

			expect(tool).toBeDefined();
			expect(tool?.description).toBe("No description");
		});

		it("should throw error when src/tools/ directory not found", async () => {
			const { discoverTools } = await import(
				"@/core/commands/list-tools.js"
			);

			const tempDir = await mkdtemp(join(tmpdir(), "no-tools-"));

			try {
				await discoverTools(tempDir);
				expect.fail("Should have thrown an error");
			} catch (error: any) {
				expect(error.message).toContain("src/tools/ directory not found");
			} finally {
				await rm(tempDir, { recursive: true, force: true });
			}
		});
	});
});
