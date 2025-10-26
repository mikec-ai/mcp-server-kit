/**
 * Shared Utility Functions
 *
 * Common utilities used across multiple commands.
 * All functions are pure and have no side effects.
 */

import { access } from "node:fs/promises";

/**
 * Convert kebab-case to PascalCase
 *
 * @param str - String in kebab-case format
 * @returns String in PascalCase format
 *
 * @example
 * toPascalCase("my-tool-name") → "MyToolName"
 * toPascalCase("api-client") → "ApiClient"
 */
export function toPascalCase(str: string): string {
	return str
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join("");
}

/**
 * Convert PascalCase to kebab-case
 *
 * @param str - String in PascalCase format
 * @returns String in kebab-case format
 *
 * @example
 * toKebabCase("MyToolName") → "my-tool-name"
 * toKebabCase("APIClient") → "api-client"
 */
export function toKebabCase(str: string): string {
	return str
		.replace(/([A-Z])/g, "-$1")
		.toLowerCase()
		.replace(/^-/, "");
}

/**
 * Check if a file exists
 *
 * @param filePath - Path to check
 * @returns true if file exists, false otherwise
 *
 * @example
 * await fileExists("/path/to/file.ts") → true
 * await fileExists("/non/existent.ts") → false
 */
export async function fileExists(filePath: string): Promise<boolean> {
	try {
		await access(filePath);
		return true;
	} catch {
		return false;
	}
}

/**
 * Capitalize first letter of a string
 *
 * @param str - String to capitalize
 * @returns String with first letter capitalized
 *
 * @example
 * capitalize("hello") → "Hello"
 * capitalize("world") → "World"
 */
export function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}
