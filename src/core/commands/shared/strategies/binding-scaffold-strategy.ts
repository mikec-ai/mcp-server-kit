/**
 * Binding Scaffold Strategy
 *
 * Strategy for scaffolding Cloudflare bindings in MCP servers.
 * Implements only binding-specific logic while orchestrator handles common flow.
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import type {
	BindingScaffoldConfig,
	BindingScaffoldResult,
	BindingTemplateVars,
} from "@/types/binding-types.js";
import { BindingValidator } from "../binding-validator.js";
import { BindingTemplateService } from "../binding-template-service.js";
import {
	addKVBinding,
	addD1Binding,
	addR2Binding,
	addBindingImport,
} from "../config/binding-config-updater.js";
import type {
	ScaffoldStrategy,
	ScaffoldContext,
} from "../orchestration/types.js";

const execAsync = promisify(exec);

/**
 * Convert UPPER_SNAKE_CASE to kebab-case
 */
function toKebabCase(str: string): string {
	return str.toLowerCase().replace(/_/g, "-");
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
 * Strategy for scaffolding Cloudflare bindings
 *
 * Handles: KV, D1 (R2, Queues, etc. planned)
 * NEEDS backup/rollback (modifies config files and creates new files)
 */
export class BindingScaffoldStrategy
	implements ScaffoldStrategy<BindingScaffoldConfig, BindingScaffoldResult>
{
	private validator = new BindingValidator();
	private templateService = new BindingTemplateService();

	/**
	 * Validate binding configuration
	 */
	async validate(cwd: string, config: BindingScaffoldConfig): Promise<void> {
		await this.validator.validateBindingConfig(cwd, config);
	}

	/**
	 * Execute binding scaffolding
	 *
	 * 1. Generate template variables
	 * 2. Create helper file (if not skipped)
	 * 3. Update wrangler.jsonc
	 * 4. Add import to index.ts (if not skipped)
	 * 5. Run cf-typegen (if not skipped)
	 * 6. Generate next steps
	 */
	async execute(
		context: ScaffoldContext<BindingScaffoldConfig, BindingScaffoldResult>,
	): Promise<void> {
		const { cwd, config, result } = context;

		// Step 1: Generate template variables
		const templateVars = this.generateTemplateVars(config);

		// Step 2: Generate and write helper file
		if (!config.skipHelper) {
			const helperPath = await this.templateService.createHelperFile(
				cwd,
				config.bindingType,
				templateVars,
			);
			result.helperPath = helperPath;
			result.filesCreated.push(helperPath);
		}

		// Step 3: Update wrangler.jsonc with binding
		await this.updateWranglerConfig(cwd, config, result);

		// Step 4: Add import statement to index.ts
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

		// Step 5: Run cf-typegen to generate types
		if (!config.skipTypegen) {
			await this.runCfTypegen(cwd, result);
		}

		// Step 6: Generate next steps for user
		result.nextSteps = this.generateNextSteps(config, result);

		result.success = true;
	}

	/**
	 * Bindings need backup (modifies wrangler.jsonc)
	 */
	needsBackup(): boolean {
		return true;
	}

	/**
	 * Create initial result object
	 */
	createResult(): BindingScaffoldResult {
		return {
			success: false,
			bindingType: "kv", // Will be overwritten by config
			bindingName: "", // Will be overwritten by config
			filesCreated: [],
			filesModified: [],
			nextSteps: [],
			warnings: [],
		};
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
		} else if (config.bindingType === "r2") {
			const bucketName = config.bucketName || toKebabCase(config.bindingName);
			modified = await addR2Binding(cwd, config.bindingName, bucketName);
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
				result.warnings?.push("package.json not found, skipping cf-typegen");
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
		const templateVars = this.generateTemplateVars(config);

		if (config.bindingType === "kv") {
			steps.push(
				`1. Create a KV namespace: wrangler kv namespace create ${config.bindingName}`,
			);
			steps.push(
				"2. Update the binding ID in wrangler.jsonc with the namespace ID from step 1",
			);
			steps.push(
				`3. Use the helper class in your tools: new ${templateVars.HELPER_CLASS_NAME}(env.${config.bindingName})`,
			);
		} else if (config.bindingType === "d1") {
			const databaseName =
				config.databaseName || toKebabCase(config.bindingName);
			steps.push(`1. Create a D1 database: wrangler d1 create ${databaseName}`);
			steps.push(
				"2. Update the database_id in wrangler.jsonc with the database ID from step 1",
			);
			steps.push(
				`3. Create your schema: wrangler d1 execute ${databaseName} --file=./schema.sql`,
			);
			steps.push(
				`4. Use the helper class in your tools: new ${templateVars.HELPER_CLASS_NAME}(env.${config.bindingName})`,
			);
		} else if (config.bindingType === "r2") {
			const bucketName = config.bucketName || toKebabCase(config.bindingName);
			steps.push(`1. Create an R2 bucket: wrangler r2 bucket create ${bucketName}`);
			steps.push(
				`2. Use the helper class in your tools: new ${templateVars.HELPER_CLASS_NAME}(env.${config.bindingName})`,
			);
			steps.push(
				`3. Upload objects: await bucket.put('path/to/file.txt', fileData)`,
			);
		}

		steps.push("5. Deploy your changes: npm run deploy");

		return steps;
	}
}
