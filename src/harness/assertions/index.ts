/**
 * Assertion Engine
 *
 * Runs assertions against MCP tool responses.
 *
 * Design: Fully portable, no project-specific dependencies
 */

import type { Assertion } from "../types/spec.js";
import type { AssertionResult } from "../types/results.js";
import type { MCPToolResponse } from "../types/client.js";
import { checkSuccess } from "./success.js";
import { checkError } from "./error.js";
import { checkContainsText, checkNotContainsText } from "./contains-text.js";
import { checkResponseTime } from "./response-time.js";
import { checkJsonPath } from "./json-path.js";
import { checkRegexMatch } from "./regex.js";

/**
 * Run all assertions against a tool response
 *
 * @param assertions - List of assertions to run
 * @param response - MCP tool response
 * @param duration - Response time in milliseconds
 * @returns Array of assertion results
 */
export async function runAssertions(
	assertions: Assertion[],
	response: MCPToolResponse,
	duration: number,
): Promise<AssertionResult[]> {
	const results: AssertionResult[] = [];

	for (const assertion of assertions) {
		let result: AssertionResult;

		try {
			switch (assertion.type) {
				case "success":
					result = checkSuccess(response);
					break;

				case "error":
					result = checkError(response, assertion.messageContains);
					break;

				case "contains_text":
					result = checkContainsText(response, assertion.text, assertion.caseInsensitive);
					break;

				case "not_contains_text":
					result = checkNotContainsText(response, assertion.text, assertion.caseInsensitive);
					break;

				case "response_time_ms":
					result = checkResponseTime(duration, assertion.max);
					break;

				case "json_path":
					result = await checkJsonPath(response, assertion.path, assertion.expected);
					break;

				case "regex_match":
					result = checkRegexMatch(response, assertion.pattern, assertion.flags);
					break;

				case "snapshot":
					// Snapshot assertions are handled separately (require file system access)
					result = {
						type: "snapshot",
						passed: false,
						message: "Snapshot assertions not yet implemented in this context",
					};
					break;

				case "json_schema":
					// JSON Schema assertions are handled separately (require file system access)
					result = {
						type: "json_schema",
						passed: false,
						message: "JSON Schema assertions not yet implemented in this context",
					};
					break;

				default:
					result = {
						type: "unknown",
						passed: false,
						message: `Unknown assertion type: ${(assertion as any).type}`,
					};
			}
		} catch (error) {
			result = {
				type: assertion.type,
				passed: false,
				message: error instanceof Error ? error.message : String(error),
			};
		}

		results.push(result);
	}

	return results;
}

// Export individual assertion functions (for testing)
export { checkSuccess } from "./success.js";
export { checkError } from "./error.js";
export { checkContainsText, checkNotContainsText } from "./contains-text.js";
export { checkResponseTime } from "./response-time.js";
export { checkJsonPath } from "./json-path.js";
export { checkRegexMatch } from "./regex.js";

// Export helper functions
export { getResponseText } from "./helpers.js";
