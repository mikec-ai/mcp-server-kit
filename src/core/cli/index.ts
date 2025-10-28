/**
 * MCP Server Kit CLI
 *
 * Main CLI entry point using Commander.js
 */

import { Command } from "commander";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createNewCommand } from "../commands/new-server.js";
import { createTemplateCommand } from "../commands/template.js";
import { createAddCommand } from "../commands/add-tool.js";
import { createValidateCommand } from "../commands/validate.js";
import { createListCommand } from "../commands/list.js";
import { ExitCode, CLIErrorResponse } from "../../types/cli-errors.js";

/**
 * Read version from package.json
 */
function getVersion(): string {
	try {
		const __filename = fileURLToPath(import.meta.url);
		const __dirname = dirname(__filename);
		// Compiled to dist/cli.js, so go up one level to project root
		const pkgPath = join(__dirname, "../package.json");
		const content = readFileSync(pkgPath, "utf-8");
		const pkg = JSON.parse(content);
		return pkg.version || "unknown";
	} catch (error) {
		// Only log warning in non-test environments
		if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
			console.error("Warning: Could not read version from package.json");
		}
		return "unknown";
	}
}

const VERSION = getVersion();

/**
 * Check if JSON mode is requested in arguments
 */
function isJsonMode(): boolean {
	return process.argv.includes("--json");
}

/**
 * Configure a command and all its subcommands for JSON error handling
 */
function configureCommandForJson(cmd: Command): void {
	// Configure output for this command
	cmd.configureOutput({
		writeErr: (str) => {
			// Extract error message from Commander's output
			const errorMatch = str.match(/error: (.+)/);
			const errorMessage = errorMatch ? errorMatch[1].trim() : str.trim();

			const response: CLIErrorResponse = {
				success: false,
				error: errorMessage,
				errorCode: ExitCode.VALIDATION_ERROR,
				errorType: "ArgumentError",
			};

			// Output to stdout (not stderr) for consistent JSON handling
			console.log(JSON.stringify(response, null, 2));
		},
		writeOut: (str) => {
			// Suppress normal output in JSON mode
			// (commands will output their own JSON)
		},
	});

	// Override exit to use consistent exit codes
	cmd.exitOverride((err) => {
		// For help display, exit with success
		if (err.code === "commander.helpDisplayed") {
			process.exit(ExitCode.SUCCESS);
		}

		// For all other errors, exit with validation error code
		process.exit(ExitCode.VALIDATION_ERROR);
	});

	// Recursively configure all subcommands
	cmd.commands.forEach((subCmd) => configureCommandForJson(subCmd));
}

/**
 * Configure a command and all its subcommands for text error handling
 */
function configureCommandForText(cmd: Command): void {
	// Configure this command
	cmd.showHelpAfterError("\n💡 Tip: Run with --help to see all available commands and options");

	cmd.configureOutput({
		writeErr: (str) => {
			process.stderr.write(str);
		},
		writeOut: (str) => {
			process.stdout.write(str);
		},
	});

	// Recursively configure all subcommands
	cmd.commands.forEach((subCmd) => configureCommandForText(subCmd));
}

/**
 * Create and configure the CLI program
 */
function createProgram(): Command {
	const program = new Command();
	const jsonMode = isJsonMode();

	program
		.name("mcp-server-kit")
		.description(`Extensible scaffolding tool and test harness for MCP servers

Examples:
  $ mcp-server-kit new server --name my-server --dev
  $ mcp-server-kit add tool weather --description "Get weather data"
  $ mcp-server-kit add prompt code-reviewer --description "Review code"
  $ mcp-server-kit add resource config --static
  $ mcp-server-kit validate

AI Agent Tips:
  • Always use --dev flag when testing mcp-server-kit itself
  • Use --static flag for resources with fixed URIs (no variables)
  • Run validate after adding components to catch issues
  • Check --help on any command for detailed options`)
		.version(VERSION, "-v, --version", "Output the current version");

	// Add commands first
	program.addCommand(createNewCommand());
	program.addCommand(createTemplateCommand());
	program.addCommand(createAddCommand());
	program.addCommand(createValidateCommand());
	program.addCommand(createListCommand());

	// Configure based on JSON mode
	if (jsonMode) {
		// Apply JSON configuration to all commands recursively
		configureCommandForJson(program);
	} else {
		// Apply text configuration to all commands recursively
		configureCommandForText(program);
	}

	return program;
}

/**
 * Run the CLI
 */
export function run(): void {
	const program = createProgram();

	// Detect if run with no arguments (only executable name)
	if (process.argv.length <= 2) {
		console.log('👋 Welcome to mcp-server-kit!\n');
		console.log('Quick start:');
		console.log('  mcp-server-kit new server --name my-server --dev');
		console.log('  mcp-server-kit add tool weather --description "Get weather"');
		console.log('  mcp-server-kit validate\n');
		console.log('For full documentation:');
		console.log('  mcp-server-kit --help\n');
		program.outputHelp();
		process.exit(0);
	}

	// Note: showHelpAfterError handles error messages automatically

	program.parse(process.argv);
}

// If this module is run directly, execute the CLI
if (import.meta.url === `file://${process.argv[1]}`) {
	run();
}

export { createProgram };
