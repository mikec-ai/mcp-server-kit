/**
 * Binding Validator Service
 *
 * Validates binding configuration before scaffolding.
 * Ensures binding names, project structure, and anchors are valid.
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type {
	BindingScaffoldConfig,
	BindingValidationError,
	BindingValidatorOptions,
	WranglerBindingConfig,
} from "@/types/binding-types.js";
import { getWranglerKey, isPhase1Binding } from "@/types/binding-types.js";
import { AnchorService, BINDING_ANCHORS } from "./anchor-service.js";

/**
 * Service for validating binding configuration
 */
export class BindingValidator {
	private anchorService = new AnchorService();

	/**
	 * Validate binding configuration before scaffolding
	 *
	 * @throws {Error} If validation fails
	 */
	async validateBindingConfig(
		cwd: string,
		config: BindingScaffoldConfig,
		options: BindingValidatorOptions = {},
	): Promise<void> {
		const {
			checkDuplicates = true,
			checkAnchors = true,
			checkProjectStructure = true,
		} = options;

		const errors: BindingValidationError[] = [];

		// 1. Validate project structure
		if (checkProjectStructure) {
			const structureErrors = await this.validateProjectStructure(cwd);
			errors.push(...structureErrors);
		}

		// 2. Validate binding name format
		const nameError = this.validateBindingName(config.bindingName);
		if (nameError) {
			errors.push(nameError);
		}

		// 3. Validate binding type is supported
		const typeError = this.validateBindingType(config.bindingType);
		if (typeError) {
			errors.push(typeError);
		}

		// 4. Validate binding-specific requirements
		const specificErrors = this.validateBindingSpecific(config);
		errors.push(...specificErrors);

		// 5. Check for duplicate bindings
		if (checkDuplicates) {
			const duplicateError = await this.validateNoDuplicateBinding(cwd, config);
			if (duplicateError) {
				errors.push(duplicateError);
			}
		}

		// 6. Validate required anchors exist
		if (checkAnchors) {
			const anchorErrors = await this.validateAnchorsExist(cwd, config);
			errors.push(...anchorErrors);
		}

		// Throw error if any validation failed
		if (errors.length > 0) {
			const errorMessages = errors.map((e) => {
				let msg = e.message;
				if (e.field) msg = `${e.field}: ${msg}`;
				if (e.suggestion) msg += ` (${e.suggestion})`;
				return msg;
			});
			throw new Error(
				`Binding validation failed:\n${errorMessages.map((m) => `  - ${m}`).join("\n")}`,
			);
		}
	}

	/**
	 * Validate project has required structure
	 */
	private async validateProjectStructure(
		cwd: string,
	): Promise<BindingValidationError[]> {
		const errors: BindingValidationError[] = [];

		// Check wrangler.jsonc exists
		const wranglerPath = join(cwd, "wrangler.jsonc");
		if (!existsSync(wranglerPath)) {
			errors.push({
				message: "wrangler.jsonc not found",
				field: "project",
				suggestion:
					"This command must be run from a Cloudflare Workers MCP server project",
			});
		}

		// Check package.json exists
		const packagePath = join(cwd, "package.json");
		if (!existsSync(packagePath)) {
			errors.push({
				message: "package.json not found",
				field: "project",
				suggestion: "This command must be run from an MCP server project",
			});
		}

		// Check src directory exists
		const srcPath = join(cwd, "src");
		if (!existsSync(srcPath)) {
			errors.push({
				message: "src directory not found",
				field: "project",
				suggestion: "This command must be run from an MCP server project",
			});
		}

		return errors;
	}

