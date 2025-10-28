/**
 * Auth Scaffold Strategy
 *
 * Strategy for scaffolding authentication in MCP servers.
 * Implements only auth-specific logic while orchestrator handles common flow.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { AddAuthOptions, AddAuthResult } from "../../../../types/command-results.js";
import {
	detectPlatform,
	getEntryPointPath,
	type Platform,
} from "../platform-detection.js";
import {
	generateAuthTypesTemplate,
	generateAuthConfigTemplate,
	generateStytchProviderTemplate,
	generateAuth0ProviderTemplate,
	generateWorkOSProviderTemplate,
	generateEnvExampleTemplate,
	type AuthProvider,
} from "../auth-templates.js";
import {
	getAuthDependencies,
	addDependenciesToPackageJson,
} from "../dependency-manager.js";
import {
	addAuthToEntryPoint,
	hasAuthentication,
} from "../entry-point-transformer.js";
import {
	updateWranglerConfig,
	updateVercelConfig,
	updateEnvExample,
} from "../config/auth-config-updater.js";
import { getWranglerConfigPath } from "../config/wrangler-utils.js";
import { ValidationGate } from "../validation-gate.js";
import type {
	ScaffoldStrategy,
	ScaffoldContext,
} from "../orchestration/types.js";

/**
 * Configuration for auth scaffolding
 */
export interface AuthScaffoldConfig {
	/** Auth provider to use */
	provider: AuthProvider;
	/** Platform override (auto-detected if not specified) */
	platform?: "cloudflare" | "vercel";
	/** Current working directory */
	cwd: string;
	/** Proceed even with warnings */
	force?: boolean;
}

/**
 * Strategy for scaffolding authentication
 *
 * Handles: Stytch, Auth0, WorkOS
 * NEEDS backup/rollback (modifies config files and entry point)
 */
export class AuthScaffoldStrategy
	implements ScaffoldStrategy<AuthScaffoldConfig, AddAuthResult>
{
	/**
	 * Validate project structure and auth configuration
	 */
	async validate(cwd: string, config: AuthScaffoldConfig): Promise<void> {
		// Step 1: Validate this is an MCP project
		if (!existsSync(join(cwd, "package.json"))) {
			throw new Error("No package.json found. Is this an MCP project?");
		}

		if (!existsSync(join(cwd, "src"))) {
			throw new Error("No src directory found. Is this an MCP project?");
		}

		// Step 2: Detect platform
		const detectedPlatform = config.platform || (await detectPlatform(cwd));

		if (detectedPlatform === "unknown") {
			throw new Error(
				"Could not detect platform. Please specify --platform cloudflare or --platform vercel",
			);
		}

		// Store detected platform in config for use in execute()
		config.platform = detectedPlatform as "cloudflare" | "vercel";

		// Step 3: Check for existing auth
		const entryPoint = getEntryPointPath(cwd, config.platform);
		if (existsSync(entryPoint) && (await hasAuthentication(entryPoint))) {
			if (!config.force) {
				throw new Error(
					"Authentication is already configured. Use --force to overwrite.",
				);
			}
		}
	}

	/**
	 * Execute auth scaffolding
	 *
	 * 1. Create auth directory structure
	 * 2. Generate auth files
	 * 3. Add dependencies
	 * 4. Transform entry point
	 * 5. Update config files
	 * 6. Validate transformations
	 */
	async execute(
		context: ScaffoldContext<AuthScaffoldConfig, AddAuthResult>,
	): Promise<void> {
		const { cwd, config, result } = context;
		const { provider, platform } = config;

		// Platform is guaranteed to be set after validation
		const confirmedPlatform = platform as "cloudflare" | "vercel";

		// Store platform in result
		result.platform = confirmedPlatform;

		// Add warning if force was used
		if (config.force) {
			result.warnings?.push("Overwriting existing authentication configuration");
		}

		// Step 1: Create auth directory structure
		const authDir = join(cwd, "src/auth");
		await mkdir(authDir, { recursive: true });
		await mkdir(join(authDir, "providers"), { recursive: true });

		// Step 2: Generate auth files
		await this.generateAuthFiles(cwd, provider, result);

		// Step 3: Add dependencies
		await this.addDependencies(cwd, provider, confirmedPlatform, result);

		// Step 4: Transform entry point
		await this.transformEntryPoint(cwd, confirmedPlatform, result);

		// Step 5: Update config files
		await this.updateConfigFiles(cwd, provider, confirmedPlatform, result);

		// Step 6: Validate transformations
		await this.validateTransformations(cwd, provider, context.backupDir, result);

		result.success = true;
	}

	/**
	 * Auth needs backup (modifies config files)
	 */
	needsBackup(): boolean {
		return true;
	}

	/**
	 * Create initial result object
	 */
	createResult(): AddAuthResult {
		return {
			success: false,
			provider: "", // Will be set by config
			platform: "unknown",
			filesCreated: [],
			filesModified: [],
			warnings: [],
		};
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

		// Store provider in result
		result.provider = provider;
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
			rollbackOnFailure: false, // Orchestrator handles rollback
		});

		// If critical checks failed, throw error to trigger rollback
		if (!validationResult.passed) {
			const errorMessage = [
				"Auth transformation validation failed:",
				...validationResult.errors,
			].join("\n  - ");

			throw new Error(errorMessage);
		}

		// Log passed checks as info
		if (validationResult.passedChecks.length > 0) {
			result.warnings?.push(
				`✓ Validation passed: ${validationResult.passedChecks.join(", ")}`,
			);
		}
	}
}
