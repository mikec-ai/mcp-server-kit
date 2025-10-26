/**
 * List Tools Command
 *
 * Lists all tools in the MCP server project with their status:
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
 * Tool information
 */
export interface ToolInfo extends EntityInfo {}

/**
 * Configuration for listing tools
 */
const toolsConfig: EntityConfig = {
	entityType: "tool",
	entityTypePlural: "tools",
	sourceDir: "src/tools",
	registrationPattern: /register(\w+)Tool\(this\.server\)/g,
	unitTestDir: "test/unit/tools",
	integrationTestDir: "test/integration/specs",
	descriptionPattern:
		/server\.tool\(\s*["']([^"']+)["'],\s*["']([^"']+)["']/,
};

/**
 * Create list tools command
 */
export function createListToolsCommand(): Command {
	return new EntityLister(toolsConfig).createCommand();
}

/**
 * Discover all tools in the project
 * @deprecated Use EntityLister.discoverEntities() instead
 */
export async function discoverTools(
	cwd: string,
	includeExamples = false,
): Promise<ToolInfo[]> {
	return new EntityLister(toolsConfig).discoverEntities(cwd, includeExamples);
}

/**
 * Check which tools are registered in src/index.ts
 * @deprecated Use EntityLister.checkRegistrations() instead
 */
export async function checkToolRegistrations(indexPath: string): Promise<string[]> {
	return new EntityLister(toolsConfig).checkRegistrations(indexPath);
}

/**
 * Filter tools by status
 * @deprecated Use EntityLister.filterEntities() instead
 */
export function filterTools(tools: ToolInfo[], filter: string): ToolInfo[] {
	return new EntityLister(toolsConfig).filterEntities(tools, filter);
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
