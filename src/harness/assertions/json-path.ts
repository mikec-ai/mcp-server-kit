/**
 * JSON Path Assertion
 *
 * Verifies values at specific JSON paths in the response.
 */

import type { AssertionResult } from "../types/results.js";
import { getResponseText, type MCPResponse } from "./helpers.js";

/**
 * Simple JSON path evaluator
 *
 * Supports basic paths like:
 * - $.property
 * - $.property.nested
 * - $.array[0]
 * - $.array[*].property
 *
 * @param obj - Object to query
 * @param path - JSON path expression
 * @returns Value at path or undefined
 */
function evaluateJsonPath(obj: any, path: string): any {
	// Remove leading $. if present
	const normalizedPath = path.replace(/^\$\.?/, "");

	if (!normalizedPath) {
		return obj;
	}

	// Split path into segments
	const segments = normalizedPath.split(/\.|\[/).map((s) => s.replace(/\]/, ""));

	let current = obj;

	for (const segment of segments) {
		if (current === undefined || current === null) {
			return undefined;
		}

		// Handle array wildcard [*]
		if (segment === "*") {
			if (!Array.isArray(current)) {
				return undefined;
			}
			// For wildcards, we'll just return the array for now
			// More complex wildcard handling can be added later
			return current;
		}

		// Handle numeric array index
		if (/^\d+$/.test(segment)) {
			const index = Number.parseInt(segment, 10);
			current = current[index];
		} else {
			current = current[segment];
		}
	}

	return current;
}

/**
 * Deep equality check
 */
function deepEqual(a: any, b: any): boolean {
	if (a === b) return true;

	if (typeof a !== typeof b) return false;

	if (typeof a !== "object" || a === null || b === null) {
		return a === b;
	}

	if (Array.isArray(a) !== Array.isArray(b)) return false;

	if (Array.isArray(a)) {
		if (a.length !== b.length) return false;
		return a.every((val, idx) => deepEqual(val, b[idx]));
	}

	const keysA = Object.keys(a);
	const keysB = Object.keys(b);

	if (keysA.length !== keysB.length) return false;

	return keysA.every((key) => deepEqual(a[key], b[key]));
}

/**
 * Check if value at JSON path matches expected value
 *
 * @param response - MCP response (tool, prompt, or resource)
 * @param path - JSON path expression
 * @param expected - Expected value at path (optional - if omitted, checks path existence)
 * @returns Assertion result
 */
export async function checkJsonPath(
	response: MCPResponse,
	path: string,
	expected?: any,
): Promise<AssertionResult> {
	try {
		let responseData: any;

		// For prompts and resources, use the response object directly
		// For tools, parse the text content as JSON
		if ("messages" in response) {
			// Prompt response - use the response object directly
			responseData = response;
		} else if ("contents" in response && Array.isArray(response.contents)) {
			// Resource response - use the response object directly
			responseData = response;
		} else if ("content" in response && Array.isArray(response.content)) {
			// Tool response - try to parse the text content as JSON
			const responseText = getResponseText(response);
			try {
				responseData = JSON.parse(responseText);
			} catch {
				return {
					type: "json_path",
					passed: false,
					message: "Response is not valid JSON",
					expected: "valid JSON",
					actual: "invalid JSON",
				};
			}
		} else {
			return {
				type: "json_path",
				passed: false,
				message: "Unknown response type",
				expected: "valid MCP response",
				actual: "unknown type",
			};
		}

		// Evaluate path
		const actual = evaluateJsonPath(responseData, path);

		// If expected is undefined, check path existence
		if (expected === undefined) {
			const exists = actual !== undefined;
			return {
				type: "json_path",
				passed: exists,
				message: exists
					? `Path "${path}" exists with value: ${JSON.stringify(actual)}`
					: `Path "${path}" does not exist in response`,
				actual: exists ? actual : undefined,
			};
		}

		// Compare with expected value
		const matches = deepEqual(actual, expected);

		if (!matches) {
			// Provide helpful type mismatch hints
			const actualType = typeof actual;
			const expectedType = typeof expected;
			const typeHint =
				actualType !== expectedType
					? ` (type mismatch: ${actualType} vs ${expectedType})`
					: "";

			return {
				type: "json_path",
				passed: false,
				message: `Value at path "${path}" does not match expected${typeHint}`,
				expected,
				actual,
			};
		}

		return {
			type: "json_path",
			passed: true,
			message: `Value at path "${path}" matches expected value`,
			expected,
			actual,
		};
	} catch (error) {
		return {
			type: "json_path",
			passed: false,
			message: error instanceof Error ? error.message : String(error),
		};
	}
}
