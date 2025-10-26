/**
 * Add Resource Command
 *
 * Scaffolds a new MCP resource with:
 * - Resource file with TODO markers
 * - Unit test file structure
 * - Integration test YAML
 * - Auto-registration in src/index.ts
 */

import { Command } from "commander";
import { writeFile, readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";

interface AddResourceOptions {
	description?: string;
	uriPattern?: string;
	static?: boolean;
	dynamic?: boolean;
	tests: boolean;
	register: boolean;
}

/**
 * Create the 'add resource' command
 */
export function createAddResourceCommand(): Command {
	const command = new Command("resource")
		.description("Add a new MCP resource to the project")
		.argument("<name>", "Resource name (lowercase with hyphens)")
		.option(
			"--description <desc>",
			"Resource description",
			"TODO: Add description",
		)
		.option(
			"--uri-pattern <pattern>",
			"URI pattern (e.g., 'user://{id}' for dynamic, 'config://app' for static)",
		)
		.option(
			"--static",
			"Explicitly create a static resource (fixed URI, no variables)",
		)
		.option(
			"--dynamic",
			"Create a dynamic resource (URI with template variables like {id})",
		)
		.option("--no-tests", "Skip test file generation")
		.option("--no-register", "Don't auto-register in index.ts")
		.action(async (name: string, options: AddResourceOptions) => {
			// Validate conflicting flags
			if (options.static && options.dynamic) {
				throw new Error("Cannot use both --static and --dynamic flags");
			}

			// Determine URI pattern based on flags and user input
			if (!options.uriPattern) {
				if (options.dynamic) {
					// Explicit dynamic
					options.uriPattern = "resource://{id}";
				} else {
					// Default to static (simpler, more common)
					options.uriPattern = `config://${name}`;
				}
			}
			try {
				console.log(`\n📦 Adding resource: ${name}\n`);

				// Validate resource name
				if (!/^[a-z][a-z0-9-]*$/.test(name)) {
					throw new Error(
						"Resource name must be lowercase with hyphens (e.g., my-resource)",
					);
				}

				const cwd = process.cwd();

				// 1. Check if we're in a valid MCP project
				if (!existsSync(join(cwd, "package.json"))) {
					throw new Error("Not in a valid project directory (no package.json found)");
				}

				const capitalizedName = toPascalCase(name);

				// 2. Generate resource file
				const resourcePath = join(cwd, "src", "resources", `${name}.ts`);
				if (existsSync(resourcePath)) {
					throw new Error(`Resource already exists: ${resourcePath}`);
				}

				const resourceContent = generateResourceFile(name, capitalizedName, options);
				await mkdir(join(cwd, "src", "resources"), { recursive: true });
				await writeFile(resourcePath, resourceContent, "utf-8");
				console.log(`✓ Created ${resourcePath}`);

				// 3. Generate unit test (if enabled)
				if (options.tests) {
					const unitTestPath = join(cwd, "test", "unit", "resources", `${name}.test.ts`);
					const unitTestContent = generateUnitTestFile(name, capitalizedName);
					await mkdir(join(cwd, "test", "unit", "resources"), { recursive: true });
					await writeFile(unitTestPath, unitTestContent, "utf-8");
					console.log(`✓ Created ${unitTestPath}`);

					// 4. Generate integration test YAML
					const integrationTestPath = join(
						cwd,
						"test",
						"integration",
						"specs",
						"resources",
						`${name}.yaml`,
					);
					const integrationTestContent = generateIntegrationTestYaml(
						name,
						options.description || "",
						options.uriPattern || "resource://{id}",
					);
					await mkdir(join(cwd, "test", "integration", "specs", "resources"), {
						recursive: true,
					});
					await writeFile(integrationTestPath, integrationTestContent, "utf-8");
					console.log(`✓ Created ${integrationTestPath}`);
				}

				// 5. Auto-register in src/index.ts (if enabled)
				if (options.register) {
					await registerResourceInIndex(cwd, name, capitalizedName);
					console.log(`✓ Registered in src/index.ts`);
				}

				// 6. Update .mcp-template.json (if exists)
				await updateTemplateMetadata(cwd, name, options.tests);

				console.log(`\n✅ Resource '${name}' created successfully!\n`);
				console.log("Next steps:");
				console.log(`  1. Edit src/resources/${name}.ts and implement your logic`);
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
 * Generate resource file content
 */
function generateResourceFile(
	name: string,
	capitalizedName: string,
	options: AddResourceOptions,
): string {
	const description = options.description || "TODO: Add description";
	const uriPattern = options.uriPattern || "resource://{id}";

	// Detect if URI pattern has template variables
	const hasVariables = uriPattern.includes("{") && uriPattern.includes("}");

	// Extract variable names from pattern (e.g., "user://{id}/{name}" -> ["id", "name"])
	const variables = hasVariables ? Array.from(uriPattern.matchAll(/\{(\w+)\}/g)).map(m => m[1]) : [];

	// Generate appropriate imports
	const imports = hasVariables
		? `import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";\nimport { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";`
		: `import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";`;

	// Generate ResourceTemplate wrapper if needed
	const uriPatternCode = hasVariables
		? `new ResourceTemplate("${uriPattern}", {\n\t\t\t// TODO: Implement list callback to return available resources\n\t\t\tlist: async () => {\n\t\t\t\t// Example: return { resources: [{ uri: "...", name: "...", description: "..." }] };\n\t\t\t\treturn { resources: [] };\n\t\t\t},\n\t\t\t// TODO: Implement autocomplete for template variables\n\t\t\tcomplete: {\n${variables.map(v => `\t\t\t\t${v}: async (value) => {\n\t\t\t\t\t// Return suggestions for ${v}\n\t\t\t\t\treturn [];\n\t\t\t\t}`).join(",\n")}\n\t\t\t}\n\t\t})`
		: `"${uriPattern}"`;

	// Handler signature depends on whether we have variables
	const handlerSignature = hasVariables ? "async (uri, variables)" : "async (uri)";

	// Parameter extraction comment and code
	const paramExtractionComment = hasVariables
		? `\t\t\t// Extract parameters from ResourceTemplate variables\n${variables.map(v => `\t\t\tconst ${v} = variables.${v} as string;`).join("\n")}`
		: `\t\t\t// Static resource - no parameters to extract\n\t\t\t// The uri parameter is a URL object with parsed components`;

	const exampleData = hasVariables
		? `{\n\t\t\t\t\tresource: "${name}",\n\t\t\t\t\turi: uri.href,\n${variables.map(v => `\t\t\t\t\t${v}: ${v}`).join(",\n")},\n\t\t\t\t\tmessage: "Replace this with your actual resource data"\n\t\t\t\t}`
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
			// - Read from KV: await env.MY_KV.get(${hasVariables ? variables[0] : 'key'})
			// - Query D1: await env.MY_DB.prepare("SELECT * FROM table WHERE id = ?").bind(${hasVariables ? variables[0] : 'id'}).first()
			// - Fetch external API: await fetch(\`https://api.example.com/\${${hasVariables ? variables[0] : 'id'}}\`)

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
 * Generate unit test file content
 */
function generateUnitTestFile(name: string, capitalizedName: string): string {
	return `/**
 * ${capitalizedName} Resource - Unit Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { register${capitalizedName}Resource } from "../../../src/resources/${name}.js";

describe("${name} resource", () => {
	let server: McpServer;

	beforeEach(() => {
		server = new McpServer({
			name: "test-server",
			version: "1.0.0",
		});
		register${capitalizedName}Resource(server);
	});

	it("should register the resource", () => {
		// TODO: Verify resource is registered
		expect(server).toBeDefined();
	});

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
	});
});
`;
}

/**
 * Generate integration test YAML content
 */
function generateIntegrationTestYaml(
	name: string,
	description: string,
	uriPattern: string,
): string {
	// Generate a sample URI from the pattern
	const sampleUri = uriPattern.replace(/\{[^}]+\}/g, "test-value");

	return `type: "resource"
name: "${name.replace(/-/g, " ")} - Basic"
description: "${description || `Verify that ${name} resource works correctly`}"
uri: "${sampleUri}"
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
  #   contains: "${sampleUri}"
`;
}

/**
 * Register resource in src/index.ts
 */
async function registerResourceInIndex(
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
	if (content.includes(`register${capitalizedName}Resource`)) {
		console.warn(`  ⚠️  Resource already registered in src/index.ts`);
		return;
	}

	// Add import after other resource imports (or after prompt imports)
	const importStatement = `import { register${capitalizedName}Resource } from "./resources/${name}.js";`;
	let updatedContent = content;

	// Find the last resource import and add after it
	const resourceImportRegex = /import\s+\{[^}]+\}\s+from\s+["']\.\/resources\/[^"']+["'];/g;
	const resourceMatches = Array.from(content.matchAll(resourceImportRegex));

	if (resourceMatches.length > 0) {
		const lastMatch = resourceMatches[resourceMatches.length - 1];
		const insertPos = lastMatch.index! + lastMatch[0].length;
		updatedContent =
			content.slice(0, insertPos) +
			`\n${importStatement}` +
			content.slice(insertPos);
	} else {
		// No existing resource imports, add after prompt imports
		const promptImportRegex = /import\s+\{[^}]+\}\s+from\s+["']\.\/prompts\/[^"']+["'];/g;
		const promptMatches = Array.from(content.matchAll(promptImportRegex));

		if (promptMatches.length > 0) {
			const lastMatch = promptMatches[promptMatches.length - 1];
			const insertPos = lastMatch.index! + lastMatch[0].length;
			updatedContent =
				content.slice(0, insertPos) +
				`\n\n// Resources\n${importStatement}` +
				content.slice(insertPos);
		} else {
			// Add after tool imports
			const toolImportRegex = /import\s+\{[^}]+\}\s+from\s+["']\.\/tools\/[^"']+["'];/g;
			const toolMatches = Array.from(content.matchAll(toolImportRegex));

			if (toolMatches.length > 0) {
				const lastMatch = toolMatches[toolMatches.length - 1];
				const insertPos = lastMatch.index! + lastMatch[0].length;
				updatedContent =
					content.slice(0, insertPos) +
					`\n\n// Resources\n${importStatement}` +
					content.slice(insertPos);
			} else {
				// Add after other imports
				const lastImportMatch = content.match(
					/import\s+[^;]+;(?=\s*\n\s*(?:\/\*|\/\/|\n|export|class))/g,
				);
				if (lastImportMatch) {
					const lastImport = lastImportMatch[lastImportMatch.length - 1];
					const insertPos = content.indexOf(lastImport) + lastImport.length;
					updatedContent =
						content.slice(0, insertPos) +
						`\n\n// Resources\n${importStatement}` +
						content.slice(insertPos);
				}
			}
		}
	}

	// Add registration call in init() method
	const registrationCall = `\t\tregister${capitalizedName}Resource(this.server);`;
	const initMethodRegex = /async\s+init\(\)\s*\{([^}]*)\}/;
	const initMatch = updatedContent.match(initMethodRegex);

	if (initMatch) {
		const initBody = initMatch[1];
		const lastResourceRegisterCall = initBody.match(/\s+register\w+Resource\(this\.server\);/g);

		if (lastResourceRegisterCall) {
			const lastCall = lastResourceRegisterCall[lastResourceRegisterCall.length - 1];
			const insertPos = initMatch.index! + initMatch[0].lastIndexOf(lastCall) + lastCall.length;
			updatedContent =
				updatedContent.slice(0, insertPos) +
				`\n${registrationCall}` +
				updatedContent.slice(insertPos);
		} else {
			// No existing resource register calls, add after prompt registrations
			const lastPromptRegisterCall = initBody.match(/\s+register\w+Prompt\(this\.server\);/g);

			if (lastPromptRegisterCall) {
				const lastCall = lastPromptRegisterCall[lastPromptRegisterCall.length - 1];
				const insertPos = initMatch.index! + initMatch[0].lastIndexOf(lastCall) + lastCall.length;
				updatedContent =
					updatedContent.slice(0, insertPos) +
					`\n\n\t\t// Register all resources\n${registrationCall}` +
					updatedContent.slice(insertPos);
			} else {
				// Add after tool registrations
				const lastToolRegisterCall = initBody.match(/\s+register\w+Tool\(this\.server\);/g);

				if (lastToolRegisterCall) {
					const lastCall = lastToolRegisterCall[lastToolRegisterCall.length - 1];
					const insertPos = initMatch.index! + initMatch[0].lastIndexOf(lastCall) + lastCall.length;
					updatedContent =
						updatedContent.slice(0, insertPos) +
						`\n\n\t\t// Register all resources\n${registrationCall}` +
						updatedContent.slice(insertPos);
				} else {
					// Add at start of init
					const insertPos = initMatch.index! + initMatch[0].indexOf("{") + 1;
					updatedContent =
						updatedContent.slice(0, insertPos) +
						`\n\t\t// Register all resources\n${registrationCall}` +
						updatedContent.slice(insertPos);
				}
			}
		}
	}

	await writeFile(indexPath, updatedContent, "utf-8");
}

/**
 * Update .mcp-template.json metadata
 */
async function updateTemplateMetadata(
	cwd: string,
	name: string,
	hasTests: boolean,
): Promise<void> {
	const metadataPath = join(cwd, ".mcp-template.json");

	if (!existsSync(metadataPath)) {
		return; // Optional file
	}

	try {
		const content = await readFile(metadataPath, "utf-8");
		const metadata = JSON.parse(content);

		if (!metadata.resources) {
			metadata.resources = [];
		}

		metadata.resources.push({
			name,
			file: `src/resources/${name}.ts`,
			registered: true,
			hasUnitTest: hasTests,
			hasIntegrationTest: hasTests,
		});

		await writeFile(metadataPath, JSON.stringify(metadata, null, "\t"), "utf-8");
	} catch (error) {
		console.warn(`  ⚠️  Could not update .mcp-template.json: ${error}`);
	}
}

/**
 * Convert kebab-case to PascalCase
 */
function toPascalCase(str: string): string {
	return str
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join("");
}
