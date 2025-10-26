/**
 * List Prompts Command
 *
 * Lists all prompts in the MCP server project with their status:
 * - Registration status
 * - Test coverage
 * - File locations
 */

import { Command } from "commander";
import {
	EntityLister,
	EntityConfig,
	EntityInfo,
} from "./shared/entity-lister.js";

/**
 * Prompt information
 */
export interface PromptInfo extends EntityInfo {}

/**
 * Configuration for listing prompts
 */
const promptsConfig: EntityConfig = {
	entityType: "prompt",
	entityTypePlural: "prompts",
	sourceDir: "src/prompts",
	registrationPattern: /register(\w+)Prompt\(this\.server\)/g,
	unitTestDir: "test/unit/prompts",
	integrationTestDir: "test/integration/specs/prompts",
	descriptionPattern:
		/server\.prompt\(\s*["']([^"']+)["'],\s*["']([^"']+)["']/,
};

/**
 * Create list prompts command
 */
export function createListPromptsCommand(): Command {
	return new EntityLister(promptsConfig).createCommand();
}

/**
 * Discover all prompts in the project
 * @deprecated Use EntityLister.discoverEntities() instead
 */
export async function discoverPrompts(
	cwd: string,
	includeExamples = false,
): Promise<PromptInfo[]> {
	return new EntityLister(promptsConfig).discoverEntities(cwd, includeExamples);
}

/**
 * Check which prompts are registered in src/index.ts
 * @deprecated Use EntityLister.checkRegistrations() instead
 */
export async function checkPromptRegistrations(
	indexPath: string,
): Promise<string[]> {
	return new EntityLister(promptsConfig).checkRegistrations(indexPath);
}

/**
 * Filter prompts by status
 * @deprecated Use EntityLister.filterEntities() instead
 */
export function filterPrompts(
	prompts: PromptInfo[],
	filter: string,
): PromptInfo[] {
	return new EntityLister(promptsConfig).filterEntities(prompts, filter);
}

/**
 * Convert PascalCase to kebab-case
 * @deprecated Import from shared/utils.js instead
 */
export function toKebabCase(str: string): string {
	return str
		.replace(/([A-Z])/g, "-$1")
		.toLowerCase()
		.replace(/^-/, "");
}
