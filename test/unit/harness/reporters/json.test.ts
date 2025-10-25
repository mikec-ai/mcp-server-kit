/**
 * JSON Reporter Tests
 *
 * Tests for JSON output formatting
 */

import { describe, it, expect } from "vitest";
import {
	formatAsJSON,
	formatSimpleSummary,
	printJSON,
} from "../../../../src/harness/reporters/json.js";
import type { TestRunResults } from "../../../../src/harness/types/results.js";

describe("JSON Reporter", () => {
	// Sample test results for testing
	const createSampleResults = (overrides?: Partial<TestRunResults>): TestRunResults => ({
		summary: {
			total: 3,
			passed: 2,
			failed: 1,
			skipped: 0,
			duration: 150,
			successRate: 0.6667,
		},
		tests: [
			{
				name: "Test 1",
				passed: true,
				duration: 50,
				assertions: [
					{
						type: "success",
						passed: true,
						message: "Tool call succeeded",
					},
				],
			},
			{
				name: "Test 2",
				passed: true,
				duration: 60,
				assertions: [
					{
						type: "contains_text",
						passed: true,
						message: "Response contains expected text",
					},
				],
			},
			{
				name: "Test 3",
				passed: false,
				duration: 40,
				assertions: [
					{
						type: "success",
						passed: false,
						message: "Tool call failed",
						expected: false,
						actual: true,
					},
				],
			},
		],
		failures: [
			{
				test: "Test 3",
				assertion: "success",
				expected: false,
				actual: true,
				message: "Tool call failed",
			},
		],
		timestamp: "2025-01-01T12:00:00.000Z",
		...overrides,
	});

	describe("formatAsJSON", () => {
		it("should format results as pretty JSON by default", () => {
			const results = createSampleResults();
			const json = formatAsJSON(results);

			// Should be pretty-printed (contains newlines and indentation)
			expect(json).toContain("\n");
			expect(json).toContain("  ");

			// Should be parseable
			const parsed = JSON.parse(json);
			expect(parsed.summary.total).toBe(3);
			expect(parsed.summary.passed).toBe(2);
			expect(parsed.summary.failed).toBe(1);
		});

		it("should format results as compact JSON when pretty is false", () => {
			const results = createSampleResults();
			const json = formatAsJSON(results, false);

			// Should be compact (no unnecessary whitespace)
			expect(json).not.toContain("\n  ");

			// Should still be parseable
			const parsed = JSON.parse(json);
			expect(parsed.summary.total).toBe(3);
		});

		it("should include all test results", () => {
			const results = createSampleResults();
			const json = formatAsJSON(results);
			const parsed = JSON.parse(json);

			expect(parsed.tests).toHaveLength(3);
			expect(parsed.tests[0].name).toBe("Test 1");
			expect(parsed.tests[1].name).toBe("Test 2");
			expect(parsed.tests[2].name).toBe("Test 3");
		});

		it("should include test assertions", () => {
			const results = createSampleResults();
			const json = formatAsJSON(results);
			const parsed = JSON.parse(json);

			expect(parsed.tests[0].assertions).toHaveLength(1);
			expect(parsed.tests[0].assertions[0].type).toBe("success");
			expect(parsed.tests[0].assertions[0].passed).toBe(true);
		});

		it("should include failure details", () => {
			const results = createSampleResults();
			const json = formatAsJSON(results);
			const parsed = JSON.parse(json);

			expect(parsed.failures).toHaveLength(1);
			expect(parsed.failures[0].test).toBe("Test 3");
			expect(parsed.failures[0].assertion).toBe("success");
		});

		it("should include summary statistics", () => {
			const results = createSampleResults();
			const json = formatAsJSON(results);
			const parsed = JSON.parse(json);

			expect(parsed.summary.total).toBe(3);
			expect(parsed.summary.passed).toBe(2);
			expect(parsed.summary.failed).toBe(1);
			expect(parsed.summary.skipped).toBe(0);
			expect(parsed.summary.duration).toBe(150);
			expect(parsed.summary.successRate).toBeCloseTo(0.6667, 4);
		});

		it("should include timestamp", () => {
			const results = createSampleResults();
			const json = formatAsJSON(results);
			const parsed = JSON.parse(json);

			expect(parsed.timestamp).toBe("2025-01-01T12:00:00.000Z");
		});

		it("should include server URL when present", () => {
			const results = createSampleResults({ serverUrl: "http://localhost:8788" });
			const json = formatAsJSON(results);
			const parsed = JSON.parse(json);

			expect(parsed.serverUrl).toBe("http://localhost:8788");
		});

		it("should handle skipped tests", () => {
			const results = createSampleResults({
				tests: [
					{
						name: "Skipped test",
						passed: false,
						skipped: true,
						duration: 0,
						assertions: [],
					},
				],
				summary: {
					total: 1,
					passed: 0,
					failed: 0,
					skipped: 1,
					duration: 0,
					successRate: 0,
				},
			});
			const json = formatAsJSON(results);
			const parsed = JSON.parse(json);

			expect(parsed.tests[0].skipped).toBe(true);
			expect(parsed.summary.skipped).toBe(1);
		});

		it("should handle test errors", () => {
			const results = createSampleResults({
				tests: [
					{
						name: "Error test",
						passed: false,
						duration: 10,
						assertions: [],
						error: {
							message: "Unexpected error occurred",
							stack: "Error: Unexpected error\n  at test.ts:10",
						},
					},
				],
			});
			const json = formatAsJSON(results);
			const parsed = JSON.parse(json);

			expect(parsed.tests[0].error).toBeDefined();
			expect(parsed.tests[0].error.message).toBe("Unexpected error occurred");
			expect(parsed.tests[0].error.stack).toContain("Error: Unexpected error");
		});

		it("should handle empty test results", () => {
			const results = createSampleResults({
				tests: [],
				failures: [],
				summary: {
					total: 0,
					passed: 0,
					failed: 0,
					skipped: 0,
					duration: 0,
					successRate: 0,
				},
			});
			const json = formatAsJSON(results);
			const parsed = JSON.parse(json);

			expect(parsed.tests).toHaveLength(0);
			expect(parsed.failures).toHaveLength(0);
			expect(parsed.summary.total).toBe(0);
		});
	});

	describe("formatSimpleSummary", () => {
		it("should format a simple summary", () => {
			const results = createSampleResults();
			const json = formatSimpleSummary(results);
			const parsed = JSON.parse(json);

			expect(parsed.passed).toBe(false); // Not all tests passed
			expect(parsed.total).toBe(3);
			expect(parsed.passed_count).toBe(2);
			expect(parsed.failed_count).toBe(1);
			expect(parsed.duration_ms).toBe(150);
			expect(parsed.success_rate).toBeCloseTo(0.6667, 4);
		});

		it("should indicate all tests passed", () => {
			const results = createSampleResults({
				summary: {
					total: 2,
					passed: 2,
					failed: 0,
					skipped: 0,
					duration: 100,
					successRate: 1.0,
				},
			});
			const json = formatSimpleSummary(results);
			const parsed = JSON.parse(json);

			expect(parsed.passed).toBe(true); // All tests passed
		});

		it("should handle zero tests", () => {
			const results = createSampleResults({
				summary: {
					total: 0,
					passed: 0,
					failed: 0,
					skipped: 0,
					duration: 0,
					successRate: 0,
				},
			});
			const json = formatSimpleSummary(results);
			const parsed = JSON.parse(json);

			expect(parsed.total).toBe(0);
			expect(parsed.passed).toBe(true); // No failures = passed
		});

		it("should be pretty-printed", () => {
			const results = createSampleResults();
			const json = formatSimpleSummary(results);

			// Should be pretty-printed
			expect(json).toContain("\n");
			expect(json).toContain("  ");
		});
	});

	describe("printJSON", () => {
		it("should print JSON to console", () => {
			const results = createSampleResults();

			// Mock console.log to capture output
			const originalLog = console.log;
			let output = "";
			console.log = (msg: string) => {
				output = msg;
			};

			printJSON(results);

			// Restore console.log
			console.log = originalLog;

			// Verify output is valid JSON
			expect(output).toBeTruthy();
			const parsed = JSON.parse(output);
			expect(parsed.summary.total).toBe(3);
		});

		it("should print compact JSON when pretty is false", () => {
			const results = createSampleResults();

			// Mock console.log
			const originalLog = console.log;
			let output = "";
			console.log = (msg: string) => {
				output = msg;
			};

			printJSON(results, false);

			// Restore console.log
			console.log = originalLog;

			// Should be compact
			expect(output).not.toContain("\n  ");
			const parsed = JSON.parse(output);
			expect(parsed.summary.total).toBe(3);
		});
	});
});
