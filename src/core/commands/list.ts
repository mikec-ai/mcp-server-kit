/**
 * List Command
 *
 * Parent command for listing various project elements.
 */

import { Command } from "commander";
import { createListToolsCommand } from "./list-tools.js";
import { createListPromptsCommand } from "./list-prompts.js";
import { createListResourcesCommand } from "./list-resources.js";

/**
 * Create list command
 */
export function createListCommand(): Command {
	const listCommand = new Command("list")
		.description("List project elements (tools, prompts, resources, etc.)");

	// Add subcommands
	listCommand.addCommand(createListToolsCommand());
	listCommand.addCommand(createListPromptsCommand());
	listCommand.addCommand(createListResourcesCommand());

	return listCommand;
}
