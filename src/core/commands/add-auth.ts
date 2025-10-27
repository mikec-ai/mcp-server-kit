/**
 * Add Auth Command
 *
 * Adds authentication to an existing MCP server project.
 * Supports Stytch, Auth0, and WorkOS providers.
 * Works with Cloudflare Workers and Vercel/Next.js platforms.
 */

import { Command } from "commander";
import type { AddAuthOptions, AddAuthResult } from "../../types/command-results.js";
import { AuthScaffolder } from "./shared/auth-scaffolder.js";

interface AddAuthCommandOptions {
	provider: "stytch" | "auth0" | "workos";
	platform?: "cloudflare" | "vercel";
	force?: boolean;
	dryRun?: boolean;
	backup?: boolean;
	json?: boolean;
	cwd?: string;
}

/**
 * Add authentication to MCP server
 */
export async function addAuth(
	options: AddAuthCommandOptions,
): Promise<AddAuthResult> {
	const scaffolder = new AuthScaffolder();

	const scaffoldOptions: AddAuthOptions = {
		provider: options.provider,
		platform: options.platform,
		force: options.force,
		dryRun: options.dryRun,
		backup: options.backup,
		cwd: options.cwd,
	};

	const result = await scaffolder.addAuth(scaffoldOptions);

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
function printHumanReadableResult(result: AddAuthResult): void {
	if (result.success) {
		console.log("\n✅ Authentication added successfully!\n");

		console.log(`Provider: ${result.provider}`);
		console.log(`Platform: ${result.platform}\n`);

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

		console.log("Next steps:");
		console.log("  1. Run 'npm install' to install auth dependencies");
		console.log("  2. Update .env with your auth provider credentials");

		if (result.platform === "cloudflare") {
			console.log("  3. Run 'npm run cf-typegen' to update types");
			console.log("  4. Test locally with 'npm run dev'");
		} else {
			console.log("  3. Configure Vercel environment variables");
			console.log("  4. Test locally with 'npm run dev'");
		}

		console.log();
	} else {
		console.error("\n❌ Failed to add authentication\n");
		console.error(`Error: ${result.error}\n`);

		if (result.warnings && result.warnings.length > 0) {
			console.error("Warnings:");
			for (const warning of result.warnings) {
				console.error(`  ${warning}`);
			}
			console.error();
		}

		if (result.backupDir) {
			console.error(`Backup preserved at: ${result.backupDir}`);
			console.error("You can manually restore from this backup if needed.\n");
		}

		process.exit(1);
	}
}

/**
 * Validate command options
 */
export function validateAddAuthOptions(
	options: Partial<AddAuthCommandOptions>,
): void {
	if (!options.provider) {
		throw new Error(
			"Provider is required. Use --provider stytch, --provider auth0, or --provider workos",
		);
	}

	const validProviders = ["stytch", "auth0", "workos"];
	if (!validProviders.includes(options.provider)) {
		throw new Error(
			`Invalid provider: ${options.provider}. Must be one of: ${validProviders.join(", ")}`,
		);
	}

	if (
		options.platform &&
		!["cloudflare", "vercel"].includes(options.platform)
	) {
		throw new Error(
			`Invalid platform: ${options.platform}. Must be cloudflare or vercel`,
		);
	}
}

/**
 * Create the 'add auth' command
 */
export function createAddAuthCommand(): Command {
	const command = new Command("auth")
		.description("Add authentication to your MCP server")
		.requiredOption(
			"--provider <provider>",
			"Auth provider: stytch, auth0, or workos",
		)
		.option(
			"--platform <platform>",
			"Platform: cloudflare or vercel (auto-detected if not specified)",
		)
		.option("--force", "Overwrite existing authentication configuration")
		.option("--dry-run", "Show what would be done without making changes")
		.option("--no-backup", "Skip creating backup before modifications")
		.option("--json", "Output result as JSON")
		.action(async (options: AddAuthCommandOptions) => {
			try {
				// Validate options
				validateAddAuthOptions(options);

				// Call the main add auth function
				await addAuth(options);
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);

				if (options.json) {
					const result: AddAuthResult = {
						success: false,
						provider: options.provider || "unknown",
						platform: "unknown",
						filesCreated: [],
						filesModified: [],
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
