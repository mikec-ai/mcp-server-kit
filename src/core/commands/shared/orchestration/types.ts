/**
 * Orchestration Types
 *
 * Core types and interfaces for the scaffolding orchestration pattern.
 * Uses Strategy Pattern + Template Method to eliminate duplication.
 */

/**
 * Context passed through scaffolding operations
 * Contains shared state and accumulates results
 */
export interface ScaffoldContext<TConfig = any, TResult = any> {
	/** Current working directory (project root) */
	cwd: string;
	/** Configuration for this scaffolding operation */
	config: TConfig;
	/** Accumulated result */
	result: TResult;
	/** Backup directory for rollback (if created) */
	backupDir?: string;
	/** Additional context data that strategies can use */
	metadata?: Record<string, any>;
}

/**
 * Strategy interface for scaffolding operations
 *
 * Each strategy implements specific logic for a type of scaffolding
 * (entity, auth, binding, etc.) while the orchestrator handles common flow.
 */
export interface ScaffoldStrategy<TConfig = any, TResult = any> {
	/**
	 * Validate the configuration before scaffolding
	 *
	 * @param cwd - Current working directory
	 * @param config - Configuration to validate
	 * @throws Error if validation fails
	 */
	validate(cwd: string, config: TConfig): Promise<void>;

	/**
	 * Execute the main scaffolding logic
	 *
	 * This is where strategy-specific work happens:
	 * - Generate files
	 * - Update configurations
	 * - Register entities
	 * - Update metadata
	 *
	 * @param context - Scaffolding context with config and result
	 */
	execute(context: ScaffoldContext<TConfig, TResult>): Promise<void>;

	/**
	 * Whether this strategy needs backup/rollback support
	 *
	 * Entity scaffolding doesn't need backup (low risk)
	 * Auth/binding scaffolding does (modifies config files)
	 *
	 * @returns true if backup should be created before execution
	 */
	needsBackup(): boolean;

	/**
	 * Create initial result object
	 *
	 * Each strategy defines its own result structure
	 *
	 * @returns Initial result with default values
	 */
	createResult(): TResult;
}

/**
 * Options for scaffold orchestration
 */
export interface ScaffoldOptions {
	/** Skip backup even if strategy requests it */
	skipBackup?: boolean;
	/** Dry run mode - validate but don't make changes */
	dryRun?: boolean;
}
