/**
 * Add Prompt Command
 *
 * Scaffolds a new MCP prompt with:
 * - Prompt file with TODO markers
 * - Unit test file structure
 * - Integration test YAML
 * - Auto-registration in src/index.ts
 */

import { Command } from "commander";
import { writeFile, readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";

export interface AddPromptOptions {
	description?: string;
	tests: boolean;
	register: boolean;
}

/**
 * Create the 'add prompt' command
 */
export function createAddPromptCommand(): Command {
	const command = new Command("prompt")
		.description("Add a new MCP prompt to the project")
		.argument("<name>", "Prompt name (lowercase with hyphens)")
		.option(
			"--description <desc>",
			"Prompt description",
			"TODO: Add description",
		)
		.option("--no-tests", "Skip test file generation")
		.option("--no-register", "Don't auto-register in index.ts")
		.action(async (name: string, options: AddPromptOptions) => {
			try {
				console.log(`\n📝 Adding prompt: ${name}\n`);

				// Validate prompt name
				if (!/^[a-z][a-z0-9-]*$/.test(name)) {
					throw new Error(
						"Prompt name must be lowercase with hyphens (e.g., my-prompt)",
					);
				}

				const cwd = process.cwd();

				// 1. Check if we're in a valid MCP project
				if (!existsSync(join(cwd, "package.json"))) {
					throw new Error("Not in a valid project directory (no package.json found)");
				}

				const capitalizedName = toPascalCase(name);

				// 2. Generate prompt file
				const promptPath = join(cwd, "src", "prompts", `${name}.ts`);
				if (existsSync(promptPath)) {
					throw new Error(`Prompt already exists: ${promptPath}`);
				}

				const promptContent = generatePromptFile(name, capitalizedName, options);
				await mkdir(join(cwd, "src", "prompts"), { recursive: true });
				await writeFile(promptPath, promptContent, "utf-8");
				console.log(`✓ Created ${promptPath}`);

				// 3. Generate unit test (if enabled)
				if (options.tests) {
					const unitTestPath = join(cwd, "test", "unit", "prompts", `${name}.test.ts`);
					const unitTestContent = generateUnitTestFile(name, capitalizedName);
					await mkdir(join(cwd, "test", "unit", "prompts"), { recursive: true });
					await writeFile(unitTestPath, unitTestContent, "utf-8");
					console.log(`✓ Created ${unitTestPath}`);

					// 4. Generate integration test YAML
					const integrationTestPath = join(
						cwd,
						"test",
						"integration",
						"specs",
						"prompts",
						`${name}.yaml`,
					);
					const integrationTestContent = generateIntegrationTestYaml(
						name,
						options.description || "",
					);
					await mkdir(join(cwd, "test", "integration", "specs", "prompts"), {
						recursive: true,
					});
					await writeFile(integrationTestPath, integrationTestContent, "utf-8");
					console.log(`✓ Created ${integrationTestPath}`);
				}

				// 5. Auto-register in src/index.ts (if enabled)
				if (options.register) {
					await registerPromptInIndex(cwd, name, capitalizedName);
					console.log(`✓ Registered in src/index.ts`);
				}

				// 6. Update .mcp-template.json (if exists)
				await updateTemplateMetadata(cwd, name, options.tests);

				console.log(`\n✅ Prompt '${name}' created successfully!\n`);
				console.log("Next steps:");
				console.log(`  1. Edit src/prompts/${name}.ts and implement your logic`);
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
 * Generate prompt file content
 */
export function generatePromptFile(
	name: string,
	capitalizedName: string,
	options: AddPromptOptions,
): string {
	const description = options.description || "TODO: Add description";

	return `/**
 * ${capitalizedName} Prompt
 *
 * ${description}
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Define your argument schema
// NOTE: Prompt arguments MUST be strings only (SDK limitation)
// For boolean-like options, use comma-separated strings or enums
//
// Example - String arguments:
// const ${capitalizedName}ArgsSchema = z.object({
//   code: z.string().describe("Code to review"),
//   language: z.string().optional().describe("Programming language"),
//   options: z.string().optional().describe("Comma-separated options: fast,detailed,secure"),
// });

const ${capitalizedName}ArgsSchema = z.object({
	// Add your string arguments here
	// Example: prompt: z.string().describe("Your prompt parameter"),
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
			// Working minimal example - customize for your use case
			// Access arguments from the schema above (all must be strings)

			// Example: Build a prompt using arguments
			const promptText = \`TODO: Customize this prompt template for ${name}

You can use template literals to include argument values:
\${JSON.stringify(args, null, 2)}

Replace this entire text block with your actual prompt.\`;

			return {
				messages: [
					{
						role: "user" as const,
						content: {
							type: "text" as const,
							text: promptText,
						},
					},
				],
			};

			// Example with multiple messages:
			// return {
			//   messages: [
			//     {
			//       role: "user" as const,
			//       content: {
			//         type: "text" as const,
			//         text: \`System instruction...\`,
			//       },
			//     },
			//     {
			//       role: "assistant" as const,
			//       content: {
			//         type: "text" as const,
			//         text: \`Assistant response...\`,
			//       },
			//     },
			//   ],
			// };
		},
	);
}
`;
}

/**
 * Generate unit test file content
 */
export function generateUnitTestFile(name: string, capitalizedName: string): string {
	return `/**
 * ${capitalizedName} Prompt - Unit Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { register${capitalizedName}Prompt } from "../../../src/prompts/${name}.js";

describe("${name} prompt", () => {
	let server: McpServer;

	beforeEach(() => {
		server = new McpServer({
			name: "test-server",
			version: "1.0.0",
		});
		register${capitalizedName}Prompt(server);
	});

	it("should register the prompt", () => {
		// TODO: Verify prompt is registered
		expect(server).toBeDefined();
	});

	it("should handle valid arguments", async () => {
		// TODO: Test with valid arguments
		// Example:
		// const result = await getPrompt(server, "${name}", { /* args */ });
		// expect(result.messages).toHaveLength(1);
	});

	it("should validate arguments", async () => {
		// TODO: Test argument validation
		// Example: Test with missing required args, invalid types, etc.
	});

	it("should generate appropriate prompt messages", async () => {
		// TODO: Test prompt message generation
	});
});
`;
}

/**
 * Generate integration test YAML content
 */
export function generateIntegrationTestYaml(name: string, description: string): string {
	return `type: "prompt"
name: "${name.replace(/-/g, " ")} - Basic"
description: "${description || `Verify that ${name} prompt works correctly`}"
prompt: "${name}"

# Uncomment and add arguments if your prompt requires them:
# arguments:
#   code: "function example() { return 42; }"
#   language: "javascript"
#   options: "detailed,secure"  # Remember: prompt args must be strings!

assertions:
  # Verify the prompt call succeeds
  - type: "success"

  # Check response time (adjust max value as needed)
  - type: "response_time_ms"
    max: 5000

  # Example: Verify response contains expected text
  # - type: "contains_text"
  #   text: "expected keyword or phrase"

  # Example: Verify response structure with JSON path
  # - type: "json_path"
  #   path: "$.messages[0].role"
  #   expected: "user"

  # Example: Check message count
  # - type: "json_path"
  #   path: "$.messages"
  #   expected_length: 1
`;
}

/**
 * Register prompt in src/index.ts
 */
export async function registerPromptInIndex(
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
	if (content.includes(`register${capitalizedName}Prompt`)) {
		console.warn(`  ⚠️  Prompt already registered in src/index.ts`);
		return;
	}

	// Add import after other prompt imports (or after tool imports)
	const importStatement = `import { register${capitalizedName}Prompt } from "./prompts/${name}.js";`;
	let updatedContent = content;

	// Find the last prompt import and add after it
	const promptImportRegex = /import\s+\{[^}]+\}\s+from\s+["']\.\/prompts\/[^"']+["'];/g;
	const promptMatches = Array.from(content.matchAll(promptImportRegex));

	if (promptMatches.length > 0) {
		const lastMatch = promptMatches[promptMatches.length - 1];
		const insertPos = lastMatch.index! + lastMatch[0].length;
		updatedContent =
			content.slice(0, insertPos) +
			`\n${importStatement}` +
			content.slice(insertPos);
	} else {
		// No existing prompt imports, add after tool imports
		const toolImportRegex = /import\s+\{[^}]+\}\s+from\s+["']\.\/tools\/[^"']+["'];/g;
		const toolMatches = Array.from(content.matchAll(toolImportRegex));

		if (toolMatches.length > 0) {
			const lastMatch = toolMatches[toolMatches.length - 1];
			const insertPos = lastMatch.index! + lastMatch[0].length;
			updatedContent =
				content.slice(0, insertPos) +
				`\n\n// Prompts\n${importStatement}` +
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
					`\n\n// Prompts\n${importStatement}` +
					content.slice(insertPos);
			}
		}
	}

	// Add registration call in init() method
	const registrationCall = `\t\tregister${capitalizedName}Prompt(this.server);`;
	const initMethodRegex = /async\s+init\(\)\s*\{([^}]*)\}/;
	const initMatch = updatedContent.match(initMethodRegex);

	if (initMatch) {
		const initBody = initMatch[1];
		const lastPromptRegisterCall = initBody.match(/\s+register\w+Prompt\(this\.server\);/g);

		if (lastPromptRegisterCall) {
			const lastCall = lastPromptRegisterCall[lastPromptRegisterCall.length - 1];
			const insertPos = initMatch.index! + initMatch[0].lastIndexOf(lastCall) + lastCall.length;
			updatedContent =
				updatedContent.slice(0, insertPos) +
				`\n${registrationCall}` +
				updatedContent.slice(insertPos);
		} else {
			// No existing prompt register calls, add after tool registrations
			const lastToolRegisterCall = initBody.match(/\s+register\w+Tool\(this\.server\);/g);

			if (lastToolRegisterCall) {
				const lastCall = lastToolRegisterCall[lastToolRegisterCall.length - 1];
				const insertPos = initMatch.index! + initMatch[0].lastIndexOf(lastCall) + lastCall.length;
				updatedContent =
					updatedContent.slice(0, insertPos) +
					`\n\n\t\t// Register all prompts\n${registrationCall}` +
					updatedContent.slice(insertPos);
			} else {
				// Add at start of init
				const insertPos = initMatch.index! + initMatch[0].indexOf("{") + 1;
				updatedContent =
					updatedContent.slice(0, insertPos) +
					`\n\t\t// Register all prompts\n${registrationCall}` +
					updatedContent.slice(insertPos);
			}
		}
	}

	await writeFile(indexPath, updatedContent, "utf-8");
}

/**
 * Update .mcp-template.json metadata
 */
export async function updateTemplateMetadata(
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

		if (!metadata.prompts) {
			metadata.prompts = [];
		}

		metadata.prompts.push({
			name,
			file: `src/prompts/${name}.ts`,
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
export function toPascalCase(str: string): string {
	return str
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join("");
}
