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
import { EntityScaffolder, type ScaffoldConfig } from "./shared/entity-scaffolder.js";
import { outputResult } from "./shared/json-output.js";
import type { AddEntityResult } from "../../types/command-results.js";

export interface AddPromptOptions {
	description?: string;
	tests: boolean;
	register: boolean;
	json?: boolean;
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
		.option("--json", "Output result as JSON")
		.action(async (name: string, options: AddPromptOptions) => {
			try {
				const cwd = process.cwd();
				const scaffolder = new EntityScaffolder();

				// Configure scaffolding
				const config: ScaffoldConfig = {
					entityType: "prompt",
					name,
					description: options.description,
					generateTests: options.tests,
					autoRegister: options.register,
				};

				// Scaffold the prompt
				const scaffoldResult = await scaffolder.scaffold(cwd, config);

				// Build result object
				const result: AddEntityResult = {
					success: scaffoldResult.success,
					entityType: "prompt",
					entityName: name,
					filesCreated: scaffoldResult.filesCreated,
					registered: scaffoldResult.registered,
					message: `Prompt '${name}' created successfully`,
				};

				// Output result
				outputResult(result, !!options.json, (r) => {
					console.log(`\n📝 Adding prompt: ${name}\n`);

					for (const file of r.filesCreated) {
						console.log(`✓ Created ${file}`);
					}

					if (r.registered) {
						console.log(`✓ Registered in src/index.ts`);
					}

					console.log(`\n✅ Prompt '${name}' created successfully!\n`);
					console.log("Next steps:");
					console.log(`  1. Edit src/prompts/${name}.ts and implement your logic`);
					console.log(`  2. Run 'npm test' to verify tests pass`);
					console.log(`  3. Run 'npm run validate' to check project health\n`);
				});
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);

				if (options.json) {
					const result: AddEntityResult = {
						success: false,
						entityType: "prompt",
						entityName: name,
						filesCreated: [],
						registered: false,
						error: errorMessage,
					};
					console.log(JSON.stringify(result, null, 2));
				} else {
					console.error(`\n❌ Error: ${errorMessage}\n`);
				}
				process.exit(1);
			}
		});

	return command;
}
