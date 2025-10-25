/**
 * Regex Match Assertion
 *
 * Verifies that response matches a regular expression pattern.
 */

import type { MCPToolResponse } from "../types/client.js";
import type { AssertionResult } from "../types/results.js";
import { getResponseText } from "./helpers.js";

/**
 * Check if response matches regex pattern
 *
 * @param response - MCP tool response
 * @param pattern - Regex pattern string
 * @param flags - Regex flags (e.g., "i" for case-insensitive)
 * @returns Assertion result
 */
export function checkRegexMatch(
	response: MCPToolResponse,
	pattern: string,
	flags?: string,
): AssertionResult {
	const responseText = getResponseText(response);

	try {
		const regex = new RegExp(pattern, flags);
		const matches = regex.test(responseText);

		if (!matches) {
			return {
				type: "regex_match",
				passed: false,
				message: `Response does not match pattern: ${pattern}`,
				expected: `text matching /${pattern}/${flags || ""}`,
				actual: responseText.substring(0, 200), // First 200 chars
			};
		}

		return {
			type: "regex_match",
			passed: true,
			message: `Response matches pattern: ${pattern}`,
		};
	} catch (error) {
		return {
			type: "regex_match",
			passed: false,
			message: `Invalid regex pattern: ${error instanceof Error ? error.message : String(error)}`,
		};
	}
}
