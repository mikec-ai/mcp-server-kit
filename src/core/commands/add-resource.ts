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
import { EntityScaffolder, type ScaffoldConfig } from "./shared/entity-scaffolder.js";

export interface AddResourceOptions {
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

				const cwd = process.cwd();
				const scaffolder = new EntityScaffolder();

				// Configure scaffolding
				const config: ScaffoldConfig = {
					entityType: "resource",
					name,
					description: options.description,
					generateTests: options.tests,
					autoRegister: options.register,
					resourceOptions: {
						uriPattern: options.uriPattern,
						static: options.static,
						dynamic: options.dynamic,
					},
				};

				// Scaffold the resource
				const result = await scaffolder.scaffold(cwd, config);

				// Report created files
				for (const file of result.filesCreated) {
					console.log(`✓ Created ${file}`);
				}

				if (result.registered) {
					console.log(`✓ Registered in src/index.ts`);
				}

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
