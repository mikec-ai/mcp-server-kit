/**
 * Entity Lister - Shared logic for listing MCP entities
 *
 * Provides a unified way to list tools, prompts, and resources
 * with their registration and test status.
 */

import { Command } from "commander";
import fs from "node:fs/promises";
import path from "node:path";
import { toKebabCase, fileExists } from "./utils.js";

/**
 * Configuration for entity listing
 */
export interface EntityConfig {
	/** Entity type (singular) */
	entityType: "tool" | "prompt" | "resource";
	/** Entity type (plural) */
	entityTypePlural: "tools" | "prompts" | "resources";
	/** Source directory (e.g., 'src/tools') */
	sourceDir: string;
	/** Pattern to match registrations in index.ts */
	registrationPattern: RegExp;
	/** Unit test directory (e.g., 'test/unit/tools') */
	unitTestDir: string;
	/** Integration test directory (e.g., 'test/integration/specs') */
	integrationTestDir: string;
	/** Pattern to extract description from entity file */
	descriptionPattern: RegExp;
}

/**
 * Entity information
 */
export interface EntityInfo {
	name: string;
	file: string;
	registered: boolean;
	hasUnitTest: boolean;
	hasIntegrationTest: boolean;
	description?: string;
}

/**
 * Generic entity lister
 */
export class EntityLister {
	constructor(private config: EntityConfig) {}

	/**
	 * Create Commander command for listing entities
	 */
	createCommand(): Command {
		return new Command(this.config.entityTypePlural)
			.description(
				`List all ${this.config.entityTypePlural} in the MCP server project`,
			)
			.option("-j, --json", "Output as JSON")
			.option(
				"-f, --filter <status>",
				"Filter by status (all, registered, unregistered, tested, untested)",
				"all",
			)
			.option(
				"--show-examples",
				`Include example ${this.config.entityTypePlural} in output`,
			)
			.action(async (options) => {
				const cwd = process.cwd();

				try {
					const entities = await this.discoverEntities(
						cwd,
						options.showExamples,
					);

					// Filter entities
					const filtered = this.filterEntities(entities, options.filter);

					// Output
					if (options.json) {
						console.log(JSON.stringify(filtered, null, 2));
					} else {
						this.printTable(filtered);
					}
				} catch (error) {
					console.error(
						`❌ Error: ${error instanceof Error ? error.message : String(error)}`,
					);
					process.exit(1);
				}
			});
	}

	/**
	 * Discover all entities in the project
	 */
	async discoverEntities(
		cwd: string,
		includeExamples = false,
	): Promise<EntityInfo[]> {
		const entities: EntityInfo[] = [];

		// 1. Scan source directory
		const sourceDir = path.join(cwd, this.config.sourceDir);
		let entityFiles: string[] = [];

		try {
			const files = await fs.readdir(sourceDir);
			entityFiles = files
				.filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
				.filter((f) => includeExamples || !f.startsWith("_example"));
		} catch (error) {
			throw new Error(
				`${this.config.sourceDir}/ directory not found. Are you in an MCP server project?`,
			);
		}

		// 2. Check index.ts for registrations
		const indexPath = path.join(cwd, "src", "index.ts");
		const registeredEntities = await this.checkRegistrations(indexPath);

		// 3. Build entity info
		for (const file of entityFiles) {
			const entityName = path.basename(file, ".ts");
			const entityPath = path.join(sourceDir, file);

			// Check registration
			const registered = registeredEntities.includes(entityName);

			// Check unit test
			const unitTestPath = path.join(
				cwd,
				this.config.unitTestDir,
				`${entityName}.test.ts`,
			);
			const hasUnitTest = await fileExists(unitTestPath);

			// Check integration test
			const integrationTestPath = path.join(
				cwd,
				this.config.integrationTestDir,
				`${entityName}.yaml`,
			);
			const hasIntegrationTest = await fileExists(integrationTestPath);

			// Try to extract description from file
			const description = await this.extractDescription(entityPath);

			entities.push({
				name: entityName,
				file: path.relative(cwd, entityPath),
				registered,
				hasUnitTest,
				hasIntegrationTest,
				description,
			});
		}

		return entities;
	}

