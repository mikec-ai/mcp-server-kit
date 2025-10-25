/**
 * List Command
 *
 * Parent command for listing various project elements.
 */

import { Command } from "commander";
import { createListToolsCommand } from "./list-tools.js";

/**
 * Create list command
 */
export function createListCommand(): Command {
	const listCommand = new Command("list")
		.description("List project elements (tools, templates, etc.)");

	// Add subcommands
	listCommand.addCommand(createListToolsCommand());

	return listCommand;
}
