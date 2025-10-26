/**
 * Template Metadata Management
 *
 * Functions for reading and updating .mcp-template.json
 */

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";

/**
 * Entity metadata structure
 */
export interface EntityMetadata {
	name: string;
	file: string;
	registered: boolean;
	hasUnitTest: boolean;
	hasIntegrationTest: boolean;
}

/**
 * Supported entity types
 */
export type EntityType = "tools" | "prompts" | "resources";

/**
 * Update .mcp-template.json with new entity metadata
 *
 * @param cwd - Current working directory
 * @param entityType - Type of entity (tools, prompts, resources)
 * @param name - Entity name (kebab-case)
 * @param fileSubpath - Path to entity file relative to project root (e.g., "src/tools/my-tool.ts")
 * @param hasTests - Whether tests were generated
 *
 * @example
 * await updateTemplateMetadata(
 *   process.cwd(),
 *   "tools",
 *   "my-tool",
 *   "src/tools/my-tool.ts",
 *   true
 * );
 */
export async function updateTemplateMetadata(
	cwd: string,
	entityType: EntityType,
	name: string,
	fileSubpath: string,
	hasTests: boolean,
): Promise<void> {
	const metadataPath = join(cwd, ".mcp-template.json");

	if (!existsSync(metadataPath)) {
		return; // Optional file
	}

	try {
		const content = await readFile(metadataPath, "utf-8");
		const metadata = JSON.parse(content);

		// Initialize array if it doesn't exist
		if (!metadata[entityType]) {
			metadata[entityType] = [];
		}

		// Add new entity
		const entityMetadata: EntityMetadata = {
			name,
			file: fileSubpath,
			registered: true,
			hasUnitTest: hasTests,
			hasIntegrationTest: hasTests,
		};

		metadata[entityType].push(entityMetadata);

		await writeFile(metadataPath, JSON.stringify(metadata, null, "\t"), "utf-8");
	} catch (error) {
		console.warn(`  ⚠️  Could not update .mcp-template.json: ${error}`);
	}
}

/**
 * Read template metadata from .mcp-template.json
 *
 * @param cwd - Current working directory
 * @returns Parsed metadata or null if file doesn't exist
 *
 * @example
 * const metadata = await readTemplateMetadata(process.cwd());
 * if (metadata) {
 *   console.log(metadata.tools);
 * }
 */
export async function readTemplateMetadata(
	cwd: string,
): Promise<Record<string, unknown> | null> {
	const metadataPath = join(cwd, ".mcp-template.json");

	if (!existsSync(metadataPath)) {
		return null;
	}

	try {
		const content = await readFile(metadataPath, "utf-8");
		return JSON.parse(content);
	} catch (error) {
		console.warn(`  ⚠️  Could not read .mcp-template.json: ${error}`);
		return null;
	}
}
