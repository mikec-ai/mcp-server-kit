/**
 * Add Tool Command
 *
 * Scaffolds a new MCP tool with:
 * - Tool file with TODO markers
 * - Unit test file structure
 * - Integration test YAML
 * - Auto-registration in src/index.ts
 */

import { Command } from "commander";
import { writeFile, readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { createAddPromptCommand } from "./add-prompt.js";
import { createAddResourceCommand } from "./add-resource.js";
import { toPascalCase } from "./shared/utils.js";
import { updateTemplateMetadata } from "./shared/metadata.js";

interface AddToolOptions {
	description?: string;
	tests: boolean;
	register: boolean;
	template: "simple" | "validated" | "async";
}

/**
 * Create the 'add tool' command
 */
export function createAddToolCommand(): Command {
	const command = new Command("tool")
		.description("Add a new MCP tool to the project")
		.argument("<name>", "Tool name (lowercase with hyphens)")
		.option(
			"--description <desc>",
			"Tool description",
			"TODO: Add description",
		)
		.option("--no-tests", "Skip test file generation")
		.option("--no-register", "Don't auto-register in index.ts")
		.option(
			"--template <type>",
			"Template type: simple|validated|async",
			"simple",
		)
		.action(async (name: string, options: AddToolOptions) => {
			try {
				console.log(`\n🔧 Adding tool: ${name}\n`);

				// Validate tool name
				if (!/^[a-z][a-z0-9-]*$/.test(name)) {
					throw new Error(
						"Tool name must be lowercase with hyphens (e.g., my-tool)",
					);
				}

				const cwd = process.cwd();

				// 1. Check if we're in a valid MCP project
				if (!existsSync(join(cwd, "package.json"))) {
					throw new Error("Not in a valid project directory (no package.json found)");
				}

				const capitalizedName = toPascalCase(name);

				// 2. Generate tool file
				const toolPath = join(cwd, "src", "tools", `${name}.ts`);
				if (existsSync(toolPath)) {
					throw new Error(`Tool already exists: ${toolPath}`);
				}

				const toolContent = generateToolFile(name, capitalizedName, options);
				await mkdir(join(cwd, "src", "tools"), { recursive: true });
				await writeFile(toolPath, toolContent, "utf-8");
				console.log(`✓ Created ${toolPath}`);

				// 3. Generate unit test (if enabled)
				if (options.tests) {
					const unitTestPath = join(cwd, "test", "unit", "tools", `${name}.test.ts`);
					const unitTestContent = generateUnitTestFile(name, capitalizedName);
					await mkdir(join(cwd, "test", "unit", "tools"), { recursive: true });
					await writeFile(unitTestPath, unitTestContent, "utf-8");
					console.log(`✓ Created ${unitTestPath}`);

					// 4. Generate integration test YAML
					const integrationTestPath = join(
						cwd,
						"test",
						"integration",
						"specs",
						`${name}.yaml`,
					);
					const integrationTestContent = generateIntegrationTestYaml(
						name,
						options.description || "",
					);
					await mkdir(join(cwd, "test", "integration", "specs"), {
						recursive: true,
					});
					await writeFile(integrationTestPath, integrationTestContent, "utf-8");
					console.log(`✓ Created ${integrationTestPath}`);
				}

				// 5. Auto-register in src/index.ts (if enabled)
				if (options.register) {
					await registerToolInIndex(cwd, name, capitalizedName);
					console.log(`✓ Registered in src/index.ts`);
				}

				// 6. Update .mcp-template.json (if exists)
				await updateTemplateMetadata(cwd, "tools", name, `src/tools/${name}.ts`, options.tests);

				console.log(`\n✅ Tool '${name}' created successfully!\n`);
				console.log("Next steps:");
				console.log(`  1. Edit src/tools/${name}.ts and implement your logic`);
				console.log(`  2. Run 'npm test' to verify tests pass`);
				console.log(`  3. Run 'npm run validate' to check project health\n`);
			} catch (error) {
				console.error(
					`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`,
				);
				process.exit(1);
			}
		});

	return command;
}

/**
 * Generate tool file content
 */
function generateToolFile(
	name: string,
	capitalizedName: string,
	options: AddToolOptions,
): string {
	const description = options.description || "TODO: Add description";

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
 * Generate unit test file content
 */
function generateUnitTestFile(name: string, capitalizedName: string): string {
	return `/**
 * ${capitalizedName} Tool - Unit Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { register${capitalizedName}Tool } from "../../../src/tools/${name}.js";

describe("${name} tool", () => {
	let server: McpServer;

	beforeEach(() => {
		server = new McpServer({
			name: "test-server",
			version: "1.0.0",
		});
		register${capitalizedName}Tool(server);
	});

	it("should register the tool", () => {
		// TODO: Verify tool is registered
		expect(server).toBeDefined();
	});

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
	});
});
`;
}

/**
 * Generate integration test YAML content
 */
function generateIntegrationTestYaml(name: string, description: string): string {
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
 * Register tool in src/index.ts
 */
async function registerToolInIndex(
	cwd: string,
	name: string,
	capitalizedName: string,
): Promise<void> {
	const indexPath = join(cwd, "src", "index.ts");

	if (!existsSync(indexPath)) {
		throw new Error("src/index.ts not found");
	}

	const content = await readFile(indexPath, "utf-8");

	// Check if already registered
	if (content.includes(`register${capitalizedName}Tool`)) {
		console.warn(`  ⚠️  Tool already registered in src/index.ts`);
		return;
	}

	// Add import after other tool imports
	const importStatement = `import { register${capitalizedName}Tool } from "./tools/${name}.js";`;
	let updatedContent = content;

	// Find the last tool import and add after it
	const importRegex = /import\s+\{[^}]+\}\s+from\s+["']\.\/tools\/[^"']+["'];/g;
	const matches = Array.from(content.matchAll(importRegex));

	if (matches.length > 0) {
		const lastMatch = matches[matches.length - 1];
		const insertPos = lastMatch.index! + lastMatch[0].length;
		updatedContent =
			content.slice(0, insertPos) +
			`\n${importStatement}` +
			content.slice(insertPos);
	} else {
		// No existing tool imports, add after other imports
		const lastImportMatch = content.match(
			/import\s+[^;]+;(?=\s*\n\s*(?:\/\*|\/\/|\n|export|class))/g,
		);
		if (lastImportMatch) {
			const lastImport = lastImportMatch[lastImportMatch.length - 1];
			const insertPos = content.indexOf(lastImport) + lastImport.length;
			updatedContent =
				content.slice(0, insertPos) +
				`\n${importStatement}` +
				content.slice(insertPos);
		}
	}

	// Add registration call in init() method
	const registrationCall = `\t\tregister${capitalizedName}Tool(this.server);`;
	const initMethodRegex = /async\s+init\(\)\s*\{([^}]*)\}/;
	const initMatch = updatedContent.match(initMethodRegex);

	if (initMatch) {
		const initBody = initMatch[1];
		const lastRegisterCall = initBody.match(/\s+register\w+Tool\(this\.server\);/g);

		if (lastRegisterCall) {
			const lastCall = lastRegisterCall[lastRegisterCall.length - 1];
			const insertPos = initMatch.index! + initMatch[0].lastIndexOf(lastCall) + lastCall.length;
			updatedContent =
				updatedContent.slice(0, insertPos) +
				`\n${registrationCall}` +
				updatedContent.slice(insertPos);
		} else {
			// No existing register calls, add at start of init
			const insertPos = initMatch.index! + initMatch[0].indexOf("{") + 1;
			updatedContent =
				updatedContent.slice(0, insertPos) +
				`\n\t\t// Register all tools\n${registrationCall}` +
				updatedContent.slice(insertPos);
		}
	}

	await writeFile(indexPath, updatedContent, "utf-8");
}

/**
 * Create the 'add' command group
 */
export function createAddCommand(): Command {
	const addCmd = new Command("add")
		.description("Add components to your MCP server");

	addCmd.addCommand(createAddToolCommand());
	addCmd.addCommand(createAddPromptCommand());
	addCmd.addCommand(createAddResourceCommand());

	return addCmd;
}
