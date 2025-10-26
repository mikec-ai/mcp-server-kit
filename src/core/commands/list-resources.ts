/**
 * List Resources Command
 *
 * Lists all resources in the MCP server project with their status:
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
 * Resource information
 */
export interface ResourceInfo extends EntityInfo {}

/**
 * Configuration for listing resources
 */
const resourcesConfig: EntityConfig = {
	entityType: "resource",
	entityTypePlural: "resources",
	sourceDir: "src/resources",
	registrationPattern: /register(\w+)Resource\(this\.server\)/g,
	unitTestDir: "test/unit/resources",
	integrationTestDir: "test/integration/specs/resources",
	descriptionPattern:
		/server\.resource\(\s*["']([^"']+)["'],\s*["']([^"']+)["']/,
};

/**
 * Create list resources command
 */
export function createListResourcesCommand(): Command {
	return new EntityLister(resourcesConfig).createCommand();
}

/**
 * Discover all resources in the project
 * @deprecated Use EntityLister.discoverEntities() instead
 */
export async function discoverResources(
	cwd: string,
	includeExamples = false,
): Promise<ResourceInfo[]> {
	return new EntityLister(resourcesConfig).discoverEntities(cwd, includeExamples);
}

/**
 * Check which resources are registered in src/index.ts
 * @deprecated Use EntityLister.checkRegistrations() instead
 */
export async function checkResourceRegistrations(
	indexPath: string,
): Promise<string[]> {
	return new EntityLister(resourcesConfig).checkRegistrations(indexPath);
}

/**
 * Filter resources by status
 * @deprecated Use EntityLister.filterEntities() instead
 */
export function filterResources(
	resources: ResourceInfo[],
	filter: string,
): ResourceInfo[] {
	return new EntityLister(resourcesConfig).filterEntities(resources, filter);
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
