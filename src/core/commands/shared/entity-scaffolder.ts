/**
 * Entity Scaffolder
 *
 * Orchestrates entity creation by coordinating validation, template generation,
 * and registration services
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { RegistrationService } from "./registration-service.js";
import { ValidationService } from "./validation-service.js";
import { TemplateService } from "./template-service.js";
import { updateTemplateMetadata } from "./metadata.js";
import { toPascalCase } from "./utils.js";
import { ScaffoldConfigSchema, type ScaffoldConfig } from "./schemas.js";
import type { RegistrationConfig } from "./registration-service.js";
import type { ValidationConfig, ResourceOptions } from "./validation-service.js";
import type { ResourceTemplateOptions } from "./template-service.js";

// Re-export ScaffoldConfig type for external use
export type { ScaffoldConfig };

/**
 * Result of scaffolding operation
 */
export interface ScaffoldResult {
	/** Whether scaffolding was successful */
	success: boolean;
	/** Files that were created */
	filesCreated: string[];
	/** Whether entity was registered */
	registered: boolean;
	/** Any warnings or messages */
	messages: string[];
}

/**
 * Service for scaffolding MCP entities
 *
 * Coordinates validation, template generation, and registration
 * to create complete entity implementations with tests
 */
export class EntityScaffolder {
	private registrationService: RegistrationService;
	private validationService: ValidationService;
	private templateService: TemplateService;

	constructor() {
		this.registrationService = new RegistrationService();
		this.validationService = new ValidationService();
		this.templateService = new TemplateService();
	}

	/**
	 * Scaffold a new entity
	 *
	 * @param cwd Current working directory (project root)
	 * @param config Scaffolding configuration
	 * @returns Result with created files and registration status
	 */
	async scaffold(cwd: string, config: ScaffoldConfig): Promise<ScaffoldResult> {
		// Validate configuration with Zod
		const parseResult = ScaffoldConfigSchema.safeParse(config);
		if (!parseResult.success) {
			// Convert Zod errors to user-friendly error messages
			const firstError = parseResult.error.errors[0];
			throw new Error(firstError.message);
		}
		const validatedConfig = parseResult.data;

		const result: ScaffoldResult = {
			success: false,
			filesCreated: [],
			registered: false,
			messages: [],
		};

		const { entityType, name } = validatedConfig;
		const capitalizedName = toPascalCase(name);
		const description = validatedConfig.description || "TODO: Add description";
		const generateTests = validatedConfig.generateTests !== false; // Default true
		const autoRegister = validatedConfig.autoRegister !== false; // Default true

		// Validate
		const validationConfig: ValidationConfig = {
			entityType,
			sourceDir: `src/${entityType}s`,
		};

		this.validationService.validateEntity(cwd, name, validationConfig);

		// Handle resource-specific validation
		if (entityType === "resource" && validatedConfig.resourceOptions) {
			this.validationService.validateResourceOptions(validatedConfig.resourceOptions);
		}

		// Generate entity file
		const entityFilePath = await this.generateEntityFile(
			cwd,
			name,
			capitalizedName,
			description,
			validatedConfig,
		);
		result.filesCreated.push(entityFilePath);

		// Generate test files
		if (generateTests) {
			const testFiles = await this.generateTestFiles(
				cwd,
				name,
				capitalizedName,
				description,
				config,
			);
			result.filesCreated.push(...testFiles);
		}

		// Register entity
		if (autoRegister) {
			const registrationConfig: RegistrationConfig = {
				entityType,
				entityTypePlural: `${entityType}s`,
				directory: `./${entityType}s/`,
				functionSuffix:
					entityType.charAt(0).toUpperCase() + entityType.slice(1),
			};

			await this.registrationService.registerEntity(
				cwd,
				name,
				capitalizedName,
				registrationConfig,
			);
			result.registered = true;
		}

		// Update metadata
		await updateTemplateMetadata(
			cwd,
			`${entityType}s`,
			name,
			`src/${entityType}s/${name}.ts`,
			generateTests,
		);

		result.success = true;
		return result;
	}

	/**
	 * Generate the main entity file
	 */
	private async generateEntityFile(
		cwd: string,
		name: string,
		capitalizedName: string,
		description: string,
		config: ScaffoldConfig,
	): Promise<string> {
		const { entityType, resourceOptions } = config;
		const dirPath = join(cwd, "src", `${entityType}s`);
		const filePath = join(dirPath, `${name}.ts`);

		// Create directory if it doesn't exist
		await mkdir(dirPath, { recursive: true });

		let content: string;

		if (entityType === "resource" && resourceOptions) {
			// Determine URI pattern for resources
			const uriPattern = this.validationService.determineUriPattern(
				name,
				resourceOptions,
			);

			const resourceConfig: ResourceTemplateOptions = {
				entityType,
				name,
				capitalizedName,
				description,
				uriPattern,
			};

			content = this.templateService.generateEntityFile(resourceConfig);
		} else {
			content = this.templateService.generateEntityFile({
				entityType,
				name,
				capitalizedName,
				description,
			});
		}

		await writeFile(filePath, content, "utf-8");
		return filePath;
	}

	/**
	 * Generate unit and integration test files
	 */
	private async generateTestFiles(
		cwd: string,
		name: string,
		capitalizedName: string,
		description: string,
		config: ScaffoldConfig,
	): Promise<string[]> {
		const { entityType, resourceOptions } = config;
		const createdFiles: string[] = [];

		// Generate unit test file
		const unitTestPath = join(
			cwd,
			"test",
			"unit",
			`${entityType}s`,
			`${name}.test.ts`,
		);
		await mkdir(join(cwd, "test", "unit", `${entityType}s`), {
			recursive: true,
		});

		const unitTestContent = this.templateService.generateUnitTestFile({
			entityType,
			name,
			capitalizedName,
			description,
		});

		await writeFile(unitTestPath, unitTestContent, "utf-8");
		createdFiles.push(unitTestPath);

		// Generate integration test file
		const integrationTestDir = join(
			cwd,
			"test",
			"integration",
			"specs",
			entityType === "tool" ? "" : `${entityType}s`,
		);
		await mkdir(integrationTestDir, { recursive: true });

		const integrationTestPath = join(integrationTestDir, `${name}.yaml`);

		let integrationTestContent: string;

		if (entityType === "resource" && resourceOptions) {
			const uriPattern = this.validationService.determineUriPattern(
				name,
				resourceOptions,
			);

			integrationTestContent = this.templateService.generateIntegrationTestYaml(
				{
					entityType,
					name,
					capitalizedName,
					description,
					uriPattern,
				},
			);
		} else {
			integrationTestContent = this.templateService.generateIntegrationTestYaml(
				{
					entityType,
					name,
					capitalizedName,
					description,
				},
			);
		}

		await writeFile(integrationTestPath, integrationTestContent, "utf-8");
		createdFiles.push(integrationTestPath);

		return createdFiles;
	}

	/**
	 * Get emoji for entity type (for console output)
	 */
	static getEntityEmoji(entityType: "tool" | "prompt" | "resource"): string {
		switch (entityType) {
			case "tool":
				return "🔧";
			case "prompt":
				return "📝";
			case "resource":
				return "📦";
		}
	}

	/**
	 * Get entity type display name
	 */
	static getEntityDisplayName(
		entityType: "tool" | "prompt" | "resource",
	): string {
		return entityType.charAt(0).toUpperCase() + entityType.slice(1);
	}
}
