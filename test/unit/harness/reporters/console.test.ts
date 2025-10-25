/**
 * Console Reporter Tests
 *
 * Tests for console output formatting
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
	printConsole,
	printSimple,
} from "../../../../src/harness/reporters/console.js";
import type { TestRunResults } from "../../../../src/harness/types/results.js";

describe("Console Reporter", () => {
	// Sample test results
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

	// Console capture helper
	let consoleOutput: string[] = [];
	let originalLog: typeof console.log;

	beforeEach(() => {
		consoleOutput = [];
		originalLog = console.log;
		console.log = (...args: unknown[]) => {
			consoleOutput.push(args.join(" "));
		};
	});

	afterEach(() => {
		console.log = originalLog;
	});

	describe("printConsole", () => {
		it("should print test results to console", () => {
			const results = createSampleResults();
			printConsole(results);

			const output = consoleOutput.join("\n");
			expect(output).toBeTruthy();
			expect(consoleOutput.length).toBeGreaterThan(0);
		});

		it("should include header", () => {
			const results = createSampleResults();
			printConsole(results);

			const output = consoleOutput.join("\n");
			expect(output).toContain("Running Integration Tests");
		});

		it("should include timestamp", () => {
			const results = createSampleResults();
			printConsole(results);

			const output = consoleOutput.join("\n");
			expect(output).toContain("Timestamp:");
			expect(output).toContain("2025-01-01T12:00:00.000Z");
		});

		it("should include server URL when present", () => {
			const results = createSampleResults({ serverUrl: "http://localhost:8788" });
			printConsole(results);

			const output = consoleOutput.join("\n");
			expect(output).toContain("Server:");
			expect(output).toContain("http://localhost:8788");
		});

		it("should show passed tests with PASS indicator", () => {
			const results = createSampleResults();
			printConsole(results);

			const output = consoleOutput.join("\n");
			expect(output).toContain("Test 1");
			expect(output).toContain("Test 2");
			// Contains ANSI codes for green PASS
			expect(output).toMatch(/PASS.*Test 1/);
		});

		it("should show failed tests with FAIL indicator", () => {
			const results = createSampleResults();
			printConsole(results);

			const output = consoleOutput.join("\n");
			expect(output).toContain("Test 3");
			// Contains ANSI codes for red FAIL
			expect(output).toMatch(/FAIL.*Test 3/);
		});

		it("should show skipped tests with SKIP indicator", () => {
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
			printConsole(results);

			const output = consoleOutput.join("\n");
			expect(output).toContain("Skipped test");
			expect(output).toMatch(/SKIP/);
		});

		it("should show test durations", () => {
			const results = createSampleResults();
			printConsole(results);

			const output = consoleOutput.join("\n");
			expect(output).toMatch(/50ms/);
			expect(output).toMatch(/60ms/);
			expect(output).toMatch(/40ms/);
		});

		it("should show test summary", () => {
			const results = createSampleResults();
			printConsole(results);

			const output = consoleOutput.join("\n");
			expect(output).toContain("Test Summary");
			expect(output).toContain("Total:");
			expect(output).toContain("3");
			expect(output).toContain("Passed:");
			expect(output).toContain("2");
			expect(output).toContain("Failed:");
			expect(output).toContain("1");
		});

		it("should show success rate", () => {
			const results = createSampleResults();
			printConsole(results);

			const output = consoleOutput.join("\n");
			expect(output).toContain("Success Rate:");
			expect(output).toMatch(/66\.\d%/); // 66.7%
		});

		it("should show total duration", () => {
			const results = createSampleResults();
			printConsole(results);

			const output = consoleOutput.join("\n");
			expect(output).toContain("Duration:");
			expect(output).toContain("150ms");
		});

		it("should show skipped count when present", () => {
			const results = createSampleResults({
				summary: {
					total: 4,
					passed: 2,
					failed: 1,
					skipped: 1,
					duration: 150,
					successRate: 0.5,
				},
			});
			printConsole(results);

			const output = consoleOutput.join("\n");
			expect(output).toContain("Skipped:");
			expect(output).toContain("1");
		});

		it("should not show skipped count when zero", () => {
			const results = createSampleResults();
			printConsole(results);

			const output = consoleOutput.join("\n");
			// Should not have a "Skipped: 0" line
			const skippedLines = consoleOutput.filter((line) =>
				line.includes("Skipped:"),
			);
			expect(skippedLines.length).toBe(0);
		});

		it("should show failure details", () => {
			const results = createSampleResults();
			printConsole(results);

			const output = consoleOutput.join("\n");
			expect(output).toContain("Failures:");
			expect(output).toContain("Test 3");
			expect(output).toContain("Assertion: success");
			expect(output).toContain("Message: Tool call failed");
		});

		it("should show expected and actual values for failures", () => {
			const results = createSampleResults();
			printConsole(results);

			const output = consoleOutput.join("\n");
			expect(output).toContain("Expected:");
			expect(output).toContain("false");
			expect(output).toContain("Actual:");
			expect(output).toContain("true");
		});

		it("should show failed assertions inline", () => {
			const results = createSampleResults();
			printConsole(results);

			const output = consoleOutput.join("\n");
			// Failed assertion details should appear near the test name
			expect(output).toContain("success: Tool call failed");
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
			printConsole(results);

			const output = consoleOutput.join("\n");
			expect(output).toContain("Error test");
			expect(output).toContain("Unexpected error occurred");
		});

		it("should not show failures section when no failures", () => {
			const results = createSampleResults({
				tests: [
					{
						name: "Test 1",
						passed: true,
						duration: 50,
						assertions: [
							{
								type: "success",
								passed: true,
								message: "Test passed",
							},
						],
					},
				],
				failures: [],
				summary: {
					total: 1,
					passed: 1,
					failed: 0,
					skipped: 0,
					duration: 50,
					successRate: 1.0,
				},
			});
			printConsole(results);

			const output = consoleOutput.join("\n");
			// Should not have "Failures:" header when no failures
			const failureLines = consoleOutput.filter((line) =>
				line.includes("Failures:"),
			);
			expect(failureLines.length).toBe(0);
		});
	});

	describe("printSimple", () => {
		it("should print simple pass message when all tests pass", () => {
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
			printSimple(results);

			const output = consoleOutput.join("\n");
			expect(output).toContain("All tests passed");
			expect(output).toContain("2/2");
		});

		it("should print simple fail message when tests fail", () => {
			const results = createSampleResults();
			printSimple(results);

			const output = consoleOutput.join("\n");
			expect(output).toContain("Tests failed");
			expect(output).toContain("1 failed");
			expect(output).toContain("2 passed");
		});

		it("should include checkmark for passing tests", () => {
			const results = createSampleResults({
				summary: {
					total: 1,
					passed: 1,
					failed: 0,
					skipped: 0,
					duration: 50,
					successRate: 1.0,
				},
			});
			printSimple(results);

			const output = consoleOutput.join("\n");
			expect(output).toMatch(/✓/);
		});

		it("should include X mark for failing tests", () => {
			const results = createSampleResults();
			printSimple(results);

			const output = consoleOutput.join("\n");
			expect(output).toMatch(/✗/);
		});

		it("should be a single line output", () => {
			const results = createSampleResults();
			printSimple(results);

			// Should only output one line
			expect(consoleOutput.length).toBe(1);
		});
	});

	describe("ANSI Color Codes", () => {
		it("should use green color for PASS", () => {
			const results = createSampleResults();
			printConsole(results);

			const output = consoleOutput.join("\n");
			// ANSI green color code
			expect(output).toContain("\x1b[32m");
		});

		it("should use red color for FAIL", () => {
			const results = createSampleResults();
			printConsole(results);

			const output = consoleOutput.join("\n");
			// ANSI red color code
			expect(output).toContain("\x1b[31m");
		});

		it("should use yellow color for SKIP", () => {
			const results = createSampleResults({
				tests: [
					{
						name: "Skipped",
						passed: false,
						skipped: true,
						duration: 0,
						assertions: [],
					},
				],
			});
			printConsole(results);

			const output = consoleOutput.join("\n");
			// ANSI yellow color code
			expect(output).toContain("\x1b[33m");
		});

		it("should use gray color for duration", () => {
			const results = createSampleResults();
			printConsole(results);

			const output = consoleOutput.join("\n");
			// ANSI gray color code
			expect(output).toContain("\x1b[90m");
		});

		it("should use reset code", () => {
			const results = createSampleResults();
			printConsole(results);

			const output = consoleOutput.join("\n");
			// ANSI reset code
			expect(output).toContain("\x1b[0m");
		});
	});
});
