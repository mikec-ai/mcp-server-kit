/**
 * CLI Error Types and Exit Codes
 *
 * Defines consistent error handling for agent-friendly CLI usage.
 */

/**
 * Standard exit codes for CLI operations
 */
export enum ExitCode {
	/** Operation completed successfully */
	SUCCESS = 0,

	/** Validation error (invalid arguments, names, etc.) */
	VALIDATION_ERROR = 1,

	/** Runtime error (unexpected failures during execution) */
	RUNTIME_ERROR = 2,

	/** File system error (permissions, missing files, etc.) */
	FILESYSTEM_ERROR = 3,
}

/**
 * Error response structure for JSON mode
 */
export interface CLIErrorResponse {
	success: false;
	error: string;
	errorCode: ExitCode;
	errorType: string;
	suggestion?: string;
	details?: Record<string, any>;
}

/**
 * Context for error handling
 */
export interface ErrorContext {
	/** Whether to output JSON */
	jsonMode: boolean;

	/** Command that failed */
	command?: string;

	/** Operation that failed */
	operation?: string;

	/** Additional context data */
	context?: Record<string, any>;
}
