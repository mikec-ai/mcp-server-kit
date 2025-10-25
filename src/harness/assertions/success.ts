/**
 * Success Assertion
 *
 * Verifies that the tool call succeeded (no error).
 */

import type { MCPToolResponse } from "../types/client.ts";
import type { AssertionResult } from "../types/results.ts";

/**
 * Check if tool call was successful
 *
 * @param response - MCP tool response
 * @returns Assertion result
 */
export function checkSuccess(response: MCPToolResponse): AssertionResult {
	const isError = response.isError === true;

	if (isError) {
		return {
			type: "success",
			passed: false,
			message: "Tool call returned an error",
			expected: "success",
			actual: "error",
		};
	}

	return {
		type: "success",
		passed: true,
		message: "Tool call succeeded",
	};
}
