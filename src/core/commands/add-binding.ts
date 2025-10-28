/**
 * Add Binding Command
 *
 * Adds Cloudflare bindings to an existing MCP server project.
 * Supports KV namespaces, D1 databases, and other Cloudflare primitives.
 * Phase 1: KV and D1 support
 * Phase 2+: R2, Queues, AI, Vectorize, Hyperdrive
 */

import { Command } from "commander";
import type {
	BindingScaffoldConfig,
	BindingScaffoldResult,
	BindingType,
	Phase1BindingType,
} from "@/types/binding-types.js";
import { isPhase1Binding } from "@/types/binding-types.js";
import { BindingScaffolder } from "./shared/binding-scaffolder.js";

interface AddBindingCommandOptions {
	name: string;
	database?: string;
	bucket?: string;
	skipHelper?: boolean;
	skipTypegen?: boolean;
	json?: boolean;
	cwd?: string;
}

/**
 * Validate add binding command options
 */
function validateAddBindingOptions(
	bindingType: string,
	options: AddBindingCommandOptions,
): void {
	// Validate binding type
	const validTypes: BindingType[] = [
		"kv",
		"d1",
		"r2",
		"queues",
		"ai",
		"vectorize",
		"hyperdrive",
	];
	if (!validTypes.includes(bindingType as BindingType)) {
		throw new Error(
			`Invalid binding type '${bindingType}'. Valid types: ${validTypes.join(", ")}`,
		);
	}

	// Check if Phase 1 binding type
	if (!isPhase1Binding(bindingType as BindingType)) {
		throw new Error(
			`Binding type '${bindingType}' is not yet supported. Phase 1 supports: kv, d1`,
		);
	}

	// Validate binding name format
	if (!options.name) {
		throw new Error("Binding name is required (--name <NAME>)");
	}

	// Must be UPPER_SNAKE_CASE
	if (!/^[A-Z][A-Z0-9_]*$/.test(options.name)) {
		throw new Error(
			`Binding name must be UPPER_SNAKE_CASE (e.g., MY_CACHE, USER_DATA)`,
		);
	}

	// D1-specific validation
	if (bindingType === "d1") {
		// Database name is optional, will be generated from binding name if not provided
	}
}

/**
 * Add Cloudflare binding to MCP server
 */
export async function addBinding(
	bindingType: Phase1BindingType,
	options: AddBindingCommandOptions,
): Promise<BindingScaffoldResult> {
	const scaffolder = new BindingScaffolder();

	const config: BindingScaffoldConfig = {
		bindingType,
		bindingName: options.name,
		databaseName: options.database,
		bucketName: options.bucket,
		skipHelper: options.skipHelper,
		skipTypegen: options.skipTypegen,
	};

	const result = await scaffolder.scaffold(
		options.cwd || process.cwd(),
		config,
	);

	// Output results
	if (options.json) {
		console.log(JSON.stringify(result, null, 2));
	} else {
		printHumanReadableResult(result);
	}

	return result;
}

/**
 * Print human-readable result
 */
function printHumanReadableResult(result: BindingScaffoldResult): void {
	if (result.success) {
		console.log(
			`\n✅ ${result.bindingType.toUpperCase()} binding added successfully!\n`,
		);

		console.log(`Binding: ${result.bindingName}`);
		console.log(`Type: ${result.bindingType.toUpperCase()}\n`);

		if (result.helperPath) {
			console.log("Helper class:");
			console.log(`  + ${result.helperPath}\n`);
		}

		if (result.filesCreated.length > 0) {
			console.log("Files created:");
			for (const file of result.filesCreated) {
				console.log(`  + ${file}`);
			}
			console.log();
		}

		if (result.filesModified.length > 0) {
			console.log("Files modified:");
			for (const file of result.filesModified) {
				console.log(`  ~ ${file}`);
			}
			console.log();
		}

		if (result.warnings && result.warnings.length > 0) {
			console.log("⚠️  Warnings:");
			for (const warning of result.warnings) {
				console.log(`  ${warning}`);
			}
			console.log();
		}

		if (result.nextSteps.length > 0) {
			console.log("Next steps:");
			for (const step of result.nextSteps) {
				console.log(`  ${step}`);
			}
			console.log();
		}
	} else {
		console.error("\n❌ Failed to add binding\n");
		console.error(`Error: ${result.error || "Unknown error"}\n`);

		if (result.warnings && result.warnings.length > 0) {
			console.error("Warnings:");
			for (const warning of result.warnings) {
				console.error(`  ${warning}`);
			}
			console.error();
		}

		process.exit(1);
	}
}

/**
 * Create the 'add binding' command
 */
export function createAddBindingCommand(): Command {
	const command = new Command("binding")
		.description("Add a Cloudflare binding to your MCP server (Phase 1: kv, d1)")
		.argument("<type>", "Binding type: kv or d1")
		.requiredOption("--name <NAME>", "Binding name in UPPER_SNAKE_CASE")
		.option(
			"--database <name>",
			"Database name (for D1 only, defaults to binding name in kebab-case)",
		)
		.option(
			"--bucket <name>",
			"Bucket name (for R2 only, Phase 2+)",
		)
		.option("--skip-helper", "Skip generating helper class")
		.option("--skip-typegen", "Skip running cf-typegen")
		.option("--json", "Output result as JSON")
		.action(
			async (bindingType: string, options: AddBindingCommandOptions) => {
				try {
					// Validate options
					validateAddBindingOptions(bindingType, options);

					// Call the main add binding function
					await addBinding(bindingType as Phase1BindingType, options);
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : String(error);

					if (options.json) {
						const result: BindingScaffoldResult = {
							success: false,
							bindingType: bindingType as BindingType,
							bindingName: options.name || "unknown",
							filesCreated: [],
							filesModified: [],
							nextSteps: [],
							error: errorMessage,
						};
						console.log(JSON.stringify(result, null, 2));
					} else {
						console.error(`\n❌ Error: ${errorMessage}\n`);
					}
					process.exit(1);
				}
			},
		);

	return command;
}
