/**
 * Auth Scaffolder
 *
 * Facade for adding authentication to MCP servers.
 * Delegates to ScaffoldOrchestrator with AuthScaffoldStrategy.
 *
 * Refactored from 333 lines → 60 lines using orchestration pattern.
 */

import type { AddAuthOptions, AddAuthResult } from "../../../types/command-results.js";
import { ScaffoldOrchestrator } from "./orchestration/scaffold-orchestrator.js";
import {
	AuthScaffoldStrategy,
	type AuthScaffoldConfig,
} from "./strategies/auth-scaffold-strategy.js";

export class AuthScaffolder {
	private orchestrator: ScaffoldOrchestrator<AuthScaffoldConfig, AddAuthResult>;
	private strategy: AuthScaffoldStrategy;

	constructor() {
		this.orchestrator = new ScaffoldOrchestrator();
		this.strategy = new AuthScaffoldStrategy();
	}

	/**
	 * Add authentication to an MCP server project
	 */
	async addAuth(options: AddAuthOptions): Promise<AddAuthResult> {
		const cwd = options.cwd || process.cwd();
		const dryRun = options.dryRun || false;
		const skipBackup = options.backup === false; // Default: create backup

		// Convert options to strategy config
		const config: AuthScaffoldConfig = {
			provider: options.provider,
			platform: options.platform,
			cwd,
			force: options.force,
		};

		// Handle dry run
		if (dryRun) {
			const result = this.strategy.createResult();
			result.provider = options.provider;
			result.warnings?.push("DRY RUN: No changes will be made");

			// Validate only (don't execute)
			try {
				await this.strategy.validate(cwd, config);
				// After validation, platform will be set in config
				result.platform = config.platform || "unknown";
				result.success = true;
			} catch (error) {
				result.error = error instanceof Error ? error.message : String(error);
			}

			return result;
		}

		// Delegate to orchestrator + strategy, catch errors and return result
		try {
			return await this.orchestrator.scaffold(cwd, config, this.strategy, {
				skipBackup,
				dryRun: false,
			});
		} catch (error) {
			// Convert error to result format (auth tests expect this)
			const result = this.strategy.createResult();
			result.provider = options.provider;
			// Preserve platform if it was detected during validation
			result.platform = config.platform || "unknown";
			result.error = error instanceof Error ? error.message : String(error);
			return result;
		}
	}
}
