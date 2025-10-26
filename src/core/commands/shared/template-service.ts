/**
 * Template Service
 *
 * Handles file content generation from templates
 * Shared logic for generating entity files, unit tests, and integration tests
 */

/**
 * Configuration for template generation
 */
export interface TemplateConfig {
	/** Entity type (tool, prompt, resource) */
	entityType: "tool" | "prompt" | "resource";
	/** Entity name in kebab-case */
	name: string;
	/** Entity name in PascalCase */
	capitalizedName: string;
	/** Description of the entity */
	description: string;
}

/**
 * Resource-specific template options
 */
export interface ResourceTemplateOptions extends TemplateConfig {
	/** URI pattern for the resource */
	uriPattern: string;
}

/**
 * Service for generating entity file content from templates
 */
export class TemplateService {
	/**
	 * Generate tool file content
	 */
	generateToolFile(config: TemplateConfig): string {
		const { name, capitalizedName, description } = config;

		return `/**
 * ${capitalizedName} Tool
 *
 * ${description}
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// TODO: Define your parameter schema
// Example:
// const ${capitalizedName}ParamsSchema = z.object({
//   message: z.string().describe("Your message"),
//   count: z.number().int().positive().optional().describe("Repeat count"),
// });

const ${capitalizedName}ParamsSchema = z.object({
	// Add your parameters here
});

/**
 * Register ${name} tool with the MCP server
 */
export function register${capitalizedName}Tool(server: McpServer): void {
	server.tool(
		"${name}",
		"${description}",
		${capitalizedName}ParamsSchema.shape,
		async (params) => {
			// TODO: Implement your tool logic here
			// You can access params like: params.message, params.count, etc.

			// Example: Return a simple response
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(
							{
								result: "not implemented",
								params,
							},
							null,
							2,
						),
					},
				],
			};

			// Example: Handle errors with inline pattern
			// try {
			//   const result = await yourLogic();
			//   return {
			//     content: [{
			//       type: "text" as const,
			//       text: JSON.stringify(result, null, 2),
			//     }],
			//   };
			// } catch (error) {
			//   return {
			//     content: [{
			//       type: "text" as const,
			//       text: JSON.stringify({
			//         error: true,
			//         message: error instanceof Error ? error.message : String(error),
			//       }, null, 2),
			//     }],
			//     isError: true,
			//   };
			// }
		},
	);
}
`;
	}

	/**
	 * Generate prompt file content
	 */
	generatePromptFile(config: TemplateConfig): string {
		const { name, capitalizedName, description } = config;

		return `/**
 * ${capitalizedName} Prompt
 *
 * ${description}
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// TODO: Define your argument schema
// Example:
// const ${capitalizedName}ArgsSchema = z.object({
//   language: z.string().optional().describe("Programming language"),
//   topic: z.string().describe("Topic to explain"),
// });

const ${capitalizedName}ArgsSchema = z.object({
	// Add your arguments here
});

/**
 * Register ${name} prompt with the MCP server
 */
export function register${capitalizedName}Prompt(server: McpServer): void {
	server.prompt(
		"${name}",
		"${description}",
		${capitalizedName}ArgsSchema.shape,
		async (args) => {
			// TODO: Implement your prompt logic here
			// You can access args like: args.language, args.topic, etc.

			// Example: Return a simple prompt
			const promptText = \`You are a helpful assistant.

TODO: Replace this with your actual prompt template.

Example with args:
- Language: \${args.language || "any"}
- Topic: \${args.topic || "general"}
\`;

			return {
				messages: [
					{
						role: "user",
						content: {
							type: "text",
							text: promptText,
						},
					},
				],
			};
		},
	);
}
`;
	}

