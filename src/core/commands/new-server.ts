/**
 * New Server Command
 *
 * Scaffolds a new MCP server project from a template.
 */

import { Command } from "commander";
import { TemplateRegistry } from "../template-system/registry.js";
import { TemplateProcessor } from "../template-system/processor.js";
import type { PackageManager } from "../template-system/types.js";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Create the 'new server' command
 */
export function createNewServerCommand(): Command {
	const command = new Command("server")
		.description("Scaffold a new MCP server project")
		.showHelpAfterError('\n💡 Tip: Run with --help to see all available options')
		.requiredOption("--name <name>", "Project name (lowercase with hyphens)")
		.option("--template <id>", "Template ID to use", "cloudflare-remote")
		.option("--description <desc>", "Project description")
		.option("--port <port>", "Development server port", "8788")
		.option("--output <path>", "Output directory (defaults to current directory)")
		.option("--no-install", "Skip dependency installation")
		.option("--pm <manager>", "Package manager (npm, pnpm, yarn, bun)", "npm")
		.option("--dev", "Development mode: use local mcp-server-kit paths instead of published package")
		.action(async (options) => {
			try {
				console.log(`\n🚀 Creating MCP server: ${options.name}\n`);

				// Validate package manager
				const validPMs = ["npm", "pnpm", "yarn", "bun"];
				if (!validPMs.includes(options.pm)) {
					console.error(`❌ Error: Invalid package manager '${options.pm}'`);
					console.error(`   Valid options: ${validPMs.join(", ")}`);
					process.exit(1);
				}

				// Create registry and processor
				const registry = new TemplateRegistry();
				const processor = new TemplateProcessor(registry);

				// Check if template exists
				const templateExists = await registry.templateExists(options.template);
				if (!templateExists) {
					console.error(`❌ Error: Template '${options.template}' not found`);
					console.error("\nAvailable templates:");
					const templates = await registry.listTemplates();
					for (const t of templates) {
						console.error(`  - ${t.id}: ${t.name}`);
					}
					process.exit(1);
				}

				// Build variables
				const variables: Record<string, string> = {
					PROJECT_NAME: options.name,
					MCP_SERVER_NAME: options.description || options.name,
					PORT: options.port,
					};

				if (options.description) {
					variables.DESCRIPTION = options.description;
				}

				// In dev mode, calculate absolute path to mcp-server-kit
				if (options.dev) {
					// Get the directory of the current module
					const __filename = fileURLToPath(import.meta.url);
					const __dirname = path.dirname(__filename);
					// Navigate from dist/ to root (1 level up)
					// The compiled code is in dist/cli.js, so we go back one level
					const mcpKitRoot = path.resolve(__dirname, "../");
					variables.DEV_MODE = "true";
				variables.MCP_KIT_PATH = mcpKitRoot;
					console.log(`📦 Development mode: Using local mcp-server-kit at ${mcpKitRoot}\n`);
				}

				// Determine target directory
				const targetDir = options.output
					? path.join(options.output, options.name)
					: `./${options.name}`;

				// Scaffold the project
				const result = await processor.scaffold({
					template: options.template,
					targetDir,
					variables,
					noInstall: !options.install,
					packageManager: options.pm as PackageManager,
				});

				// Handle result
				if (result.success) {
					console.log(`\n✅ Successfully created ${options.name}!\n`);
					if (options.dev) {
						console.log("📦 Development mode enabled - using local mcp-server-kit\n");
					}
					console.log("Next steps:");
					console.log(`  cd ${targetDir}`);
					if (!options.install) {
						console.log(`  ${options.pm} install`);
					}
					console.log(`  ${options.pm} run dev`);
					console.log("\nHappy coding! 🎉\n");
				} else {
					console.error(`\n❌ Error: ${result.error}\n`);
					process.exit(1);
				}
			} catch (error) {
				console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
				process.exit(1);
			}
		});

	return command;
}

/**
 * Create the 'new' command with 'server' subcommand
 */
export function createNewCommand(): Command {
	const newCmd = new Command("new").description("Create a new MCP server or component");

	newCmd.addCommand(createNewServerCommand());

	return newCmd;
}
