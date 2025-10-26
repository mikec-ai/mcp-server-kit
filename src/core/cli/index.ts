/**
 * MCP Server Kit CLI
 *
 * Main CLI entry point using Commander.js
 */

import { Command } from "commander";
import { createNewCommand } from "../commands/new-server.js";
import { createTemplateCommand } from "../commands/template.js";
import { createAddCommand } from "../commands/add-tool.js";
import { createValidateCommand } from "../commands/validate.js";
import { createListCommand } from "../commands/list.js";

// Read version from package.json
const VERSION = "1.0.0";

/**
 * Create and configure the CLI program
 */
function createProgram(): Command {
	const program = new Command();

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

	// Configure enhanced error handling
	program
		.showHelpAfterError('\n💡 Tip: Run with --help to see all available commands and options')
		.configureOutput({
			writeErr: (str) => {
				process.stderr.write(str);
			},
			writeOut: (str) => {
				process.stdout.write(str);
			}
		});

	// Add commands
	program.addCommand(createNewCommand());
	program.addCommand(createTemplateCommand());
	program.addCommand(createAddCommand());
	program.addCommand(createValidateCommand());
	program.addCommand(createListCommand());

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
