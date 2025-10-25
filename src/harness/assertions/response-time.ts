/**
 * Response Time Assertion
 *
 * Verifies that the tool response time is within acceptable limits.
 */

import type { AssertionResult } from "../types/results.js";

/**
 * Check if response time is within maximum threshold
 *
 * @param duration - Actual response time in milliseconds
 * @param maxMs - Maximum acceptable response time in milliseconds
 * @returns Assertion result
 */
export function checkResponseTime(duration: number, maxMs: number): AssertionResult {
	const withinLimit = duration <= maxMs;

	if (!withinLimit) {
		return {
			type: "response_time_ms",
			passed: false,
			message: `Response time ${duration}ms exceeds maximum ${maxMs}ms`,
			expected: `≤ ${maxMs}ms`,
			actual: `${duration}ms`,
		};
	}

	return {
		type: "response_time_ms",
		passed: true,
		message: `Response time ${duration}ms is within limit (${maxMs}ms)`,
	};
}
