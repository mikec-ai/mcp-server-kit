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
import { outputResult } from "./shared/json-output.js";
import type { AddEntityResult } from "../../types/command-results.js";

export interface AddResourceOptions {
	description?: string;
	uriPattern?: string;
	static?: boolean;
	dynamic?: boolean;
	tests: boolean;
	register: boolean;
	json?: boolean;
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
		.option("--json", "Output result as JSON")
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
				const scaffoldResult = await scaffolder.scaffold(cwd, config);

				// Build result object
				const result: AddEntityResult = {
					success: scaffoldResult.success,
					entityType: "resource",
					entityName: name,
					filesCreated: scaffoldResult.filesCreated,
					registered: scaffoldResult.registered,
					message: `Resource '${name}' created successfully`,
				};

				// Output result
				outputResult(result, !!options.json, (r) => {
					console.log(`\n📦 Adding resource: ${name}\n`);

					for (const file of r.filesCreated) {
						console.log(`✓ Created ${file}`);
					}

					if (r.registered) {
						console.log(`✓ Registered in src/index.ts`);
					}

					console.log(`\n✅ Resource '${name}' created successfully!\n`);
					console.log("Next steps:");
					console.log(`  1. Edit src/resources/${name}.ts and implement your logic`);
					console.log(`  2. Run 'npm test' to verify tests pass`);
					console.log(`  3. Run 'npm run validate' to check project health\n`);
				});
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);

				if (options.json) {
					const result: AddEntityResult = {
						success: false,
						entityType: "resource",
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
