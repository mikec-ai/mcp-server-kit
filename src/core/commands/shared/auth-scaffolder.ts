/**
 * Auth Scaffolder
 *
 * Main orchestration class for adding authentication to MCP servers.
 * Coordinates all auth-related operations with rollback support.
 *
 * Now includes comprehensive validation with automatic rollback on failure.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { AddAuthOptions, AddAuthResult } from "../../../types/command-results.js";
import {
	detectPlatform,
	getEntryPointPath,
	type Platform,
} from "./platform-detection.js";
import {
	createBackup,
	restoreFromBackup,
	removeBackup,
} from "./backup-restore.js";
import {
	generateAuthTypesTemplate,
	generateAuthConfigTemplate,
	generateStytchProviderTemplate,
	generateAuth0ProviderTemplate,
	generateWorkOSProviderTemplate,
	generateEnvExampleTemplate,
	type AuthProvider,
} from "./auth-templates.js";
import {
	getAuthDependencies,
	addDependenciesToPackageJson,
} from "./dependency-manager.js";
import {
	addAuthToEntryPoint,
	hasAuthentication,
} from "./entry-point-transformer.js";
import {
	updateWranglerConfig,
	updateVercelConfig,
	updateEnvExample,
} from "./config/auth-config-updater.js";
import { getWranglerConfigPath } from "./config/wrangler-utils.js";
import { ValidationGate } from "./validation-gate.js";

export class AuthScaffolder {
	/**
	 * Add authentication to an MCP server project
	 */
	async addAuth(options: AddAuthOptions): Promise<AddAuthResult> {
		const cwd = options.cwd || process.cwd();
		const provider = options.provider;
		const dryRun = options.dryRun || false;
		const createBackupOption = options.backup !== false; // Default true

		const result: AddAuthResult = {
			success: false,
			provider,
			platform: "unknown",
			filesCreated: [],
			filesModified: [],
			warnings: [],
		};

		let backupDir: string | undefined;

		try {
			// Step 1: Validate project
			await this.validateProject(cwd);

			// Step 2: Detect platform
			const detectedPlatform = options.platform || (await detectPlatform(cwd));
			result.platform = detectedPlatform;

			if (detectedPlatform === "unknown") {
				throw new Error(
					"Could not detect platform. Please specify --platform cloudflare or --platform vercel",
				);
			}

			// Type assertion: after validation, platform is guaranteed to be cloudflare or vercel
			const platform = detectedPlatform as "cloudflare" | "vercel";

			// Step 3: Check for existing auth
			const entryPoint = getEntryPointPath(cwd, platform);
			if (existsSync(entryPoint) && (await hasAuthentication(entryPoint))) {
				if (!options.force) {
					throw new Error(
						"Authentication is already configured. Use --force to overwrite.",
					);
				}
				result.warnings?.push("Overwriting existing authentication configuration");
			}

			// Step 4: Create backup
			if (createBackupOption && !dryRun) {
				backupDir = await createBackup(cwd);
				result.backupDir = backupDir;
			}

			if (dryRun) {
				result.warnings?.push("DRY RUN: No changes will be made");
				result.success = true;
				return result;
			}

			// Step 5: Create auth directory structure
			const authDir = join(cwd, "src/auth");
			await mkdir(authDir, { recursive: true });
			await mkdir(join(authDir, "providers"), { recursive: true });

			// Step 6: Generate auth files
			await this.generateAuthFiles(cwd, provider, result);

			// Step 7: Add dependencies
			await this.addDependencies(cwd, provider, platform, result);

			// Step 8: Transform entry point
			await this.transformEntryPoint(cwd, platform, result);

			// Step 9: Update config files
			await this.updateConfigFiles(cwd, provider, platform, result);

			// Step 10: Validate transformations
			await this.validateTransformations(cwd, provider, backupDir, result);

			// Success - remove backup if created
			if (backupDir) {
				await removeBackup(backupDir);
				result.backupDir = undefined;
			}

			result.success = true;
			return result;
		} catch (error) {
			// Rollback on failure
			if (backupDir && !dryRun) {
				try {
					await restoreFromBackup(backupDir, cwd);
					await removeBackup(backupDir);
				} catch (rollbackError) {
					result.warnings?.push(
						`Rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`,
					);
				}
			}

			result.error =
				error instanceof Error ? error.message : String(error);
			return result;
		}
	}

	/**
	 * Validate that this is an MCP project
	 */
	private async validateProject(cwd: string): Promise<void> {
		// Check for package.json
		if (!existsSync(join(cwd, "package.json"))) {
			throw new Error("No package.json found. Is this an MCP project?");
		}

		// Check for src directory
		if (!existsSync(join(cwd, "src"))) {
			throw new Error("No src directory found. Is this an MCP project?");
		}
	}

	/**
	 * Generate authentication files
	 */
	private async generateAuthFiles(
		cwd: string,
		provider: AuthProvider,
		result: AddAuthResult,
	): Promise<void> {
		const authDir = join(cwd, "src/auth");

		// Generate types.ts
		const typesPath = join(authDir, "types.ts");
		await writeFile(typesPath, generateAuthTypesTemplate());
		result.filesCreated.push(typesPath);

		// Generate config.ts
		const configPath = join(authDir, "config.ts");
		await writeFile(configPath, generateAuthConfigTemplate(provider));
		result.filesCreated.push(configPath);

		// Generate provider implementation
		const providerPath = join(authDir, `providers/${provider}.ts`);
		let providerTemplate: string;

		switch (provider) {
			case "stytch":
				providerTemplate = generateStytchProviderTemplate();
				break;
			case "auth0":
				providerTemplate = generateAuth0ProviderTemplate();
				break;
			case "workos":
				providerTemplate = generateWorkOSProviderTemplate();
				break;
		}

		await writeFile(providerPath, providerTemplate);
		result.filesCreated.push(providerPath);
	}

	/**
	 * Add authentication dependencies
	 */
	private async addDependencies(
		cwd: string,
		provider: AuthProvider,
		platform: "cloudflare" | "vercel",
		result: AddAuthResult,
	): Promise<void> {
		const deps = getAuthDependencies(provider, platform);
		const modified = await addDependenciesToPackageJson(cwd, deps);

		if (modified) {
			result.filesModified.push(join(cwd, "package.json"));
		}
	}

	/**
	 * Transform entry point to add authentication
	 */
	private async transformEntryPoint(
		cwd: string,
		platform: "cloudflare" | "vercel",
		result: AddAuthResult,
	): Promise<void> {
		const entryPoint = getEntryPointPath(cwd, platform);

		if (!existsSync(entryPoint)) {
			throw new Error(`Entry point not found: ${entryPoint}`);
		}

		const modified = await addAuthToEntryPoint(entryPoint, platform);

		if (modified) {
			result.filesModified.push(entryPoint);
		}
	}

	/**
	 * Update platform-specific config files
	 */
	private async updateConfigFiles(
		cwd: string,
		provider: AuthProvider,
		platform: "cloudflare" | "vercel",
		result: AddAuthResult,
	): Promise<void> {
		// Update platform config
		if (platform === "cloudflare") {
			const modified = await updateWranglerConfig(cwd, provider);
			if (modified) {
				const wranglerPath = getWranglerConfigPath(cwd);
				if (wranglerPath) {
					result.filesModified.push(wranglerPath);
				}
			}
		} else if (platform === "vercel") {
			const modified = await updateVercelConfig(cwd, provider);
			if (modified) {
				const vercelPath = join(cwd, "vercel.json");
				if (result.filesCreated.includes(vercelPath)) {
					// Already in filesCreated
				} else if (existsSync(vercelPath)) {
					result.filesModified.push(vercelPath);
				} else {
					result.filesCreated.push(vercelPath);
				}
			}
		}

		// Update .env.example
		const envContent = generateEnvExampleTemplate(provider);
		const modified = await updateEnvExample(cwd, provider, envContent);

		if (modified) {
			const envPath = join(cwd, ".env.example");
			if (existsSync(envPath)) {
				result.filesModified.push(envPath);
			} else {
				result.filesCreated.push(envPath);
			}
		}
	}

	/**
	 * Validate all transformations were successful
	 */
	private async validateTransformations(
		cwd: string,
		provider: AuthProvider,
		backupDir: string | undefined,
		result: AddAuthResult,
	): Promise<void> {
		const validationGate = new ValidationGate();

		// Run quick validation (skip type check for speed)
		// Type check can be run by user with npm run type-check
		const validationResult = await validationGate.quickValidate({
			cwd,
			backupDir,
			provider,
			rollbackOnFailure: false, // We handle rollback in the catch block
		});

		// If critical checks failed, throw error to trigger rollback
		if (!validationResult.passed) {
			const errorMessage = [
				"Auth transformation validation failed:",
				...validationResult.errors,
			].join("\n  - ");

			throw new Error(errorMessage);
		}

		// Log passed checks as info (optional, could be verbose)
		if (validationResult.passedChecks.length > 0) {
			result.warnings?.push(
				`✓ Validation passed: ${validationResult.passedChecks.join(", ")}`,
			);
		}
	}
}