	/**
	 * Validate binding name format
	 *
	 * Binding names must be uppercase with underscores (UPPER_SNAKE_CASE)
	 * Examples: MY_CACHE, USER_DATA, PRODUCT_DB
	 */
	private validateBindingName(name: string): BindingValidationError | null {
		// Must start with uppercase letter
		if (!/^[A-Z]/.test(name)) {
			return {
				message: "Binding name must start with an uppercase letter",
				field: "bindingName",
				suggestion: `Use UPPER_SNAKE_CASE format (e.g., ${name.toUpperCase()})`,
			};
		}

		// Must only contain uppercase letters, numbers, and underscores
		if (!/^[A-Z][A-Z0-9_]*$/.test(name)) {
			return {
				message:
					"Binding name must only contain uppercase letters, numbers, and underscores",
				field: "bindingName",
				suggestion: "Use UPPER_SNAKE_CASE format (e.g., MY_CACHE, USER_DATA)",
			};
		}

		// Cannot end with underscore
		if (name.endsWith("_")) {
			return {
				message: "Binding name cannot end with an underscore",
				field: "bindingName",
				suggestion: `Remove trailing underscore: ${name.slice(0, -1)}`,
			};
		}

		// Cannot have consecutive underscores
		if (name.includes("__")) {
			return {
				message: "Binding name cannot have consecutive underscores",
				field: "bindingName",
				suggestion: "Use single underscores to separate words",
			};
		}

		return null;
	}

	/**
	 * Validate binding type is supported
	 */
	private validateBindingType(type: string): BindingValidationError | null {
		const supportedTypes = [
			"kv",
			"d1",
			"r2",
			"queues",
			"ai",
			"vectorize",
			"hyperdrive",
		];

		if (!supportedTypes.includes(type)) {
			return {
				message: `Unsupported binding type: ${type}`,
				field: "bindingType",
				suggestion: `Supported types: ${supportedTypes.join(", ")}`,
			};
		}

		// Check if binding type is implemented (Phase 1 only)
		if (!isPhase1Binding(type as any)) {
			return {
				message: `Binding type '${type}' is not yet implemented`,
				field: "bindingType",
				suggestion: "Phase 1 supports: kv, d1",
			};
		}

		return null;
	}

	/**
	 * Validate binding-specific requirements
	 */
	private validateBindingSpecific(
		config: BindingScaffoldConfig,
	): BindingValidationError[] {
		const errors: BindingValidationError[] = [];

		// D1 requires database name or binding name to generate it
		if (config.bindingType === "d1") {
			// Database name is optional but must be valid if provided
			if (
				config.databaseName &&
				!/^[a-z0-9-]+$/.test(config.databaseName)
			) {
				errors.push({
					message: "D1 database name must be lowercase with hyphens only",
					field: "databaseName",
					suggestion:
						"Use lowercase letters, numbers, and hyphens (e.g., my-database)",
				});
			}
		}

		// R2 requires bucket name or binding name to generate it (Phase 2)
		if (config.bindingType === "r2") {
			if (config.bucketName && !/^[a-z0-9-]+$/.test(config.bucketName)) {
				errors.push({
					message: "R2 bucket name must be lowercase with hyphens only",
					field: "bucketName",
					suggestion:
						"Use lowercase letters, numbers, and hyphens (e.g., my-bucket)",
				});
			}
		}

		return errors;
	}

