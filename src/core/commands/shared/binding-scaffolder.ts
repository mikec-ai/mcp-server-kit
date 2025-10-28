/**
 * Binding Scaffolder
 *
 * Main orchestration class for adding Cloudflare bindings to MCP servers.
 * Coordinates all binding-related operations with rollback support.
 *
 * Follows the same pattern as AuthScaffolder with comprehensive validation.
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import type {
	BindingScaffoldConfig,
	BindingScaffoldResult,
	BindingTemplateVars,
} from "@/types/binding-types.js";
import { BindingValidator } from "./binding-validator.js";
import { BindingTemplateService } from "./binding-template-service.js";
import {
	addKVBinding,
	addD1Binding,
	addBindingImport,
} from "./config/binding-config-updater.js";
import {
	createBackup,
	restoreFromBackup,
	removeBackup,
} from "./backup-restore.js";

const execAsync = promisify(exec);

/**
 * Convert UPPER_SNAKE_CASE to kebab-case
 */
function toKebabCase(str: string): string {
	return str
		.toLowerCase()
		.replace(/_/g, "-");
}

/**
 * Convert UPPER_SNAKE_CASE to camelCase
 */
function toCamelCase(str: string): string {
	const kebab = toKebabCase(str);
	return kebab.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert UPPER_SNAKE_CASE to PascalCase
 */
function toPascalCase(str: string): string {
	const camel = toCamelCase(str);
	return camel.charAt(0).toUpperCase() + camel.slice(1);
}

/**
 * Service for scaffolding Cloudflare bindings
 */
export class BindingScaffolder {
	private validator = new BindingValidator();
	private templateService = new BindingTemplateService();

	/**
	 * Add a Cloudflare binding to an MCP server project
	 *
	 * @param cwd - Project root directory
	 * @param config - Binding configuration
	 * @returns Result with paths to created/modified files
	 */
	async scaffold(
		cwd: string,
		config: BindingScaffoldConfig,
	): Promise<BindingScaffoldResult> {
		const result: BindingScaffoldResult = {
			success: false,
			bindingType: config.bindingType,
			bindingName: config.bindingName,
			filesCreated: [],
			filesModified: [],
			nextSteps: [],
			warnings: [],
		};

		let backupDir: string | undefined;

		try {
			// Step 1: Validate configuration
			await this.validator.validateBindingConfig(cwd, config);

			// Step 2: Create backup (for rollback on failure)
			if (!config.skipHelper) {
				backupDir = await createBackup(cwd);
			}

			// Step 3: Generate template variables
			const templateVars = this.generateTemplateVars(config);

			// Step 4: Generate and write helper file
			if (!config.skipHelper) {
				const helperPath = await this.templateService.createHelperFile(
					cwd,
					config.bindingType,
					templateVars,
				);
				result.helperPath = helperPath;
				result.filesCreated.push(helperPath);
			}

			// Step 5: Update wrangler.jsonc with binding
			await this.updateWranglerConfig(cwd, config, result);

			// Step 6: Add import statement to index.ts
			if (!config.skipHelper) {
				const importStatement = this.templateService.generateImportStatement(
					templateVars.HELPER_CLASS_NAME,
					config.bindingType,
					templateVars.KEBAB_NAME,
				);

				const importAdded = await addBindingImport(cwd, importStatement);
				if (importAdded) {
					result.filesModified.push(`${cwd}/src/index.ts`);
				}
			}

			// Step 7: Run cf-typegen to generate types
			if (!config.skipTypegen) {
				await this.runCfTypegen(cwd, result);
			}

			// Step 8: Generate next steps for user
			result.nextSteps = this.generateNextSteps(config, result);

			// Success - remove backup
			if (backupDir) {
				await removeBackup(backupDir);
			}

			result.success = true;
			return result;
		} catch (error) {
			// Rollback on failure
			if (backupDir) {
				try {
					await restoreFromBackup(backupDir, cwd);
					await removeBackup(backupDir);
					result.warnings?.push(
						"Changes have been rolled back due to error",
					);
				} catch (rollbackError) {
					result.warnings?.push(
						`Rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`,
					);
				}
			}

			result.success = false;
			result.error =
				error instanceof Error ? error.message : String(error);
			return result;
		}
	}

	/**
	 * Generate template variables from binding configuration
	 */
	private generateTemplateVars(
		config: BindingScaffoldConfig,
	): BindingTemplateVars {
		const kebabName = toKebabCase(config.bindingName);
		const pascalName = toPascalCase(config.bindingName);
		const camelName = toCamelCase(config.bindingName);

		// Type suffix (KV, D1, R2, etc.)
		const typeSuffix = config.bindingType.toUpperCase();

		const vars: BindingTemplateVars = {
			BINDING_NAME: config.bindingName,
			HELPER_CLASS_NAME: `${pascalName}${typeSuffix}`,
			KEBAB_NAME: kebabName,
			CAMEL_NAME: camelName,
			TYPE_SUFFIX: typeSuffix,
		};

		// Add binding-specific variables
		if (config.bindingType === "d1") {
			vars.DATABASE_NAME = config.databaseName || kebabName;
		}

		if (config.bindingType === "r2") {
			vars.BUCKET_NAME = config.bucketName || kebabName;
		}

		return vars;
	}

	/**
	 * Update wrangler.jsonc with binding configuration
	 */
	private async updateWranglerConfig(
		cwd: string,
		config: BindingScaffoldConfig,
		result: BindingScaffoldResult,
	): Promise<void> {
		let modified = false;

		if (config.bindingType === "kv") {
			modified = await addKVBinding(cwd, config.bindingName);
		} else if (config.bindingType === "d1") {
			const databaseName =
				config.databaseName || toKebabCase(config.bindingName);
			modified = await addD1Binding(cwd, config.bindingName, databaseName);
		} else {
			throw new Error(
				`Binding type '${config.bindingType}' is not yet implemented`,
			);
		}

		if (modified) {
			result.filesModified.push(`${cwd}/wrangler.jsonc`);
		}
	}

	/**
	 * Run cf-typegen to generate TypeScript types from wrangler.jsonc
	 */
	private async runCfTypegen(
		cwd: string,
		result: BindingScaffoldResult,
	): Promise<void> {
		try {
			// Check if cf-typegen script exists in package.json
			const packageJsonPath = `${cwd}/package.json`;
			if (!existsSync(packageJsonPath)) {
				result.warnings?.push(
					"package.json not found, skipping cf-typegen",
				);
				return;
			}

			// Run cf-typegen
			const { stdout, stderr } = await execAsync("npm run cf-typegen", {
				cwd,
				timeout: 30000, // 30 second timeout
			});

			if (stderr && !stderr.includes("WARN")) {
				result.warnings?.push(`cf-typegen warnings: ${stderr}`);
			}

			// Add worker-configuration.d.ts to modified files
			const workerConfigPath = `${cwd}/worker-configuration.d.ts`;
			if (existsSync(workerConfigPath)) {
				result.filesModified.push(workerConfigPath);
			}
		} catch (error) {
			result.warnings?.push(
				`Failed to run cf-typegen: ${error instanceof Error ? error.message : String(error)}. Run 'npm run cf-typegen' manually.`,
			);
		}
	}

	/**
	 * Generate next steps for the user
	 */
	private generateNextSteps(
		config: BindingScaffoldConfig,
		result: BindingScaffoldResult,
	): string[] {
		const steps: string[] = [];

		if (config.bindingType === "kv") {
			steps.push(
				`1. Create a KV namespace: wrangler kv namespace create ${config.bindingName}`,
			);
			steps.push(
				"2. Update the binding ID in wrangler.jsonc with the namespace ID from step 1",
			);
			steps.push(
				`3. Use the helper class in your tools: new ${this.generateTemplateVars(config).HELPER_CLASS_NAME}(env.${config.bindingName})`,
			);
		} else if (config.bindingType === "d1") {
			const databaseName =
				config.databaseName || toKebabCase(config.bindingName);
			steps.push(
				`1. Create a D1 database: wrangler d1 create ${databaseName}`,
			);
			steps.push(
				"2. Update the database_id in wrangler.jsonc with the database ID from step 1",
			);
			steps.push(
				`3. Create your schema: wrangler d1 execute ${databaseName} --file=./schema.sql`,
			);
			steps.push(
				`4. Use the helper class in your tools: new ${this.generateTemplateVars(config).HELPER_CLASS_NAME}(env.${config.bindingName})`,
			);
		}

		steps.push("5. Deploy your changes: npm run deploy");

		return steps;
	}
}
