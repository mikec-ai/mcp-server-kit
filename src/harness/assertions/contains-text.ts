/**
 * Contains Text Assertions
 *
 * Verifies that response contains (or doesn't contain) specific text.
 */

import type { MCPToolResponse } from "../types/client.js";
import type { AssertionResult } from "../types/results.js";
import { getResponseText } from "./helpers.js";

/**
 * Check if response contains specific text
 *
 * @param response - MCP tool response
 * @param text - Text to search for
 * @param caseInsensitive - Case insensitive matching
 * @returns Assertion result
 */
export function checkContainsText(
	response: MCPToolResponse,
	text: string,
	caseInsensitive = false,
): AssertionResult {
	const responseText = getResponseText(response);
	const searchText = caseInsensitive ? text.toLowerCase() : text;
	const targetText = caseInsensitive ? responseText.toLowerCase() : responseText;

	const contains = targetText.includes(searchText);

	if (!contains) {
		return {
			type: "contains_text",
			passed: false,
			message: `Response does not contain expected text: "${text}"`,
			expected: `text containing "${text}"`,
			actual: responseText.substring(0, 200), // First 200 chars
		};
	}

	return {
		type: "contains_text",
		passed: true,
		message: `Response contains expected text: "${text}"`,
	};
}

/**
 * Check if response does NOT contain specific text
 *
 * @param response - MCP tool response
 * @param text - Text that should not be present
 * @param caseInsensitive - Case insensitive matching
 * @returns Assertion result
 */
export function checkNotContainsText(
	response: MCPToolResponse,
	text: string,
	caseInsensitive = false,
): AssertionResult {
	const responseText = getResponseText(response);
	const searchText = caseInsensitive ? text.toLowerCase() : text;
	const targetText = caseInsensitive ? responseText.toLowerCase() : responseText;

	const contains = targetText.includes(searchText);

	if (contains) {
		return {
			type: "not_contains_text",
			passed: false,
			message: `Response should not contain text: "${text}"`,
			expected: `text not containing "${text}"`,
			actual: responseText.substring(0, 200), // First 200 chars
		};
	}

	return {
		type: "not_contains_text",
		passed: true,
		message: `Response does not contain unwanted text: "${text}"`,
	};
}