	/**
	 * Check which entities are registered in src/index.ts
	 */
	async checkRegistrations(indexPath: string): Promise<string[]> {
		try {
			const content = await fs.readFile(indexPath, "utf-8");
			const registered: string[] = [];

			let match: RegExpExecArray | null;

			while ((match = this.config.registrationPattern.exec(content)) !== null) {
				const entityName = toKebabCase(match[1]);
				registered.push(entityName);
			}

			return registered;
		} catch (error) {
			return [];
		}
	}

	/**
	 * Filter entities by status
	 */
	filterEntities(entities: EntityInfo[], filter: string): EntityInfo[] {
		switch (filter.toLowerCase()) {
			case "registered":
				return entities.filter((e) => e.registered);
			case "unregistered":
				return entities.filter((e) => !e.registered);
			case "tested":
				return entities.filter((e) => e.hasUnitTest || e.hasIntegrationTest);
			case "untested":
				return entities.filter((e) => !e.hasUnitTest && !e.hasIntegrationTest);
			case "all":
			default:
				return entities;
		}
	}

	/**
	 * Print entities in a formatted table
	 */
	printTable(entities: EntityInfo[]): void {
		if (entities.length === 0) {
			console.log(`No ${this.config.entityTypePlural} found.\n`);
			return;
		}

		console.log(
			`\nFound ${entities.length} ${entities.length === 1 ? this.config.entityType : this.config.entityTypePlural}:\n`,
		);

		// Calculate column widths
		const nameWidth = Math.max(10, ...entities.map((e) => e.name.length));
		const fileWidth = Math.max(20, ...entities.map((e) => e.file.length));

		// Header
		const header = `${"NAME".padEnd(nameWidth)} | REG | UNIT | INT | ${"FILE".padEnd(fileWidth)}`;
		console.log(header);
		console.log("=".repeat(header.length));

		// Rows
		for (const entity of entities) {
			const name = entity.name.padEnd(nameWidth);
			const reg = entity.registered ? " ✓ " : " ✗ ";
			const unit = entity.hasUnitTest ? " ✓ " : " ✗ ";
			const int = entity.hasIntegrationTest ? " ✓ " : " ✗ ";
			const file = entity.file.padEnd(fileWidth);

			console.log(`${name} | ${reg} | ${unit} | ${int} | ${file}`);

			// Show description if available
			if (entity.description && entity.description !== "No description") {
				console.log(`${"".padEnd(nameWidth)}   ${entity.description}`);
			}
		}

		// Summary
		const registered = entities.filter((e) => e.registered).length;
		const withUnitTests = entities.filter((e) => e.hasUnitTest).length;
		const withIntegrationTests = entities.filter(
			(e) => e.hasIntegrationTest,
		).length;

		console.log("\nSummary:");
		console.log(`  Registered:       ${registered}/${entities.length}`);
		console.log(`  Unit tests:       ${withUnitTests}/${entities.length}`);
		console.log(
			`  Integration tests: ${withIntegrationTests}/${entities.length}`,
		);
		console.log("");
	}

	/**
	 * Extract description from entity file
	 */
	private async extractDescription(filePath: string): Promise<string> {
		try {
			const content = await fs.readFile(filePath, "utf-8");

			// Look for server.{tool|prompt|resource}() call and extract description parameter
			const match = content.match(this.config.descriptionPattern);

			if (match && match[2]) {
				return match[2];
			}

			// Fallback: look for file header comment
			const headerRegex = /\/\*\*[\s\S]*?\*\s*([^\n]+)/;
			const headerMatch = content.match(headerRegex);

			if (headerMatch && headerMatch[1]) {
				return headerMatch[1].trim();
			}

			return "No description";
		} catch (error) {
			return "No description";
		}
	}
}
