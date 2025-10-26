/**
 * Validation Service
 *
 * Handles entity validation for add commands
 * Shared logic for validating names, projects, and options
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Configuration for entity validation
 */
export interface ValidationConfig {
	/** Entity type (tool, prompt, resource) */
	entityType: "tool" | "prompt" | "resource";
	/** Directory where entity file will be created */
	sourceDir: string;
}

/**
 * Options for resource-specific validation
 */
export interface ResourceOptions {
	static?: boolean;
	dynamic?: boolean;
	uriPattern?: string;
}

/**
 * Service for validating entity creation
 */
export class ValidationService {
	/**
	 * Validate entity name format
	 *
	 * Names must:
	 * - Start with a lowercase letter
	 * - Contain only lowercase letters, numbers, and hyphens
	 * - Follow kebab-case convention
	 *
	 * @throws Error if name is invalid
	 */
	validateName(name: string, config: ValidationConfig): void {
		const nameRegex = /^[a-z][a-z0-9-]*$/;

		if (!nameRegex.test(name)) {
			const entityName =
				config.entityType.charAt(0).toUpperCase() + config.entityType.slice(1);
			throw new Error(
				`${entityName} name must be lowercase with hyphens (e.g., my-${config.entityType})`,
			);
		}
	}

	/**
	 * Validate we're in a valid MCP project
	 *
	 * @throws Error if not in a valid project
	 */
	validateProject(cwd: string): void {
		const packageJsonPath = join(cwd, "package.json");

		if (!existsSync(packageJsonPath)) {
			throw new Error(
				"Not in a valid project directory (no package.json found)",
			);
		}
	}

	/**
	 * Check if entity file already exists
	 *
	 * @throws Error if entity file already exists
	 */
	validateFileNotExists(cwd: string, name: string, config: ValidationConfig): void {
		const filePath = join(cwd, config.sourceDir, `${name}.ts`);

		if (existsSync(filePath)) {
			const entityName =
				config.entityType.charAt(0).toUpperCase() + config.entityType.slice(1);
			throw new Error(`${entityName} already exists: ${filePath}`);
		}
	}

	/**
	 * Validate all basic requirements for entity creation
	 *
	 * @throws Error if any validation fails
	 */
	validateEntity(cwd: string, name: string, config: ValidationConfig): void {
		this.validateName(name, config);
		this.validateProject(cwd);
		this.validateFileNotExists(cwd, name, config);
	}

	/**
	 * Validate resource-specific options
	 *
	 * @throws Error if options are invalid
	 */
	validateResourceOptions(options: ResourceOptions): void {
		if (options.static && options.dynamic) {
			throw new Error("Cannot use both --static and --dynamic flags");
		}
	}

	/**
	 * Determine URI pattern for a resource
	 *
	 * - If uriPattern is explicitly provided, use it
	 * - If --dynamic flag is set, use dynamic pattern (resource://{id})
	 * - Otherwise, default to static pattern (config://name)
	 */
	determineUriPattern(
		name: string,
		options: ResourceOptions,
	): string {
		if (options.uriPattern) {
			return options.uriPattern;
		}

		if (options.dynamic) {
			// Explicit dynamic pattern
			return "resource://{id}";
		}

		// Default to static pattern (simpler, more common)
		return `config://${name}`;
	}
}
