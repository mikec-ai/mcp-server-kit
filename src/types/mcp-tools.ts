/**
 * MCP Tools Type Definitions
 *
 * Common types used across MCP tools and utilities
 */

/**
 * Validation error structure
 */
export interface ValidationError {
	field: string;
	message: string;
	expected?: unknown;
	received?: unknown;
	fixSuggestion?: string;
}

/**
 * Validation warning structure
 */
export interface ValidationWarning {
	field: string;
	message: string;
	suggestion?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
	warnings?: ValidationWarning[];
}
