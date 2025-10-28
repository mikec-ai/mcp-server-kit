/**
 * Scaffold Orchestrator
 *
 * Implements the Template Method pattern to orchestrate scaffolding operations.
 * Eliminates duplication by extracting common flow: validate → backup → execute → cleanup/rollback.
 *
 * Strategies implement only their specific logic, while orchestrator handles:
 * - Validation coordination
 * - Backup/restore on failure
 * - Error handling
 * - Success cleanup
 */

import {
	createBackup,
	restoreFromBackup,
	removeBackup,
} from "../backup-restore.js";
import type {
	ScaffoldStrategy,
	ScaffoldContext,
	ScaffoldOptions,
} from "./types.js";

/**
 * Orchestrator for scaffolding operations
 *
 * Uses Strategy Pattern to delegate specific logic while handling common orchestration
 */
export class ScaffoldOrchestrator<TConfig = any, TResult extends Record<string, any> = any> {
	/**
	 * Execute scaffolding with given strategy
	 *
	 * Template Method that defines the scaffolding algorithm:
	 * 1. Create context
	 * 2. Validate
	 * 3. Backup (if needed)
	 * 4. Execute strategy
	 * 5. Cleanup backup on success
	 * 6. Rollback on failure
	 *
	 * @param cwd - Current working directory
	 * @param config - Configuration for scaffolding
	 * @param strategy - Strategy to execute
	 * @param options - Optional orchestration options
	 * @returns Result from strategy
	 */
	async scaffold(
		cwd: string,
		config: TConfig,
		strategy: ScaffoldStrategy<TConfig, TResult>,
		options: ScaffoldOptions = {},
	): Promise<TResult> {
		// Create context
		const context = this.createContext(cwd, config, strategy);

		// Dry run mode - validate only
		if (options.dryRun) {
			await strategy.validate(cwd, config);
			return context.result;
		}

		try {
			// Step 1: Validation
			await strategy.validate(cwd, config);

			// Step 2: Backup (if needed and not skipped)
			if (strategy.needsBackup() && !options.skipBackup) {
				context.backupDir = await createBackup(cwd);
			}

			// Step 3: Execute strategy-specific logic
			await strategy.execute(context);

			// Step 4: Cleanup backup on success
			if (context.backupDir) {
				await removeBackup(context.backupDir);
				context.backupDir = undefined;
			}

			return context.result;
		} catch (error) {
			// Step 5: Rollback on failure
			if (context.backupDir) {
				try {
					await restoreFromBackup(context.backupDir, cwd);
					await removeBackup(context.backupDir);
				} catch (rollbackError) {
					// Add rollback failure to error context
					const rollbackMsg =
						rollbackError instanceof Error
							? rollbackError.message
							: String(rollbackError);
					throw new Error(
						`Original error: ${error instanceof Error ? error.message : String(error)}\nRollback also failed: ${rollbackMsg}`,
					);
				}
			}

			throw error;
		}
	}

	/**
	 * Create scaffolding context
	 *
	 * @param cwd - Current working directory
	 * @param config - Configuration
	 * @param strategy - Strategy (used to create initial result)
	 * @returns Initial context
	 */
	private createContext(
		cwd: string,
		config: TConfig,
		strategy: ScaffoldStrategy<TConfig, TResult>,
	): ScaffoldContext<TConfig, TResult> {
		return {
			cwd,
			config,
			result: strategy.createResult(),
			metadata: {},
		};
	}
}
