/**
 * Validation Gate
 *
 * Comprehensive post-transformation validation to ensure code transformations
 * were successful and didn't break the project. Supports rollback on failure.
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getWranglerConfigPath } from "./config-updater.js";
import { AnchorService, AUTH_ANCHORS } from "./anchor-service.js";
import { restoreFromBackup } from "./backup-restore.js";
import type { AuthProvider } from "./config-updater.js";

const execAsync = promisify(exec);

/**
 * Individual validation check
 */
export interface ValidationCheck {
	/** Check name/identifier */
	name: string;
	/** Human-readable description */
	description: string;
	/** Function that performs the check */
	validate: () => Promise<boolean>;
	/** Error message if check fails */
	errorMessage: string;
	/** Whether this check is critical (causes rollback) */
	critical: boolean;
}

/**
 * Result of validation gate
 */
export interface ValidationGateResult {
	/** Whether all checks passed */
	passed: boolean;
	/** Checks that passed */
	passedChecks: string[];
	/** Checks that failed */
	failedChecks: string[];
	/** Whether rollback was performed */
	rolledBack: boolean;
	/** Error messages from failed checks */
	errors: string[];
}

/**
 * Options for validation gate
 */
export interface ValidationGateOptions {
	/** Project root directory */
	cwd: string;
	/** Backup directory for rollback */
	backupDir?: string;
	/** Auth provider (for config checks) */
	provider?: AuthProvider;
	/** Skip type checking (faster, less thorough) */
	skipTypeCheck?: boolean;
	/** Perform rollback on failure */
	rollbackOnFailure?: boolean;
}

/**
 * Service for validating code transformations
 */
export class ValidationGate {
	private anchorService: AnchorService;

	constructor() {
		this.anchorService = new AnchorService();
	}

	/**
	 * Run full validation gate after auth transformation
	 */
	async validate(
		options: ValidationGateOptions,
	): Promise<ValidationGateResult> {
		const checks = await this.buildChecks(options);
		const result: ValidationGateResult = {
			passed: true,
			passedChecks: [],
			failedChecks: [],
			rolledBack: false,
			errors: [],
		};

		// Run all checks
		for (const check of checks) {
			try {
				const passed = await check.validate();

				if (passed) {
					result.passedChecks.push(check.name);
				} else {
					result.failedChecks.push(check.name);
					result.errors.push(`${check.name}: ${check.errorMessage}`);

					if (check.critical) {
						result.passed = false;
					}
				}
			} catch (error) {
				result.failedChecks.push(check.name);
				result.errors.push(`${check.name}: ${error}`);

				if (check.critical) {
					result.passed = false;
				}
			}
		}

		// Rollback if critical checks failed
		if (
			!result.passed &&
			options.rollbackOnFailure &&
			options.backupDir
		) {
			try {
				await restoreFromBackup(options.backupDir, options.cwd);
				result.rolledBack = true;
			} catch (error) {
				result.errors.push(`Rollback failed: ${error}`);
			}
		}

		return result;
	}

