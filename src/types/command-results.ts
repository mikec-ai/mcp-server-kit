/**
 * Command Result Types
 *
 * Type definitions for JSON output from CLI commands.
 * These types ensure consistent, parseable output for programmatic use.
 */

import type { ValidationIssue } from "../core/commands/validate.js";

/**
 * Result from adding an entity (tool, prompt, or resource)
 */
export interface AddEntityResult {
	/** Whether the operation succeeded */
	success: boolean;
	/** Type of entity that was added */
	entityType: "tool" | "prompt" | "resource";
	/** Name of the entity */
	entityName: string;
	/** Files that were created */
	filesCreated: string[];
	/** Whether the entity was registered in src/index.ts */
	registered: boolean;
	/** Optional human-readable message */
	message?: string;
	/** Error message if operation failed */
	error?: string;
}

/**
 * Result from validating a project
 */
export interface ValidateResult {
	/** Whether validation passed */
	passed: boolean;
	/** All validation issues found */
	issues: ValidationIssue[];
	/** Summary statistics */
	summary: {
		/** Number of errors */
		errors: number;
		/** Number of warnings */
		warnings: number;
		/** Number of info messages */
		info: number;
	};
}

/**
 * Result from creating a new server
 */
export interface NewServerResult {
	/** Whether the operation succeeded */
	success: boolean;
	/** Name of the project */
	projectName: string;
	/** Template ID used */
	templateId: string;
	/** Absolute path to the created project */
	path: string;
	/** Next steps for the user */
	nextSteps: string[];
	/** Error message if operation failed */
	error?: string;
	/** Whether dev mode was enabled */
	devMode?: boolean;
}

/**
 * Result from adding authentication to a project
 */
export interface AddAuthResult {
	/** Whether the operation succeeded */
	success: boolean;
	/** Auth provider that was added */
	provider: string;
	/** Platform that was detected */
	platform: "cloudflare" | "vercel" | "unknown";
	/** Files that were created */
	filesCreated: string[];
	/** Files that were modified */
	filesModified: string[];
	/** Error message if operation failed */
	error?: string;
	/** Warnings encountered during operation */
	warnings?: string[];
	/** Backup directory path (preserved on failure) */
	backupDir?: string;
}

/**
 * Options for adding authentication
 */
export interface AddAuthOptions {
	/** Auth provider to use */
	provider: "stytch" | "auth0" | "workos";
	/** Platform override (auto-detected if not specified) */
	platform?: "cloudflare" | "vercel";
	/** Preview changes without applying them */
	dryRun?: boolean;
	/** Skip creating backup before modifications */
	backup?: boolean;
	/** Proceed even with warnings */
	force?: boolean;
	/** Current working directory */
	cwd?: string;
}