	/**
	 * Generate resource file content
	 */
	generateResourceFile(config: ResourceTemplateOptions): string {
		const { name, capitalizedName, description, uriPattern } = config;

		const hasVariables = uriPattern.includes("{") && uriPattern.includes("}");

		// Extract variable names from pattern
		const variables = hasVariables
			? Array.from(uriPattern.matchAll(/\{(\w+)\}/g)).map((m) => m[1])
			: [];

		// Generate appropriate imports
		const imports = hasVariables
			? `import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";\nimport { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";`
			: `import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";`;

		// Generate ResourceTemplate wrapper if needed
		const uriPatternCode = hasVariables
			? `new ResourceTemplate("${uriPattern}", {\n\t\t\t// TODO: Implement list callback to return available resources\n\t\t\tlist: async () => {\n\t\t\t\t// Example: return { resources: [{ uri: "...", name: "...", description: "..." }] };\n\t\t\t\treturn { resources: [] };\n\t\t\t},\n\t\t\t// TODO: Implement autocomplete for template variables\n\t\t\tcomplete: {\n${variables.map((v) => `\t\t\t\t${v}: async (value) => {\n\t\t\t\t\t// Return suggestions for ${v}\n\t\t\t\t\treturn [];\n\t\t\t\t}`).join(",\n")}\n\t\t\t}\n\t\t})`
			: `"${uriPattern}"`;

		// Handler signature depends on whether we have variables
		const handlerSignature = hasVariables
			? "async (uri, variables)"
			: "async (uri)";

		// Parameter extraction comment and code
		const paramExtractionComment = hasVariables
			? `\t\t\t// Extract parameters from ResourceTemplate variables\n${variables.map((v) => `\t\t\tconst ${v} = variables.${v} as string;`).join("\n")}`
			: `\t\t\t// Static resource - no parameters to extract\n\t\t\t// The uri parameter is a URL object with parsed components`;

		const exampleData = hasVariables
			? `{\n\t\t\t\t\tresource: "${name}",\n\t\t\t\t\turi: uri.href,\n${variables.map((v) => `\t\t\t\t\t${v}: ${v}`).join(",\n")},\n\t\t\t\t\tmessage: "Replace this with your actual resource data"\n\t\t\t\t}`
			: `{\n\t\t\t\t\tresource: "${name}",\n\t\t\t\t\turi: uri.href,\n\t\t\t\t\tmessage: "Replace this with your actual resource data"\n\t\t\t\t}`;

		return `/**
 * ${capitalizedName} Resource
 *
 * ${description}
 *
 * ${hasVariables ? `⚠️  DYNAMIC RESOURCE (uses ResourceTemplate)\n * This resource has template variables: ${variables.join(", ")}\n * URI pattern: ${uriPattern}` : `✓ STATIC RESOURCE (fixed URI)\n * URI pattern: ${uriPattern}`}
 */

${imports}

/**
 * Register ${name} resource with the MCP server
 */
export function register${capitalizedName}Resource(server: McpServer): void {
	server.resource(
		"${name}",
		${uriPatternCode},
		{
			description: "${description}",
			mimeType: "application/json", // TODO: Update MIME type as needed
		},
		${handlerSignature} => {
${paramExtractionComment}

			// TODO: Replace this example data with your actual resource logic
			// Common patterns:
			// - Read from KV: await env.MY_KV.get(${hasVariables ? variables[0] : "key"})
			// - Query D1: await env.MY_DB.prepare("SELECT * FROM table WHERE id = ?").bind(${hasVariables ? variables[0] : "id"}).first()
			// - Fetch external API: await fetch(\`https://api.example.com/\${${hasVariables ? variables[0] : "id"}}\`)

			const exampleData = ${exampleData};

			return {
				contents: [
					{
						uri: uri.href,
						text: JSON.stringify(exampleData, null, 2),
						mimeType: "application/json",
					},
				],
			};

			// Example: Handle errors
			// try {
			//   const data = await fetchResourceData(id);
			//   return {
			//     contents: [{
			//       uri: uri.href,
			//       text: JSON.stringify(data, null, 2),
			//       mimeType: "application/json",
			//     }],
			//   };
			// } catch (error) {
			//   throw new Error(\`Failed to load resource: \${error}\`);
			// }
		},
	);
}
`;
	}

	/**
	 * Generate entity file content based on entity type
	 */
	generateEntityFile(
		config: TemplateConfig | ResourceTemplateOptions,
	): string {
		switch (config.entityType) {
			case "tool":
				return this.generateToolFile(config);
			case "prompt":
				return this.generatePromptFile(config);
			case "resource":
				if (!("uriPattern" in config)) {
					throw new Error("Resource template config must include uriPattern");
				}
				return this.generateResourceFile(config);
			default:
				throw new Error(`Unknown entity type: ${(config as TemplateConfig).entityType}`);
		}
	}

	/**
	 * Generate unit test file content
	 */
	generateUnitTestFile(config: TemplateConfig): string {
		const { entityType, name, capitalizedName } = config;
		const entityTypePlural = `${entityType}s`;
		const functionSuffix =
			entityType.charAt(0).toUpperCase() + entityType.slice(1);

		return `/**
 * ${capitalizedName} ${functionSuffix} - Unit Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { register${capitalizedName}${functionSuffix} } from "../../../src/${entityTypePlural}/${name}.js";

describe("${name} ${entityType}", () => {
	let server: McpServer;

	beforeEach(() => {
		server = new McpServer({
			name: "test-server",
			version: "1.0.0",
		});
		register${capitalizedName}${functionSuffix}(server);
	});

	it("should register the ${entityType}", () => {
		// TODO: Verify ${entityType} is registered
		expect(server).toBeDefined();
	});

	${entityType === "tool" ? this.generateToolTestCases(name) : ""}${entityType === "prompt" ? this.generatePromptTestCases(name) : ""}${entityType === "resource" ? this.generateResourceTestCases(name) : ""}
});
`;
	}

	/**
	 * Generate tool-specific test cases
	 */
	private generateToolTestCases(name: string): string {
		return `
	it("should handle valid parameters", async () => {
		// TODO: Test with valid parameters
		// Example:
		// const result = await callTool(server, "${name}", { /* params */ });
		// expect(result.content[0].text).toContain("expected");
	});

	it("should validate parameters", async () => {
		// TODO: Test parameter validation
		// Example: Test with missing required params, invalid types, etc.
	});

	it("should handle errors gracefully", async () => {
		// TODO: Test error handling
	});`;
	}

	/**
	 * Generate prompt-specific test cases
	 */
	private generatePromptTestCases(name: string): string {
		return `
	it("should handle valid arguments", async () => {
		// TODO: Test with valid arguments
		// Example:
		// const result = await getPrompt(server, "${name}", { /* args */ });
		// expect(result.messages[0].content.text).toContain("expected");
	});

	it("should validate arguments", async () => {
		// TODO: Test argument validation
	});

	it("should handle errors gracefully", async () => {
		// TODO: Test error handling
	});`;
	}

	/**
	 * Generate resource-specific test cases
	 */
	private generateResourceTestCases(name: string): string {
		return `
	it("should handle valid URIs", async () => {
		// TODO: Test with valid URIs
		// Example:
		// const result = await readResource(server, "resource://test-id");
		// expect(result.contents[0].text).toContain("expected");
	});

	it("should handle resource parameters", async () => {
		// TODO: Test URI parameter extraction
	});

	it("should handle errors gracefully", async () => {
		// TODO: Test error handling
	});`;
	}

	/**
	 * Generate integration test YAML content
	 */
	generateIntegrationTestYaml(config: TemplateConfig | ResourceTemplateOptions): string {
		const { entityType, name, description } = config;

		if (entityType === "tool") {
			return this.generateToolIntegrationYaml(name, description);
		} else if (entityType === "prompt") {
			return this.generatePromptIntegrationYaml(name, description);
		} else if (entityType === "resource") {
			const uriPattern = (config as ResourceTemplateOptions).uriPattern;
			return this.generateResourceIntegrationYaml(name, description, uriPattern);
		}

		throw new Error(`Unknown entity type: ${entityType}`);
	}

	/**
	 * Generate tool integration test YAML
	 */
	private generateToolIntegrationYaml(name: string, description: string): string {
		return `name: "${name.replace(/_/g, " ")} - Basic"
description: "${description || `Verify that ${name} tool works correctly`}"
tool: "${name}"
arguments:
  # TODO: Add test arguments
  # Example:
  # message: "test message"

assertions:
  - type: "success"
  - type: "response_time_ms"
    max: 5000
  # TODO: Add more assertions
  # - type: "contains_text"
  #   text: "expected output"
  # - type: "json_path"
  #   path: "$.result"
  #   expected: "expected value"
`;
	}

	/**
	 * Generate prompt integration test YAML
	 */
	private generatePromptIntegrationYaml(
		name: string,
		description: string,
	): string {
		return `type: "prompt"
name: "${name.replace(/_/g, " ")} - Basic"
description: "${description || `Verify that ${name} prompt works correctly`}"
prompt: "${name}"
arguments:
  # TODO: Add test arguments
  # Example:
  # language: "python"

assertions:
  # Verify the prompt request succeeds
  - type: "success"

  # Check response time (adjust max value as needed)
  - type: "response_time_ms"
    max: 5000

  # Example: Verify prompt content contains expected text
  # - type: "contains_text"
  #   text: "expected instruction or keyword"

  # Example: Check message structure with JSON path
  # - type: "json_path"
  #   path: "$.messages[0].role"
  #   expected: "user"
`;
	}

	/**
	 * Generate resource integration test YAML
	 */
	private generateResourceIntegrationYaml(
		name: string,
		description: string,
		uriPattern: string,
	): string {
		return `type: "resource"
name: "${name.replace(/_/g, " ")} - Basic"
description: "${description || "Test resource"}"
uri: "${uriPattern}"
# Note: URI pattern is "${uriPattern}"
# Adjust the test URI above to use realistic values for your resource

assertions:
  # Verify the resource read succeeds
  - type: "success"

  # Check response time (adjust max value as needed)
  - type: "response_time_ms"
    max: 5000

  # Example: Verify resource content contains expected text
  # - type: "contains_text"
  #   text: "expected data or keyword"

  # Example: Verify resource content structure with JSON path
  # - type: "json_path"
  #   path: "$.contents[0].mimeType"
  #   expected: "application/json"

  # Example: Check if specific fields exist
  # - type: "json_path"
  #   path: "$.contents[0].text"
  #   exists: true

  # Example: Verify content matches pattern
  # - type: "json_path"
  #   path: "$.contents[0].uri"
  #   contains: "${uriPattern.replace(/\{[^}]+\}/g, "")}"
`;
	}
}
