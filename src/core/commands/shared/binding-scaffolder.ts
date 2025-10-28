/**
 * Binding Scaffolder
 *
 * Facade for adding Cloudflare bindings to MCP servers.
 * Delegates to ScaffoldOrchestrator with BindingScaffoldStrategy.
 *
 * Refactored from 305 lines → ~70 lines using orchestration pattern.
 */

import type {
	BindingScaffoldConfig,
	BindingScaffoldResult,
} from "@/types/binding-types.js";
import { ScaffoldOrchestrator } from "./orchestration/scaffold-orchestrator.js";
import { BindingScaffoldStrategy } from "./strategies/binding-scaffold-strategy.js";

/**
 * Service for scaffolding Cloudflare bindings
 */
export class BindingScaffolder {
	private orchestrator: ScaffoldOrchestrator<
		BindingScaffoldConfig,
		BindingScaffoldResult
	>;
	private strategy: BindingScaffoldStrategy;

	constructor() {
		this.orchestrator = new ScaffoldOrchestrator();
		this.strategy = new BindingScaffoldStrategy();
	}

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
		// Determine if we need backup (skip if skipHelper is true)
		const skipBackup = config.skipHelper === true;

		// Delegate to orchestrator + strategy, catch errors and return result
		try {
			const result = await this.orchestrator.scaffold(
				cwd,
				config,
				this.strategy,
				{
					skipBackup,
					dryRun: false,
				},
			);

			// Update result with config values (orchestrator doesn't know about these)
			result.bindingType = config.bindingType;
			result.bindingName = config.bindingName;

			return result;
		} catch (error) {
			// Convert error to result format (binding tests expect this)
			const result = this.strategy.createResult();
			result.bindingType = config.bindingType;
			result.bindingName = config.bindingName;
			result.error = error instanceof Error ? error.message : String(error);

			// Add rollback warning if backup was created
			if (!skipBackup) {
				result.warnings?.push("Changes have been rolled back due to error");
			}

			return result;
		}
	}
}
