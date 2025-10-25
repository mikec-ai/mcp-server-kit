/**
 * Core Test Runner
 *
 * Executes test specifications against an MCP server.
 *
 * Design: Fully portable, uses IMCPTestClient interface
 */

import type { IMCPTestClient } from "./types/client.js";
import type { TestSpec } from "./types/spec.js";
import type { TestResult, TestRunResults, TestSummary } from "./types/results.js";
import { runAssertions } from "./assertions/index.js";

/**
 * Test Runner
 *
 * Executes tests using the provided MCP client.
 */
export class TestRunner {
	constructor(private client: IMCPTestClient) {}

	/**
	 * Run a single test specification
	 *
	 * @param spec - Test specification to run
	 * @returns Test result
	 */
	async runTest(spec: TestSpec): Promise<TestResult> {
		// Handle skipped tests
		if (spec.skip) {
			return {
				name: spec.name,
				description: spec.description,
				passed: false,
				duration: 0,
				assertions: [],
				skipped: true,
			};
		}

		const startTime = Date.now();

		try {
			// Call the tool
			const response = await this.client.callTool(spec.tool, spec.arguments);
			const duration = Date.now() - startTime;

			// Run assertions
			const assertionResults = await runAssertions(spec.assertions, response, duration);

			// Determine if test passed (all assertions must pass)
			const passed = assertionResults.every((a) => a.passed);

			return {
				name: spec.name,
				description: spec.description,
				passed,
				duration,
				assertions: assertionResults,
			};
		} catch (error) {
			const duration = Date.now() - startTime;

			return {
				name: spec.name,
				description: spec.description,
				passed: false,
				duration,
				assertions: [],
				error: {
					message: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : undefined,
				},
			};
		}
	}

	/**
	 * Run multiple test specifications
	 *
	 * @param specs - Array of test specifications
	 * @param serverUrl - Server URL being tested (for reporting)
	 * @returns Complete test run results
	 */
	async runTests(specs: TestSpec[], serverUrl?: string): Promise<TestRunResults> {
		const startTime = Date.now();
		const results: TestResult[] = [];

		// Check for "only" tests
		const onlyTests = specs.filter((s) => s.only);
		const testsToRun = onlyTests.length > 0 ? onlyTests : specs;

		// Run each test
		for (const spec of testsToRun) {
			const result = await this.runTest(spec);
			results.push(result);
		}

		const totalDuration = Date.now() - startTime;

		// Build summary
		const summary: TestSummary = {
			total: results.length,
			passed: results.filter((r) => r.passed).length,
			failed: results.filter((r) => !r.passed && !r.skipped).length,
			skipped: results.filter((r) => r.skipped).length,
			duration: totalDuration,
			successRate: results.length > 0 ? results.filter((r) => r.passed).length / results.length : 0,
		};

		// Collect failures
		const failures = results
			.filter((r) => !r.passed && !r.skipped)
			.flatMap((r) => {
				// If test had an error
				if (r.error) {
					return [
						{
							test: r.name,
							assertion: "execution",
							expected: "successful execution",
							actual: "error",
							message: r.error.message,
						},
					];
				}

				// Failed assertions
				return r.assertions
					.filter((a) => !a.passed)
					.map((a) => ({
						test: r.name,
						assertion: a.type,
						expected: a.expected,
						actual: a.actual,
						message: a.message || "Assertion failed",
					}));
			});

		return {
			summary,
			tests: results,
			failures,
			timestamp: new Date().toISOString(),
			serverUrl,
		};
	}

	/**
	 * Connect to the MCP server
	 *
	 * Must be called before running tests.
	 */
	async connect(): Promise<void> {
		await this.client.connect();
	}

	/**
	 * Disconnect from the MCP server
	 *
	 * Should be called after tests complete.
	 */
	async disconnect(): Promise<void> {
		await this.client.disconnect();
	}
}
