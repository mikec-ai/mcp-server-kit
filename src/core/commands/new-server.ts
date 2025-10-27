/**
 * New Server Command
 *
 * Scaffolds a new MCP server project from a template.
 */

import { Command } from "commander";
import { TemplateRegistry } from "../template-system/registry.js";
import { TemplateProcessor } from "../template-system/processor.js";
import type { PackageManager } from "../template-system/types.js";
import type { NewServerResult } from "../../types/command-results.js";
import { outputResult } from "./shared/json-output.js";
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
		.option("--output <path>", "Output directory (defaults to current directory). Tip: Use $(git rev-parse --show-toplevel) for git root")
		.option("--no-install", "Skip dependency installation")
		.option("--pm <manager>", "Package manager (npm, pnpm, yarn, bun)", "npm")
		.option("--dev", "Development mode: use local mcp-server-kit paths instead of published package")
		.option("--json", "Output result as JSON")
		.action(async (options) => {
			try {
				// Validate package manager
				const validPMs = ["npm", "pnpm", "yarn", "bun"];
				if (!validPMs.includes(options.pm)) {
					const errorMessage = `Invalid package manager '${options.pm}'. Valid options: ${validPMs.join(", ")}`;

					if (options.json) {
						const result: NewServerResult = {
							success: false,
							projectName: options.name,
							templateId: options.template,
							path: "",
							nextSteps: [],
							error: errorMessage,
						};
						console.log(JSON.stringify(result, null, 2));
					} else {
						console.error(`❌ Error: ${errorMessage}`);
					}
					process.exit(1);
				}

				// Create registry and processor
				const registry = new TemplateRegistry();
				const processor = new TemplateProcessor(registry);

				// Check if template exists
				const templateExists = await registry.templateExists(options.template);
				if (!templateExists) {
					const templates = await registry.listTemplates();
					const availableTemplates = templates.map((t) => `${t.id}: ${t.name}`).join(", ");
					const errorMessage = `Template '${options.template}' not found. Available: ${availableTemplates}`;

					if (options.json) {
						const result: NewServerResult = {
							success: false,
							projectName: options.name,
							templateId: options.template,
							path: "",
							nextSteps: [],
							error: errorMessage,
						};
						console.log(JSON.stringify(result, null, 2));
					} else {
						console.error(`❌ Error: Template '${options.template}' not found`);
						console.error("\nAvailable templates:");
						for (const t of templates) {
							console.error(`  - ${t.id}: ${t.name}`);
						}
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
					const __filename = fileURLToPath(import.meta.url);
					const __dirname = path.dirname(__filename);
					const mcpKitRoot = path.resolve(__dirname, "../");
					variables.DEV_MODE = "true";
				variables.MCP_KIT_PATH = mcpKitRoot;
					if (!options.json) {
						console.log(`📦 Development mode: Using local mcp-server-kit at ${mcpKitRoot}\n`);
					}
				}

				// Determine target directory
				const targetDir = options.output
					? path.join(options.output, options.name)
					: `./${options.name}`;

				// Scaffold the project
				const scaffoldResult = await processor.scaffold({
					template: options.template,
					targetDir,
					variables,
					noInstall: !options.install,
					packageManager: options.pm as PackageManager,
				});

				// Handle result
				if (scaffoldResult.success) {
					const nextSteps = [];
					nextSteps.push(`cd ${targetDir}`);
					if (!options.install) {
						nextSteps.push(`${options.pm} install`);
					}
					nextSteps.push(`${options.pm} run dev`);

					const result: NewServerResult = {
						success: true,
						projectName: options.name,
						templateId: options.template,
						path: path.resolve(targetDir),
						nextSteps,
						devMode: options.dev,
					};

					outputResult(result, !!options.json, (r) => {
						console.log(`\n🚀 Creating MCP server: ${options.name}\n`);
						console.log(`\n✅ Successfully created ${options.name}!\n`);
						if (options.dev) {
							console.log("📦 Development mode enabled - using local mcp-server-kit\n");
						}
						console.log("Next steps:");
						for (const step of r.nextSteps) {
							console.log(`  ${step}`);
						}
						console.log("\nHappy coding! 🎉\n");
					});
				} else {
					const result: NewServerResult = {
						success: false,
						projectName: options.name,
						templateId: options.template,
						path: targetDir,
						nextSteps: [],
						error: scaffoldResult.error,
					};

					if (options.json) {
						console.log(JSON.stringify(result, null, 2));
					} else {
						console.error(`\n❌ Error: ${scaffoldResult.error}\n`);
					}
					process.exit(1);
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);

				if (options.json) {
					const result: NewServerResult = {
						success: false,
						projectName: options.name,
						templateId: options.template,
						path: "",
						nextSteps: [],
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

/**
 * Create the 'new' command with 'server' subcommand
 */
export function createNewCommand(): Command {
	const newCmd = new Command("new").description("Create a new MCP server or component");

	newCmd.addCommand(createNewServerCommand());

	return newCmd;
}
