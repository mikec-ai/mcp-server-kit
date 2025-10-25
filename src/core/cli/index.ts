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
		.description("Extensible scaffolding tool and test harness for MCP servers")
		.version(VERSION, "-v, --version", "Output the current version");

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
	program.parse(process.argv);
}

// If this module is run directly, execute the CLI
if (import.meta.url === `file://${process.argv[1]}`) {
	run();
}

export { createProgram };
