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
				const result = await scaffolder.scaffold(cwd, config);

				// Report created files
				for (const file of result.filesCreated) {
					console.log(`✓ Created ${file}`);
				}

				if (result.registered) {
					console.log(`✓ Registered in src/index.ts`);
				}

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
