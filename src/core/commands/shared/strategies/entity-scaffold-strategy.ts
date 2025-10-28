/**
 * Entity Scaffold Strategy
 *
 * Strategy for scaffolding MCP entities (tools, prompts, resources).
 * Implements only entity-specific logic while orchestrator handles common flow.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { RegistrationService } from "../registration-service.js";
import { ValidationService } from "../validation-service.js";
import { TemplateService } from "../template-service.js";
import { updateTemplateMetadata } from "../metadata.js";
import { toPascalCase } from "../utils.js";
import { ScaffoldConfigSchema, type ScaffoldConfig } from "../schemas.js";
import type { RegistrationConfig } from "../registration-service.js";
import type { ValidationConfig, ResourceOptions } from "../validation-service.js";
import type { ResourceTemplateOptions } from "../template-service.js";
import type {
	ScaffoldStrategy,
	ScaffoldContext,
} from "../orchestration/types.js";

/**
 * Result of entity scaffolding operation
 */
export interface EntityScaffoldResult {
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
 * Strategy for scaffolding entities
 *
 * Handles: tools, prompts, resources
 * Does NOT need backup/rollback (low risk - only creates new files)
 */
export class EntityScaffoldStrategy
	implements ScaffoldStrategy<ScaffoldConfig, EntityScaffoldResult>
{
	private registrationService: RegistrationService;
	private validationService: ValidationService;
	private templateService: TemplateService;

	constructor() {
		this.registrationService = new RegistrationService();
		this.validationService = new ValidationService();
		this.templateService = new TemplateService();
	}

	/**
	 * Validate entity configuration
	 */
	async validate(cwd: string, config: ScaffoldConfig): Promise<void> {
		// Validate configuration with Zod
		const parseResult = ScaffoldConfigSchema.safeParse(config);
		if (!parseResult.success) {
			const firstError = parseResult.error.errors[0];
			throw new Error(firstError.message);
		}

		const { entityType, name } = parseResult.data;

		// Validate entity
		const validationConfig: ValidationConfig = {
			entityType,
			sourceDir: `src/${entityType}s`,
		};

		this.validationService.validateEntity(cwd, name, validationConfig);

		// Handle resource-specific validation
		if (entityType === "resource" && config.resourceOptions) {
			this.validationService.validateResourceOptions(config.resourceOptions);
		}
	}

	/**
	 * Execute entity scaffolding
	 *
	 * 1. Generate entity file
	 * 2. Generate test files (if enabled)
	 * 3. Register entity (if enabled)
	 * 4. Update metadata
	 */
	async execute(
		context: ScaffoldContext<ScaffoldConfig, EntityScaffoldResult>,
	): Promise<void> {
		const { cwd, config, result } = context;

		const { entityType, name } = config;
		const capitalizedName = toPascalCase(name);
		const description = config.description || "TODO: Add description";
		const generateTests = config.generateTests !== false; // Default true
		const autoRegister = config.autoRegister !== false; // Default true

		// 1. Generate entity file
		const entityFilePath = await this.generateEntityFile(
			cwd,
			name,
			capitalizedName,
			description,
			config,
		);
		result.filesCreated.push(entityFilePath);

		// 2. Generate test files
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

		// 3. Register entity
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

		// 4. Update metadata
		await updateTemplateMetadata(
			cwd,
			`${entityType}s`,
			name,
			`src/${entityType}s/${name}.ts`,
			generateTests,
		);

		result.success = true;
	}

	/**
	 * Entities don't need backup (low risk)
	 */
	needsBackup(): boolean {
		return false;
	}

	/**
	 * Create initial result object
	 */
	createResult(): EntityScaffoldResult {
		return {
			success: false,
			filesCreated: [],
			registered: false,
			messages: [],
		};
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
		const testFiles: string[] = [];

		// Unit test file
		const unitTestPath = await this.generateUnitTest(
			cwd,
			name,
			capitalizedName,
			description,
			entityType,
		);
		testFiles.push(unitTestPath);

		// Integration test file (YAML)
		const integrationTestPath = await this.generateIntegrationTest(
			cwd,
			name,
			capitalizedName,
			description,
			entityType,
			resourceOptions,
		);
		testFiles.push(integrationTestPath);

		return testFiles;
	}

	/**
	 * Generate unit test file
	 */
	private async generateUnitTest(
		cwd: string,
		name: string,
		capitalizedName: string,
		description: string,
		entityType: "tool" | "prompt" | "resource",
	): Promise<string> {
		const dirPath = join(cwd, "test", "unit", `${entityType}s`);
		const filePath = join(dirPath, `${name}.test.ts`);

		await mkdir(dirPath, { recursive: true });

		const content = this.templateService.generateUnitTestFile({
			entityType,
			name,
			capitalizedName,
			description,
		});

		await writeFile(filePath, content, "utf-8");
		return filePath;
	}

	/**
	 * Generate integration test file (YAML)
	 */
	private async generateIntegrationTest(
		cwd: string,
		name: string,
		capitalizedName: string,
		description: string,
		entityType: "tool" | "prompt" | "resource",
		resourceOptions?: ResourceOptions,
	): Promise<string> {
		// Tools go directly in specs/, others in subdirectories
		const dirPath = join(
			cwd,
			"test",
			"integration",
			"specs",
			entityType === "tool" ? "" : `${entityType}s`,
		);
		const filePath = join(dirPath, `${name}.yaml`);

		await mkdir(dirPath, { recursive: true });

		let content: string;

		if (entityType === "resource" && resourceOptions) {
			const uriPattern = this.validationService.determineUriPattern(
				name,
				resourceOptions,
			);

			content = this.templateService.generateIntegrationTestYaml({
				entityType,
				name,
				capitalizedName,
				description,
				uriPattern,
			});
		} else {
			content = this.templateService.generateIntegrationTestYaml({
				entityType,
				name,
				capitalizedName,
				description,
			});
		}

		await writeFile(filePath, content, "utf-8");
		return filePath;
	}
}
