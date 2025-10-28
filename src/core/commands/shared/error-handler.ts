/**
 * Centralized Error Handling for CLI Commands
 *
 * Provides consistent error handling across all commands with agent-friendly
 * JSON output and proper exit codes.
 */

import { ExitCode, CLIErrorResponse, ErrorContext } from "../../../types/cli-errors.js";

/**
 * Custom CLI error class with exit code information
 */
export class CLIError extends Error {
	constructor(
		message: string,
		public exitCode: ExitCode,
		public errorType: string = "CLIError",
		public suggestion?: string,
		public details?: Record<string, any>,
	) {
		super(message);
		this.name = "CLIError";

		// Maintain proper stack trace
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, CLIError);
		}
	}

	/**
	 * Convert error to JSON response format
	 */
	toJSON(): CLIErrorResponse {
		return {
			success: false,
			error: this.message,
			errorCode: this.exitCode,
			errorType: this.errorType,
			suggestion: this.suggestion,
			details: this.details,
		};
	}
}

/**
 * Validation error (invalid arguments, names, formats, etc.)
 */
export class ValidationError extends CLIError {
	constructor(
		message: string,
		suggestion?: string,
		details?: Record<string, any>,
	) {
		super(message, ExitCode.VALIDATION_ERROR, "ValidationError", suggestion, details);
	}
}

/**
 * Runtime error (unexpected failures during execution)
 */
export class RuntimeError extends CLIError {
	constructor(
		message: string,
		suggestion?: string,
		details?: Record<string, any>,
	) {
		super(message, ExitCode.RUNTIME_ERROR, "RuntimeError", suggestion, details);
	}
}

/**
 * File system error (permissions, missing files, etc.)
 */
export class FileSystemError extends CLIError {
	constructor(
		message: string,
		suggestion?: string,
		details?: Record<string, any>,
	) {
		super(message, ExitCode.FILESYSTEM_ERROR, "FileSystemError", suggestion, details);
	}
}

/**
 * Handle command errors with consistent output and exit codes
 *
 * @param error - Error object to handle
 * @param context - Error context (JSON mode, command info, etc.)
 * @returns Never (always exits process)
 */
export function handleCommandError(
	error: unknown,
	context: ErrorContext,
): never {
	if (error instanceof CLIError) {
		if (context.jsonMode) {
			console.log(JSON.stringify(error.toJSON(), null, 2));
		} else {
			console.error(`\n❌ Error: ${error.message}\n`);
			if (error.suggestion) {
				console.error(`💡 Suggestion: ${error.suggestion}\n`);
			}
		}
		process.exit(error.exitCode);
	}

	// Handle unknown errors
	const message = error instanceof Error ? error.message : String(error);
	const exitCode = ExitCode.RUNTIME_ERROR;

	if (context.jsonMode) {
		const response: CLIErrorResponse = {
			success: false,
			error: message,
			errorCode: exitCode,
			errorType: "UnknownError",
		};
		console.log(JSON.stringify(response, null, 2));
	} else {
		console.error(`\n❌ Unexpected error: ${message}\n`);
	}

	process.exit(exitCode);
}

/**
 * Internal error used to signal process exit (for testing)
 */
class ProcessExitError extends Error {
	constructor(public code: number) {
		super(`Process exited with code ${code}`);
		this.name = "ProcessExitError";
	}
}

/**
 * Safe process exit that can be mocked in tests
 */
function safeProcessExit(code: ExitCode): never {
	// Check if process.exit is mocked (for testing)
	// If it throws, that's expected in tests
	process.exit(code);

	// This code never runs in production (process.exit doesn't return)
	// But it helps TypeScript understand this function never returns
	throw new ProcessExitError(code);
}

/**
 * Wrapper for command actions that provides automatic error handling
 *
 * @param action - Async action function to wrap
 * @param getContext - Function to extract error context from action args
 * @returns Wrapped action with error handling
 *
 * @example
 * ```typescript
 * .action(withErrorHandler(
 *   async (name, options) => {
 *     // Command logic
 *     await addTool(name, options);
 *   },
 *   (name, options) => ({ jsonMode: options.json, command: 'add tool' })
 * ))
 * ```
 */
export function withErrorHandler<TArgs extends any[]>(
	action: (...args: TArgs) => Promise<void>,
	getContext: (...args: TArgs) => ErrorContext,
): (...args: TArgs) => Promise<void> {
	return async (...args: TArgs) => {
		try {
			await action(...args);
			// Explicit success exit
			safeProcessExit(ExitCode.SUCCESS);
		} catch (error) {
			// Re-throw ProcessExitError (from mocked process.exit in tests)
			if (error instanceof ProcessExitError || (error as any).message?.includes("Process exited with code")) {
				throw error;
			}

			const context = getContext(...args);
			handleCommandError(error, context);
		}
	};
}

/**
 * Helper to create validation errors with common patterns
 */
export const ValidationErrors = {
	invalidName: (name: string, expected: string): ValidationError =>
		new ValidationError(
			`Invalid name '${name}'. Expected format: ${expected}`,
			`Use lowercase with hyphens (e.g., my-entity)`,
			{ providedName: name, expectedFormat: expected },
		),

	alreadyExists: (entity: string, name: string): ValidationError =>
		new ValidationError(
			`${entity} '${name}' already exists`,
			`Choose a different name or remove the existing one`,
			{ entity, name },
		),

	notFound: (entity: string, name: string): ValidationError =>
		new ValidationError(
			`${entity} '${name}' not found`,
			`Check the name and try again`,
			{ entity, name },
		),

	invalidOption: (option: string, validOptions: string[]): ValidationError =>
		new ValidationError(
			`Invalid option '${option}'`,
			`Valid options are: ${validOptions.join(", ")}`,
			{ providedOption: option, validOptions },
		),
};

/**
 * Helper to create file system errors with common patterns
 */
export const FileSystemErrors = {
	notFound: (path: string): FileSystemError =>
		new FileSystemError(
			`File not found: ${path}`,
			`Ensure the file exists and the path is correct`,
			{ path },
		),

	permissionDenied: (path: string, operation: string): FileSystemError =>
		new FileSystemError(
			`Permission denied: Cannot ${operation} ${path}`,
			`Check file permissions and try again`,
			{ path, operation },
		),

	alreadyExists: (path: string): FileSystemError =>
		new FileSystemError(
			`File already exists: ${path}`,
			`Remove the existing file or choose a different name`,
			{ path },
		),
};

/**
 * Helper to create runtime errors with common patterns
 */
export const RuntimeErrors = {
	operationFailed: (operation: string, reason: string): RuntimeError =>
		new RuntimeError(
			`${operation} failed: ${reason}`,
			`Check the error details and try again`,
			{ operation, reason },
		),

	unexpectedState: (state: string, expected: string): RuntimeError =>
		new RuntimeError(
			`Unexpected state: ${state}. Expected: ${expected}`,
			`This may indicate a bug. Please report this issue`,
			{ actualState: state, expectedState: expected },
		),
};
