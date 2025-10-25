/**
 * JSON Reporter
 *
 * Outputs test results in machine-parseable JSON format.
 *
 * Design: Fully portable, optimized for agent consumption
 */

import type { TestRunResults } from "../types/results.js";

/**
 * Format test results as JSON
 *
 * @param results - Test run results
 * @param pretty - Pretty print (default: true)
 * @returns JSON string
 */
export function formatAsJSON(results: TestRunResults, pretty = true): string {
	return pretty ? JSON.stringify(results, null, 2) : JSON.stringify(results);
}

/**
 * Print test results as JSON to console
 *
 * @param results - Test run results
 * @param pretty - Pretty print (default: true)
 */
export function printJSON(results: TestRunResults, pretty = true): void {
	console.log(formatAsJSON(results, pretty));
}

/**
 * Get a simple pass/fail summary for agents
 *
 * Returns minimal JSON for quick checks.
 *
 * @param results - Test run results
 * @returns Simplified JSON string
 */
export function formatSimpleSummary(results: TestRunResults): string {
	const summary = {
		passed: results.summary.passed === results.summary.total,
		total: results.summary.total,
		passed_count: results.summary.passed,
		failed_count: results.summary.failed,
		duration_ms: results.summary.duration,
		success_rate: results.summary.successRate,
	};

	return JSON.stringify(summary, null, 2);
}
