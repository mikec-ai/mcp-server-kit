/**
 * Utility for formatting validation errors for user-friendly display
 */

import type { ValidationError, ValidationWarning } from "../types/mcp-tools.js";

export class ErrorFormatter {
	/**
	 * Format validation errors into a readable text summary
	 */
	static formatErrors(errors: ValidationError[]): string {
		if (errors.length === 0) {
			return "No errors";
		}

		const lines = [`Found ${errors.length} validation error${errors.length === 1 ? "" : "s"}:\n`];

		for (let i = 0; i < errors.length; i++) {
			const error = errors[i];
			lines.push(`${i + 1}. Field: ${error.field}`);
			lines.push(`   Error: ${error.message}`);

			if (error.expected) {
				lines.push(`   Expected: ${JSON.stringify(error.expected)}`);
			}

			if (error.received) {
				lines.push(`   Received: ${JSON.stringify(error.received)}`);
			}

			if (error.fixSuggestion) {
				lines.push(`   Fix: ${error.fixSuggestion}`);
			}

			lines.push("");
		}

		return lines.join("\n");
	}

	/**
	 * Format validation warnings into a readable text summary
	 */
	static formatWarnings(warnings: ValidationWarning[]): string {
		if (warnings.length === 0) {
			return "";
		}

		const lines = [`\nFound ${warnings.length} warning${warnings.length === 1 ? "" : "s"}:\n`];

		for (let i = 0; i < warnings.length; i++) {
			const warning = warnings[i];
			lines.push(`${i + 1}. Field: ${warning.field}`);
			lines.push(`   Warning: ${warning.message}`);

			if (warning.suggestion) {
				lines.push(`   Suggestion: ${warning.suggestion}`);
			}

			lines.push("");
		}

		return lines.join("\n");
	}

	/**
	 * Format complete validation result
	 */
	static formatValidationResult(result: {
		valid: boolean;
		errors: ValidationError[];
		warnings?: ValidationWarning[];
	}): string {
		if (result.valid) {
			let output = "✓ Payload is valid";

			if (result.warnings && result.warnings.length > 0) {
				output += "\n\n" + this.formatWarnings(result.warnings);
			}

			return output;
		}

		return "✗ Payload validation failed\n\n" + this.formatErrors(result.errors);
	}
}
