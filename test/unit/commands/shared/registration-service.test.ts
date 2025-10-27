/**
 * RegistrationService - Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { RegistrationService } from "@/core/commands/shared/registration-service.js";
import type { RegistrationConfig } from "@/core/commands/shared/registration-service.js";

describe("RegistrationService", () => {
	let tempDir: string;
	let service: RegistrationService;

	beforeEach(async () => {
		tempDir = join("/tmp", `registration-test-${Date.now()}`);
		await mkdir(tempDir, { recursive: true });
		await mkdir(join(tempDir, "src"), { recursive: true });
		service = new RegistrationService();
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	const toolConfig: RegistrationConfig = {
		entityType: "tool",
		entityTypePlural: "tools",
		directory: "./tools/",
		functionSuffix: "Tool",
	};

	const promptConfig: RegistrationConfig = {
		entityType: "prompt",
		entityTypePlural: "prompts",
		directory: "./prompts/",
		functionSuffix: "Prompt",
	};

	const resourceConfig: RegistrationConfig = {
		entityType: "resource",
		entityTypePlural: "resources",
		directory: "./resources/",
		functionSuffix: "Resource",
	};

	describe("registerEntity", () => {
		it("should throw error when index.ts does not exist", async () => {
			await expect(
				service.registerEntity(tempDir, "my-tool", "MyTool", toolConfig),
			).rejects.toThrow("src/index.ts not found");
		});

		it("should register a tool in empty index.ts", async () => {
			const indexPath = join(tempDir, "src", "index.ts");
			const initialContent = `
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
			await writeFile(indexPath, initialContent, "utf-8");

			await service.registerEntity(tempDir, "my-tool", "MyTool", toolConfig);

			const result = await readFile(indexPath);
			expect(result).toContain('import { registerMyToolTool } from "./tools/my-tool.js";');
			expect(result).toContain("registerMyToolTool(this.server);");
		});

		it("should register a prompt in empty index.ts", async () => {
			const indexPath = join(tempDir, "src", "index.ts");
			const initialContent = `
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
			await writeFile(indexPath, initialContent, "utf-8");

			await service.registerEntity(
				tempDir,
				"my-prompt",
				"MyPrompt",
				promptConfig,
			);

			const result = await readFile(indexPath);
			expect(result).toContain(
				'import { registerMyPromptPrompt } from "./prompts/my-prompt.js";',
			);
			expect(result).toContain("registerMyPromptPrompt(this.server);");
		});

		it("should register a resource in empty index.ts", async () => {
			const indexPath = join(tempDir, "src", "index.ts");
			const initialContent = `
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
			await writeFile(indexPath, initialContent, "utf-8");

			await service.registerEntity(
				tempDir,
				"my-resource",
				"MyResource",
				resourceConfig,
			);

			const result = await readFile(indexPath);
			expect(result).toContain(
				'import { registerMyResourceResource } from "./resources/my-resource.js";',
			);
			expect(result).toContain("registerMyResourceResource(this.server);");
		});

		it("should add tool import after existing tool imports", async () => {
			const indexPath = join(tempDir, "src", "index.ts");
			const initialContent = `
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerHealthTool } from "./tools/health.js";
import { registerEchoTool } from "./tools/echo.js";

export class MCPServerAgent extends McpAgent<Env> {
	server = new McpServer({
		name: "test-server",
		version: "1.0.0",
	});

	async init() {
		registerHealthTool(this.server);
		registerEchoTool(this.server);
	}
}
`.trim();
			await writeFile(indexPath, initialContent, "utf-8");

			await service.registerEntity(tempDir, "my-tool", "MyTool", toolConfig);

			const result = await readFile(indexPath);
			const lines = result.split("\n");

			// Find import lines
			const healthImportIdx = lines.findIndex((l) =>
				l.includes("registerHealthTool"),
			);
			const echoImportIdx = lines.findIndex((l) =>
				l.includes("registerEchoTool"),
			);
			const myToolImportIdx = lines.findIndex((l) =>
				l.includes("registerMyToolTool"),
			);

			// New import should be after existing tool imports
			expect(myToolImportIdx).toBeGreaterThan(echoImportIdx);
			expect(myToolImportIdx).toBeGreaterThan(healthImportIdx);
		});

		it("should add tool registration call after existing tool calls", async () => {
			const indexPath = join(tempDir, "src", "index.ts");
			const initialContent = `
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerHealthTool } from "./tools/health.js";
import { registerEchoTool } from "./tools/echo.js";

export class MCPServerAgent extends McpAgent<Env> {
	server = new McpServer({
		name: "test-server",
		version: "1.0.0",
	});

	async init() {
		registerHealthTool(this.server);
		registerEchoTool(this.server);
	}
}
`.trim();
			await writeFile(indexPath, initialContent, "utf-8");

			await service.registerEntity(tempDir, "my-tool", "MyTool", toolConfig);

			const result = await readFile(indexPath);
			const lines = result.split("\n");

			// Find registration call lines
			const healthCallIdx = lines.findIndex(
				(l) => l.includes("registerHealthTool(this.server)") && !l.includes("import"),
			);
			const echoCallIdx = lines.findIndex(
				(l) => l.includes("registerEchoTool(this.server)") && !l.includes("import"),
			);
			const myToolCallIdx = lines.findIndex(
				(l) => l.includes("registerMyToolTool(this.server)") && !l.includes("import"),
			);

			// New call should be after existing tool calls
			expect(myToolCallIdx).toBeGreaterThan(echoCallIdx);
			expect(myToolCallIdx).toBeGreaterThan(healthCallIdx);
		});

		it("should add prompt import after tool imports when no prompt imports exist", async () => {
			const indexPath = join(tempDir, "src", "index.ts");
			const initialContent = `
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerHealthTool } from "./tools/health.js";

export class MCPServerAgent extends McpAgent<Env> {
	server = new McpServer({
		name: "test-server",
		version: "1.0.0",
	});

	async init() {
		registerHealthTool(this.server);
	}
}
`.trim();
			await writeFile(indexPath, initialContent, "utf-8");

			await service.registerEntity(
				tempDir,
				"my-prompt",
				"MyPrompt",
				promptConfig,
			);

			const result = await readFile(indexPath);

			// Should have a "Prompts" comment section
			expect(result).toContain("// Prompts");
			expect(result).toContain(
				'import { registerMyPromptPrompt } from "./prompts/my-prompt.js";',
			);

			const lines = result.split("\n");
			const toolImportIdx = lines.findIndex((l) =>
				l.includes("registerHealthTool"),
			);
			const promptCommentIdx = lines.findIndex((l) => l.includes("// Prompts"));
			const promptImportIdx = lines.findIndex((l) =>
				l.includes("registerMyPromptPrompt"),
			);

			// Prompt section should come after tool imports
			expect(promptCommentIdx).toBeGreaterThan(toolImportIdx);
			expect(promptImportIdx).toBeGreaterThan(promptCommentIdx);
		});

		it("should add resource import after prompt imports when no resource imports exist", async () => {
			const indexPath = join(tempDir, "src", "index.ts");
			const initialContent = `
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerHealthTool } from "./tools/health.js";

// Prompts
import { registerMyPromptPrompt } from "./prompts/my-prompt.js";

export class MCPServerAgent extends McpAgent<Env> {
	server = new McpServer({
		name: "test-server",
		version: "1.0.0",
	});

	async init() {
		registerHealthTool(this.server);
		registerMyPromptPrompt(this.server);
	}
}
`.trim();
			await writeFile(indexPath, initialContent, "utf-8");

			await service.registerEntity(
				tempDir,
				"my-resource",
				"MyResource",
				resourceConfig,
			);

			const result = await readFile(indexPath);

			// Should have a "Resources" comment section
			expect(result).toContain("// Resources");
			expect(result).toContain(
				'import { registerMyResourceResource } from "./resources/my-resource.js";',
			);

			const lines = result.split("\n");
			const promptImportIdx = lines.findIndex((l) =>
				l.includes("registerMyPromptPrompt"),
			);
			const resourceCommentIdx = lines.findIndex((l) =>
				l.includes("// Resources"),
			);
			const resourceImportIdx = lines.findIndex((l) =>
				l.includes("registerMyResourceResource"),
			);

			// Resource section should come after prompt imports
			expect(resourceCommentIdx).toBeGreaterThan(promptImportIdx);
			expect(resourceImportIdx).toBeGreaterThan(resourceCommentIdx);
		});

		it("should warn when entity is already registered", async () => {
			const indexPath = join(tempDir, "src", "index.ts");
			const initialContent = `
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerMyToolTool } from "./tools/my-tool.js";

export class MCPServerAgent extends McpAgent<Env> {
	server = new McpServer({
		name: "test-server",
		version: "1.0.0",
	});

	async init() {
		registerMyToolTool(this.server);
	}
}
`.trim();
			await writeFile(indexPath, initialContent, "utf-8");

			// Mock console.warn to check for warning
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			await service.registerEntity(tempDir, "my-tool", "MyTool", toolConfig);

			expect(warnSpy).toHaveBeenCalledWith(
				expect.stringContaining("already registered"),
			);

			warnSpy.mockRestore();
		});

		it("should handle complex index.ts with multiple entity types", async () => {
			const indexPath = join(tempDir, "src", "index.ts");
			const initialContent = `
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTestToolTool } from "./tools/test-tool.js";
import { registerExamplePromptPrompt } from "./prompts/example-prompt.js";
import { registerSampleResourceResource } from "./resources/sample-resource.js";

export class MCPServerAgent extends McpAgent<Env> {
	server = new McpServer({
		name: "test-server",
		version: "1.0.0",
	});

	async init() {
		// Register tools
		registerTestToolTool(this.server);

		// Register prompts
		registerExamplePromptPrompt(this.server);

		// Register resources
		registerSampleResourceResource(this.server);
	}
}
`.trim();
			await writeFile(indexPath, initialContent, "utf-8");

			await service.registerEntity(
				tempDir,
				"new-tool",
				"NewTool",
				toolConfig,
			);

			const result = await readFile(indexPath);

			// Should add after existing tools
			expect(result).toContain(
				'import { registerNewToolTool } from "./tools/new-tool.js";',
			);
			expect(result).toContain("registerNewToolTool(this.server);");

			const lines = result.split("\n");

			// Find existing tool imports
			const testToolImportIdx = lines.findIndex((l) =>
				l.includes("registerTestToolTool"),
			);
			const newToolImportIdx = lines.findIndex((l) =>
				l.includes("registerNewToolTool"),
			);

			// Should be after existing tools
			expect(newToolImportIdx).toBeGreaterThan(testToolImportIdx);
		});
	});

	describe("isRegistered", () => {
		it("should return false when index.ts does not exist", async () => {
			const result = await service.isRegistered(
				tempDir,
				"MyTool",
				toolConfig,
			);
			expect(result).toBe(false);
		});

		it("should return false when entity is not registered", async () => {
			const indexPath = join(tempDir, "src", "index.ts");
			const initialContent = `
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
			await writeFile(indexPath, initialContent, "utf-8");

			const result = await service.isRegistered(
				tempDir,
				"MyTool",
				toolConfig,
			);
			expect(result).toBe(false);
		});

		it("should return true when tool is registered", async () => {
			const indexPath = join(tempDir, "src", "index.ts");
			const initialContent = `
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerMyToolTool } from "./tools/my-tool.js";

export class MCPServerAgent extends McpAgent<Env> {
	server = new McpServer({
		name: "test-server",
		version: "1.0.0",
	});

	async init() {
		registerMyToolTool(this.server);
	}
}
`.trim();
			await writeFile(indexPath, initialContent, "utf-8");

			const result = await service.isRegistered(
				tempDir,
				"MyTool",
				toolConfig,
			);
			expect(result).toBe(true);
		});

		it("should return true when prompt is registered", async () => {
			const indexPath = join(tempDir, "src", "index.ts");
			const initialContent = `
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerMyPromptPrompt } from "./prompts/my-prompt.js";

export class MCPServerAgent extends McpAgent<Env> {
	server = new McpServer({
		name: "test-server",
		version: "1.0.0",
	});

	async init() {
		registerMyPromptPrompt(this.server);
	}
}
`.trim();
			await writeFile(indexPath, initialContent, "utf-8");

			const result = await service.isRegistered(
				tempDir,
				"MyPrompt",
				promptConfig,
			);
			expect(result).toBe(true);
		});

		it("should return true when resource is registered", async () => {
			const indexPath = join(tempDir, "src", "index.ts");
			const initialContent = `
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerMyResourceResource } from "./resources/my-resource.js";

export class MCPServerAgent extends McpAgent<Env> {
	server = new McpServer({
		name: "test-server",
		version: "1.0.0",
	});

	async init() {
		registerMyResourceResource(this.server);
	}
}
`.trim();
			await writeFile(indexPath, initialContent, "utf-8");

			const result = await service.isRegistered(
				tempDir,
				"MyResource",
				resourceConfig,
			);
			expect(result).toBe(true);
		});
	});
});

/**
 * Helper to read file content
 */
async function readFile(path: string): Promise<string> {
	const { readFile: fsReadFile } = await import("node:fs/promises");
	return fsReadFile(path, "utf-8");
}
