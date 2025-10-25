/**
 * Console Reporter
 *
 * Outputs human-readable test results to console.
 *
 * Design: Fully portable, colorized console output
 */

import type { TestRunResults, TestResult } from "../types/results.ts";

// ANSI color codes
const colors = {
	reset: "\x1b[0m",
	green: "\x1b[32m",
	red: "\x1b[31m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	gray: "\x1b[90m",
	bold: "\x1b[1m",
};

/**
 * Print a single test result
 */
function printTestResult(test: TestResult, index: number): void {
	const status = test.skipped
		? `${colors.yellow}SKIP${colors.reset}`
		: test.passed
			? `${colors.green}PASS${colors.reset}`
			: `${colors.red}FAIL${colors.reset}`;

	const duration = `${colors.gray}${test.duration}ms${colors.reset}`;

	console.log(`  ${status} ${test.name} ${duration}`);

	// Show failed assertions
	if (!test.passed && !test.skipped) {
		if (test.error) {
			console.log(`    ${colors.red}✗${colors.reset} ${test.error.message}`);
		} else {
			for (const assertion of test.assertions) {
				if (!assertion.passed) {
					console.log(`    ${colors.red}✗${colors.reset} ${assertion.type}: ${assertion.message}`);
					if (assertion.expected !== undefined) {
						console.log(
							`      Expected: ${colors.gray}${JSON.stringify(assertion.expected)}${colors.reset}`,
						);
						console.log(
							`      Actual:   ${colors.gray}${JSON.stringify(assertion.actual)}${colors.reset}`,
						);
					}
				}
			}
		}
	}
}

/**
 * Print test run summary
 */
function printSummary(results: TestRunResults): void {
	console.log("");
	console.log(`${colors.bold}Test Summary${colors.reset}`);
	console.log(`${colors.gray}${"─".repeat(50)}${colors.reset}`);

	const passed = results.summary.passed;
	const failed = results.summary.failed;
	const skipped = results.summary.skipped;
	const total = results.summary.total;

	console.log(`Total:   ${total}`);
	console.log(`${colors.green}Passed:  ${passed}${colors.reset}`);

	if (failed > 0) {
		console.log(`${colors.red}Failed:  ${failed}${colors.reset}`);
	}

	if (skipped > 0) {
		console.log(`${colors.yellow}Skipped: ${skipped}${colors.reset}`);
	}

	console.log(`Duration: ${results.summary.duration}ms`);
	console.log(`Success Rate: ${(results.summary.successRate * 100).toFixed(1)}%`);
	console.log("");
}

/**
 * Print full test results in human-readable format
 *
 * @param results - Test run results
 */
export function printConsole(results: TestRunResults): void {
	console.log("");
	console.log(`${colors.bold}Running Integration Tests${colors.reset}`);

	if (results.serverUrl) {
		console.log(`${colors.gray}Server: ${results.serverUrl}${colors.reset}`);
	}

	console.log(`${colors.gray}Timestamp: ${results.timestamp}${colors.reset}`);
	console.log("");

	// Print each test result
	results.tests.forEach((test, index) => {
		printTestResult(test, index);
	});

	// Print summary
	printSummary(results);

	// Print failures in detail
	if (results.failures.length > 0) {
		console.log(`${colors.bold}${colors.red}Failures:${colors.reset}`);
		console.log(`${colors.gray}${"─".repeat(50)}${colors.reset}`);

		for (const failure of results.failures) {
			console.log(`${colors.red}✗${colors.reset} ${failure.test}`);
			console.log(`  Assertion: ${failure.assertion}`);
			console.log(`  Message: ${failure.message}`);

			if (failure.expected !== undefined) {
				console.log(`  Expected: ${JSON.stringify(failure.expected)}`);
				console.log(`  Actual: ${JSON.stringify(failure.actual)}`);
			}

			console.log("");
		}
	}
}

/**
 * Print a simple pass/fail message
 *
 * @param results - Test run results
 */
export function printSimple(results: TestRunResults): void {
	const allPassed = results.summary.failed === 0;

	if (allPassed) {
		console.log(
			`${colors.green}${colors.bold}✓ All tests passed${colors.reset} (${results.summary.passed}/${results.summary.total})`,
		);
	} else {
		console.log(
			`${colors.red}${colors.bold}✗ Tests failed${colors.reset} (${results.summary.failed} failed, ${results.summary.passed} passed)`,
		);
	}
}
