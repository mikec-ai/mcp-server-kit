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
import { EntityScaffolder, type ScaffoldConfig } from "./shared/entity-scaffolder.js";
import { createAddPromptCommand } from "./add-prompt.js";
import { createAddResourceCommand } from "./add-resource.js";

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

				const cwd = process.cwd();
				const scaffolder = new EntityScaffolder();

				// Configure scaffolding
				const config: ScaffoldConfig = {
					entityType: "tool",
					name,
					description: options.description,
					generateTests: options.tests,
					autoRegister: options.register,
				};

				// Scaffold the tool
				const result = await scaffolder.scaffold(cwd, config);

				// Report created files
				for (const file of result.filesCreated) {
					console.log(`✓ Created ${file}`);
				}

				if (result.registered) {
					console.log(`✓ Registered in src/index.ts`);
				}

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
 * Create the 'add' command group
 */
export function createAddCommand(): Command {
	const addCmd = new Command("add").description(
		"Add components to your MCP server",
	);

	addCmd.addCommand(createAddToolCommand());
	addCmd.addCommand(createAddPromptCommand());
	addCmd.addCommand(createAddResourceCommand());

	return addCmd;
}