	/**
	 * Build list of validation checks
	 */
	private async buildChecks(
		options: ValidationGateOptions,
	): Promise<ValidationCheck[]> {
		const checks: ValidationCheck[] = [];

		// 1. Type check (if not skipped)
		if (!options.skipTypeCheck) {
			checks.push({
				name: "type-check",
				description: "TypeScript compilation",
				validate: async () => {
					try {
						await execAsync("npx tsc --noEmit", { cwd: options.cwd });
						return true;
					} catch (error) {
						return false;
					}
				},
				errorMessage:
					"TypeScript compilation failed. Auth transformation may have introduced type errors.",
				critical: true,
			});
		}

		// 2. Export invariants (handler still exists)
		checks.push({
			name: "export-invariants",
			description: "Export handler integrity",
			validate: async () => {
				const indexPath = join(options.cwd, "src/index.ts");
				if (!existsSync(indexPath)) return false;

				const content = await readFile(indexPath, "utf-8");
				return (
					content.includes("export default") && content.includes("async fetch")
				);
			},
			errorMessage: "Export handler missing or malformed after transformation",
			critical: true,
		});

		// 3. Anchor blocks present
		checks.push({
			name: "anchors-present",
			description: "Anchor blocks exist",
			validate: async () => {
				const indexPath = join(options.cwd, "src/index.ts");
				const validation = await this.anchorService.validateAnchors(indexPath, [
					AUTH_ANCHORS.IMPORTS,
					AUTH_ANCHORS.MIDDLEWARE,
				]);
				return validation.valid;
			},
			errorMessage:
				"Required anchor blocks missing. Template may not be compatible with add-auth command.",
			critical: false, // Warning only
		});

		// 4. Auth imports present
		checks.push({
			name: "auth-imports",
			description: "Auth imports added",
			validate: async () => {
				const indexPath = join(options.cwd, "src/index.ts");
				if (!existsSync(indexPath)) return false;

				const content = await readFile(indexPath, "utf-8");
				return (
					content.includes("getAuthProvider") &&
					content.includes("AuthenticationError")
				);
			},
			errorMessage: "Auth imports not properly added to index.ts",
			critical: true,
		});

		// 5. Auth middleware present
		checks.push({
			name: "auth-middleware",
			description: "Auth middleware added",
			validate: async () => {
				const indexPath = join(options.cwd, "src/index.ts");
				if (!existsSync(indexPath)) return false;

				const content = await readFile(indexPath, "utf-8");
				return (
					content.includes("Authorization") && content.includes("validateToken")
				);
			},
			errorMessage: "Auth middleware not properly added to fetch handler",
			critical: true,
		});

		// 6. Config vars present (if provider specified)
		if (options.provider) {
			checks.push({
				name: "config-vars",
				description: "Auth config variables",
				validate: async () => {
					const wranglerPath = getWranglerConfigPath(options.cwd);
					if (!wranglerPath) return false;

					const content = await readFile(wranglerPath, "utf-8");
					// Check for provider-specific vars
					if (options.provider === "stytch") {
						return (
							content.includes("STYTCH_PROJECT_ID") &&
							content.includes("STYTCH_SECRET")
						);
					} else if (options.provider === "auth0") {
						return (
							content.includes("AUTH0_DOMAIN") &&
							content.includes("AUTH0_CLIENT_ID")
						);
					} else if (options.provider === "workos") {
						return (
							content.includes("WORKOS_API_KEY") &&
							content.includes("WORKOS_CLIENT_ID")
						);
					}
					return true;
				},
				errorMessage: "Auth environment variables not added to config",
				critical: true,
			});
		}

		// 7. Auth files exist
		checks.push({
			name: "auth-files-exist",
			description: "Auth files created",
			validate: async () => {
				const authDir = join(options.cwd, "src/auth");
				const requiredFiles = ["config.ts", "types.ts"];

				if (options.provider) {
					requiredFiles.push(`providers/${options.provider}.ts`);
				}

				return requiredFiles.every((f) => existsSync(join(authDir, f)));
			},
			errorMessage: "Required auth files missing",
			critical: true,
		});

		// 8. No duplicate imports
		checks.push({
			name: "no-duplicate-imports",
			description: "No duplicate imports",
			validate: async () => {
				const indexPath = join(options.cwd, "src/index.ts");
				if (!existsSync(indexPath)) return false;

				const content = await readFile(indexPath, "utf-8");
				const importLines = content
					.split("\n")
					.filter((l) => l.trim().startsWith("import"));

				// Check for duplicate auth imports
				const authImports = importLines.filter(
					(l) => l.includes("getAuthProvider") || l.includes("AuthenticationError")
				);

				return authImports.length <= 2; // One for each
			},
			errorMessage: "Duplicate imports detected (transformation may have run twice)",
			critical: false,
		});

		return checks;
	}

	/**
	 * Run a quick validation (skips type check)
	 */
	async quickValidate(
		options: ValidationGateOptions,
	): Promise<ValidationGateResult> {
		return this.validate({
			...options,
			skipTypeCheck: true,
			rollbackOnFailure: false,
		});
	}

	/**
	 * Run only critical checks
	 */
	async validateCritical(
		options: ValidationGateOptions,
	): Promise<ValidationGateResult> {
		const allChecks = await this.buildChecks(options);
		const criticalChecks = allChecks.filter((c) => c.critical);

		const result: ValidationGateResult = {
			passed: true,
			passedChecks: [],
			failedChecks: [],
			rolledBack: false,
			errors: [],
		};

		for (const check of criticalChecks) {
			try {
				const passed = await check.validate();

				if (passed) {
					result.passedChecks.push(check.name);
				} else {
					result.failedChecks.push(check.name);
					result.errors.push(`${check.name}: ${check.errorMessage}`);
					result.passed = false;
				}
			} catch (error) {
				result.failedChecks.push(check.name);
				result.errors.push(`${check.name}: ${error}`);
				result.passed = false;
			}
		}

		return result;
	}
}
