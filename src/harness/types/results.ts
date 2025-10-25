/**
 * Test Results Types
 *
 * Defines the output format for test execution results.
 *
 * Design: Fully portable, structured for agent consumption
 */

import type { Assertion } from "./spec.js";

/**
 * Result of a single assertion
 */
export interface AssertionResult {
	/** Assertion type */
	type: string;

	/** Whether assertion passed */
	passed: boolean;

	/** Error message if failed */
	message?: string;

	/** Expected value (for display) */
	expected?: any;

	/** Actual value (for display) */
	actual?: any;
}

/**
 * Result of a single test
 */
export interface TestResult {
	/** Test name */
	name: string;

	/** Test description */
	description?: string;

	/** Whether test passed overall */
	passed: boolean;

	/** Test execution duration in milliseconds */
	duration: number;

	/** Individual assertion results */
	assertions: AssertionResult[];

	/** Error details if test failed to execute */
	error?: {
		message: string;
		stack?: string;
	};

	/** Whether test was skipped */
	skipped?: boolean;
}

/**
 * Summary statistics for test run
 */
export interface TestSummary {
	/** Total tests executed */
	total: number;

	/** Tests that passed */
	passed: number;

	/** Tests that failed */
	failed: number;

	/** Tests that were skipped */
	skipped: number;

	/** Total execution duration in milliseconds */
	duration: number;

	/** Success rate (0-1) */
	successRate: number;
}

/**
 * Complete test run results
 *
 * This is the primary output format for agents to consume.
 */
export interface TestRunResults {
	/** Summary statistics */
	summary: TestSummary;

	/** Individual test results */
	tests: TestResult[];

	/** List of failed tests with details */
	failures: Array<{
		/** Test name */
		test: string;

		/** Failed assertion type */
		assertion: string;

		/** Expected value */
		expected: any;

		/** Actual value */
		actual: any;

		/** Error message */
		message: string;

		/** Test spec file (if applicable) */
		file?: string;
	}>;

	/** Timestamp when tests were run */
	timestamp: string;

	/** Server URL tested against */
	serverUrl?: string;
}