	/**
	 * Check if binding already exists in wrangler.jsonc
	 */
	private async validateNoDuplicateBinding(
		cwd: string,
		config: BindingScaffoldConfig,
	): Promise<BindingValidationError | null> {
		const wranglerPath = join(cwd, "wrangler.jsonc");

		try {
			const content = await readFile(wranglerPath, "utf-8");

			// Parse JSONC (remove comments)
			const jsonContent = content.replace(/\/\/.*$/gm, "");
			const wranglerConfig = JSON.parse(jsonContent) as WranglerBindingConfig;

			// Get wrangler key for this binding type
			const key = getWranglerKey(config.bindingType);

			// Check if binding already exists
			let bindingExists = false;

			if (config.bindingType === "kv") {
				const kvBindings = wranglerConfig.kv_namespaces || [];
				bindingExists = kvBindings.some(
					(b) => b.binding === config.bindingName,
				);
			} else if (config.bindingType === "d1") {
				const d1Bindings = wranglerConfig.d1_databases || [];
				bindingExists = d1Bindings.some(
					(b) => b.binding === config.bindingName,
				);
			} else if (config.bindingType === "r2") {
				const r2Bindings = wranglerConfig.r2_buckets || [];
				bindingExists = r2Bindings.some(
					(b) => b.binding === config.bindingName,
				);
			} else if (config.bindingType === "ai") {
				bindingExists = wranglerConfig.ai?.binding === config.bindingName;
			} else if (config.bindingType === "vectorize") {
				const vectorizeBindings = wranglerConfig.vectorize || [];
				bindingExists = vectorizeBindings.some(
					(b) => b.binding === config.bindingName,
				);
			} else if (config.bindingType === "hyperdrive") {
				const hyperdriveBindings = wranglerConfig.hyperdrive || [];
				bindingExists = hyperdriveBindings.some(
					(b) => b.binding === config.bindingName,
				);
			}

			if (bindingExists) {
				return {
					message: `Binding '${config.bindingName}' already exists in wrangler.jsonc`,
					field: "bindingName",
					suggestion: "Choose a different binding name or remove the existing one",
				};
			}
		} catch (error: any) {
			// If we can't parse wrangler.jsonc, warn but don't fail
			// (anchor service will handle the actual insertion)
			if (error.message?.includes("JSON")) {
				return {
					message: "Failed to parse wrangler.jsonc",
					field: "wrangler",
					suggestion:
						"Ensure wrangler.jsonc is valid JSONC format before adding bindings",
				};
			}
		}

		return null;
	}

	/**
	 * Validate required anchor blocks exist
	 */
	private async validateAnchorsExist(
		cwd: string,
		config: BindingScaffoldConfig,
	): Promise<BindingValidationError[]> {
		const errors: BindingValidationError[] = [];

		// Check wrangler.jsonc has binding anchor
		const wranglerPath = join(cwd, "wrangler.jsonc");
		const bindingAnchor = this.getBindingAnchor(config.bindingType);

		if (bindingAnchor) {
			const hasWranglerAnchor =
				await this.anchorService.hasAnchor(wranglerPath, bindingAnchor);
			if (!hasWranglerAnchor) {
				errors.push({
					message: `Missing anchor block in wrangler.jsonc: ${bindingAnchor.type}`,
					field: "anchors",
					suggestion:
						"Your project may be outdated. Re-scaffold with latest template or add anchor manually",
				});
			}
		}

		// Check index.ts has imports anchor
		const indexPath = join(cwd, "src", "index.ts");
		const hasImportsAnchor = await this.anchorService.hasAnchor(
			indexPath,
			BINDING_ANCHORS.IMPORTS,
		);
		if (!hasImportsAnchor) {
			errors.push({
				message: `Missing anchor block in src/index.ts: ${BINDING_ANCHORS.IMPORTS.type}`,
				field: "anchors",
				suggestion:
					"Your project may be outdated. Re-scaffold with latest template or add anchor manually",
			});
		}

		return errors;
	}

	/**
	 * Get the anchor block for a binding type
	 */
	private getBindingAnchor(type: string): (typeof BINDING_ANCHORS)[keyof typeof BINDING_ANCHORS] | null {
		switch (type) {
			case "kv":
				return BINDING_ANCHORS.KV;
			case "d1":
				return BINDING_ANCHORS.D1;
			case "r2":
				return BINDING_ANCHORS.R2;
			case "queues":
				return BINDING_ANCHORS.QUEUES_PRODUCERS;
			case "ai":
				return BINDING_ANCHORS.AI;
			case "vectorize":
				return BINDING_ANCHORS.VECTORIZE;
			case "hyperdrive":
				return BINDING_ANCHORS.HYPERDRIVE;
			default:
				return null;
		}
	}
}
