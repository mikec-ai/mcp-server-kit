/**
 * Error Assertion
 *
 * Checks that a tool call resulted in an error.
 *
 * Design: Fully portable, no project-specific dependencies
 */

import type { AssertionResult } from "../types/results.js";
import type { MCPToolResponse } from "../types/client.js";
import { getResponseText } from "./helpers.js";

/**
 * Check that the tool call resulted in an error
 *
 * @param response - MCP tool response
 * @param messageContains - Optional text that error message should contain
 * @returns Assertion result
 */
export function checkError(response: MCPToolResponse, messageContains?: string): AssertionResult {
	// Check if response indicates an error
	if (!response.isError) {
		return {
			type: "error",
			passed: false,
			message: "Expected tool call to fail, but it succeeded",
			expected: "error",
			actual: "success",
		};
	}

	// If messageContains is specified, check error message
	if (messageContains) {
		const responseText = getResponseText(response);

		if (!responseText.toLowerCase().includes(messageContains.toLowerCase())) {
			return {
				type: "error",
				passed: false,
				message: `Error message does not contain expected text: "${messageContains}"`,
				expected: `error containing "${messageContains}"`,
				actual: responseText.substring(0, 200),
			};
		}
	}

	return {
		type: "error",
		passed: true,
		message: messageContains
			? `Tool call failed as expected with message containing "${messageContains}"`
			: "Tool call failed as expected",
	};
}
