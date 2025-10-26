/**
 * TemplateService - Unit Tests
 */

import { describe, it, expect } from "vitest";
import {
	TemplateService,
	type TemplateConfig,
	type ResourceTemplateOptions,
} from "@/core/commands/shared/template-service.js";

describe("TemplateService", () => {
	let service: TemplateService;

	beforeEach(() => {
		service = new TemplateService();
	});

	const toolConfig: TemplateConfig = {
		entityType: "tool",
		name: "my-tool",
		capitalizedName: "MyTool",
		description: "Test tool description",
	};

	const promptConfig: TemplateConfig = {
		entityType: "prompt",
		name: "my-prompt",
		capitalizedName: "MyPrompt",
		description: "Test prompt description",
	};

	const staticResourceConfig: ResourceTemplateOptions = {
		entityType: "resource",
		name: "my-resource",
		capitalizedName: "MyResource",
		description: "Test resource description",
		uriPattern: "config://my-resource",
	};

	const dynamicResourceConfig: ResourceTemplateOptions = {
		entityType: "resource",
		name: "user-data",
		capitalizedName: "UserData",
		description: "User data resource",
		uriPattern: "user://{id}",
	};

	const multiVarResourceConfig: ResourceTemplateOptions = {
		entityType: "resource",
		name: "api-data",
		capitalizedName: "ApiData",
		description: "API data resource",
		uriPattern: "api://{userId}/{resourceId}",
	};

	describe("generateToolFile", () => {
		it("should generate valid tool file content", () => {
			const result = service.generateToolFile(toolConfig);

			expect(result).toContain("MyTool Tool");
			expect(result).toContain("Test tool description");
			expect(result).toContain('server.tool(');
			expect(result).toContain('"my-tool"');
			expect(result).toContain("MyToolParamsSchema");
			expect(result).toContain("registerMyToolTool");
			expect(result).toContain('import { z } from "zod"');
		});

		it("should include TODO comments", () => {
			const result = service.generateToolFile(toolConfig);

			expect(result).toContain("// TODO: Define your parameter schema");
			expect(result).toContain("// TODO: Implement your tool logic here");
		});

		it("should include example code patterns", () => {
			const result = service.generateToolFile(toolConfig);

			expect(result).toContain("// Example: Return a simple response");
			expect(result).toContain("// Example: Handle errors with inline pattern");
		});

		it("should include proper exports", () => {
			const result = service.generateToolFile(toolConfig);

			expect(result).toContain("export function registerMyToolTool");
		});
	});

	describe("generatePromptFile", () => {
		it("should generate valid prompt file content", () => {
			const result = service.generatePromptFile(promptConfig);

			expect(result).toContain("MyPrompt Prompt");
			expect(result).toContain("Test prompt description");
			expect(result).toContain('server.prompt(');
			expect(result).toContain('"my-prompt"');
			expect(result).toContain("MyPromptArgsSchema");
			expect(result).toContain("registerMyPromptPrompt");
		});

		it("should include prompt message structure", () => {
			const result = service.generatePromptFile(promptConfig);

			expect(result).toContain("messages: [");
			expect(result).toContain('role: "user"');
			expect(result).toContain('type: "text"');
		});

		it("should include TODO comments", () => {
			const result = service.generatePromptFile(promptConfig);

			expect(result).toContain("// TODO: Define your argument schema");
			expect(result).toContain("// TODO: Implement your prompt logic here");
		});
	});

	describe("generateResourceFile", () => {
		it("should generate static resource file content", () => {
			const result = service.generateResourceFile(staticResourceConfig);

			expect(result).toContain("MyResource Resource");
			expect(result).toContain("Test resource description");
			expect(result).toContain("✓ STATIC RESOURCE (fixed URI)");
			expect(result).toContain("config://my-resource");
			expect(result).toContain("registerMyResourceResource");
		});

		it("should not import ResourceTemplate for static resources", () => {
			const result = service.generateResourceFile(staticResourceConfig);

			expect(result).not.toContain("ResourceTemplate");
			expect(result).toContain(
				'import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";',
			);
		});

		it("should use async (uri) handler for static resources", () => {
			const result = service.generateResourceFile(staticResourceConfig);

			expect(result).toContain("async (uri) =>");
			expect(result).toContain("// Static resource - no parameters to extract");
		});

		it("should generate dynamic resource file content", () => {
			const result = service.generateResourceFile(dynamicResourceConfig);

			expect(result).toContain("⚠️  DYNAMIC RESOURCE (uses ResourceTemplate)");
			expect(result).toContain("user://{id}");
			expect(result).toContain("template variables: id");
		});

		it("should import ResourceTemplate for dynamic resources", () => {
			const result = service.generateResourceFile(dynamicResourceConfig);

			expect(result).toContain(
				'import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";',
			);
		});

		it("should use async (uri, variables) handler for dynamic resources", () => {
			const result = service.generateResourceFile(dynamicResourceConfig);

			expect(result).toContain("async (uri, variables) =>");
			expect(result).toContain("const id = variables.id as string;");
		});

		it("should include ResourceTemplate with list and complete", () => {
			const result = service.generateResourceFile(dynamicResourceConfig);

			expect(result).toContain('new ResourceTemplate("user://{id}"');
			expect(result).toContain("list: async ()");
			expect(result).toContain("complete: {");
			expect(result).toContain("id: async (value)");
		});

		it("should handle multiple variables", () => {
			const result = service.generateResourceFile(multiVarResourceConfig);

			expect(result).toContain("template variables: userId, resourceId");
			expect(result).toContain("const userId = variables.userId as string;");
			expect(result).toContain(
				"const resourceId = variables.resourceId as string;",
			);
			expect(result).toContain("userId: async (value)");
			expect(result).toContain("resourceId: async (value)");
		});

		it("should include variables in example data for dynamic resources", () => {
			const result = service.generateResourceFile(dynamicResourceConfig);

			expect(result).toContain("id: id");
		});

		it("should not include variables in example data for static resources", () => {
			const result = service.generateResourceFile(staticResourceConfig);

			expect(result).not.toContain("id: id");
		});
	});

	describe("generateEntityFile", () => {
		it("should delegate to generateToolFile for tools", () => {
			const result = service.generateEntityFile(toolConfig);

			expect(result).toContain("MyTool Tool");
			expect(result).toContain("registerMyToolTool");
		});

		it("should delegate to generatePromptFile for prompts", () => {
			const result = service.generateEntityFile(promptConfig);

			expect(result).toContain("MyPrompt Prompt");
			expect(result).toContain("registerMyPromptPrompt");
		});

		it("should delegate to generateResourceFile for resources", () => {
			const result = service.generateEntityFile(staticResourceConfig);

			expect(result).toContain("MyResource Resource");
			expect(result).toContain("registerMyResourceResource");
		});

		it("should throw error when resource config missing uriPattern", () => {
			const { uriPattern, ...configWithoutUri } = staticResourceConfig;
			const invalidConfig = configWithoutUri as unknown as TemplateConfig;

			expect(() => service.generateEntityFile(invalidConfig)).toThrow(
				"Resource template config must include uriPattern",
			);
		});

		it("should throw error for unknown entity type", () => {
			const invalidConfig = {
				...toolConfig,
				entityType: "invalid",
			} as unknown as TemplateConfig;

			expect(() => service.generateEntityFile(invalidConfig)).toThrow(
				"Unknown entity type",
			);
		});
	});

	describe("generateUnitTestFile", () => {
		it("should generate tool unit test file", () => {
			const result = service.generateUnitTestFile(toolConfig);

			expect(result).toContain("MyTool Tool - Unit Tests");
			expect(result).toContain('import { registerMyToolTool }');
			expect(result).toContain('from "../../../src/tools/my-tool.js"');
			expect(result).toContain('describe("my-tool tool"');
			expect(result).toContain("registerMyToolTool(server)");
		});

		it("should include tool-specific test cases", () => {
			const result = service.generateUnitTestFile(toolConfig);

			expect(result).toContain("should handle valid parameters");
			expect(result).toContain("should validate parameters");
			expect(result).toContain("should handle errors gracefully");
		});

		it("should generate prompt unit test file", () => {
			const result = service.generateUnitTestFile(promptConfig);

			expect(result).toContain("MyPrompt Prompt - Unit Tests");
			expect(result).toContain('import { registerMyPromptPrompt }');
			expect(result).toContain('from "../../../src/prompts/my-prompt.js"');
			expect(result).toContain('describe("my-prompt prompt"');
			expect(result).toContain("registerMyPromptPrompt(server)");
		});

		it("should include prompt-specific test cases", () => {
			const result = service.generateUnitTestFile(promptConfig);

			expect(result).toContain("should handle valid arguments");
			expect(result).toContain("should validate arguments");
		});

		it("should generate resource unit test file", () => {
			const result = service.generateUnitTestFile(staticResourceConfig);

			expect(result).toContain("MyResource Resource - Unit Tests");
			expect(result).toContain('import { registerMyResourceResource }');
			expect(result).toContain('from "../../../src/resources/my-resource.js"');
			expect(result).toContain('describe("my-resource resource"');
			expect(result).toContain("registerMyResourceResource(server)");
		});

		it("should include resource-specific test cases", () => {
			const result = service.generateUnitTestFile(staticResourceConfig);

			expect(result).toContain("should handle valid URIs");
			expect(result).toContain("should handle resource parameters");
		});

		it("should include common test setup", () => {
			const result = service.generateUnitTestFile(toolConfig);

			expect(result).toContain("let server: McpServer");
			expect(result).toContain("beforeEach(() => {");
			expect(result).toContain('name: "test-server"');
			expect(result).toContain("should register the tool");
		});
	});

	describe("generateIntegrationTestYaml", () => {
		it("should generate tool integration test YAML", () => {
			const result = service.generateIntegrationTestYaml(toolConfig);

			expect(result).toContain('name: "my-tool - Basic"');
			expect(result).toContain('tool: "my-tool"');
			expect(result).toContain("arguments:");
			expect(result).toContain('type: "success"');
			expect(result).toContain('type: "response_time_ms"');
			expect(result).toContain("max: 5000");
		});

		it("should include TODO comments in tool test", () => {
			const result = service.generateIntegrationTestYaml(toolConfig);

			expect(result).toContain("# TODO: Add test arguments");
			expect(result).toContain("# TODO: Add more assertions");
		});

		it("should generate prompt integration test YAML", () => {
			const result = service.generateIntegrationTestYaml(promptConfig);

			expect(result).toContain('type: "prompt"');
			expect(result).toContain('name: "my-prompt - Basic"');
			expect(result).toContain('prompt: "my-prompt"');
			expect(result).toContain("arguments:");
			expect(result).toContain('type: "success"');
		});

		it("should generate resource integration test YAML", () => {
			const result = service.generateIntegrationTestYaml(staticResourceConfig);

			expect(result).toContain('type: "resource"');
			expect(result).toContain('name: "my-resource - Basic"');
			expect(result).toContain('uri: "config://my-resource"');
			expect(result).toContain('type: "success"');
		});

		it("should include URI pattern in resource test comments", () => {
			const result = service.generateIntegrationTestYaml(staticResourceConfig);

			expect(result).toContain('# Note: URI pattern is "config://my-resource"');
		});

		it("should handle dynamic resource URI patterns", () => {
			const result = service.generateIntegrationTestYaml(dynamicResourceConfig);

			expect(result).toContain('uri: "user://{id}"');
			expect(result).toContain('# Note: URI pattern is "user://{id}"');
		});

		it("should use description in YAML", () => {
			const result = service.generateIntegrationTestYaml(toolConfig);

			expect(result).toContain('description: "Test tool description"');
		});

		it("should provide fallback description when not specified", () => {
			const configWithoutDesc = { ...toolConfig, description: "" };
			const result = service.generateIntegrationTestYaml(configWithoutDesc);

			expect(result).toContain("Verify that my-tool tool works correctly");
		});

		it("should handle underscores in names", () => {
			const configWithUnderscore = {
				...toolConfig,
				name: "my_special_tool",
			};
			const result = service.generateIntegrationTestYaml(configWithUnderscore);

			expect(result).toContain('name: "my special tool - Basic"');
		});
	});
});
