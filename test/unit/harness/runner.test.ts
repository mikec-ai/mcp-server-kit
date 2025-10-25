/**
 * runner - Unit Tests
 *
 * Tests for the core test runner
 */

import { describe, it, expect, beforeEach } from "vitest";
import { TestRunner } from "../../../src/harness/runner.js";
import { createMockMCPClient, createSuccessResponse, createErrorResponse } from "../../helpers/mocks.js";
import type { TestSpec } from "../../../src/harness/types/spec.js";
import type { IMCPTestClient } from "../../../src/harness/types/client.js";

describe("TestRunner", () => {
	let client: IMCPTestClient;
	let runner: TestRunner;

	beforeEach(() => {
		client = createMockMCPClient();
		runner = new TestRunner(client);
	});

	describe("runTest", () => {
		it("should run a successful test", async () => {
			const spec: TestSpec = {
				name: "Test success",
				description: "A successful test",
				tool: "echo",
				arguments: { message: "hello" },
				assertions: [
					{ type: "success" },
				],
			};

			const result = await runner.runTest(spec);

			expect(result.name).toBe("Test success");
			expect(result.description).toBe("A successful test");
			expect(result.passed).toBe(true);
			expect(result.duration).toBeGreaterThanOrEqual(0);
			expect(result.assertions).toHaveLength(1);
			expect(result.assertions[0].passed).toBe(true);
		});

		it("should run a failing test", async () => {
			// Mock client to return error
			client = createMockMCPClient({
				callTool: async () => createErrorResponse("Tool failed"),
			});
			runner = new TestRunner(client);

			const spec: TestSpec = {
				name: "Test failure",
				description: "A failing test",
				tool: "failing_tool",
				arguments: {},
				assertions: [
					{ type: "success" },
				],
			};

			const result = await runner.runTest(spec);

			expect(result.passed).toBe(false);
			expect(result.assertions[0].passed).toBe(false);
		});

		it("should handle test execution errors", async () => {
			// Mock client to throw error
			client = createMockMCPClient({
				callTool: async () => {
					throw new Error("Network error");
				},
			});
			runner = new TestRunner(client);

			const spec: TestSpec = {
				name: "Test error",
				description: "A test with execution error",
				tool: "broken_tool",
				arguments: {},
				assertions: [
					{ type: "success" },
				],
			};

			const result = await runner.runTest(spec);

			expect(result.passed).toBe(false);
			expect(result.error).toBeDefined();
			expect(result.error?.message).toBe("Network error");
			expect(result.assertions).toHaveLength(0); // No assertions run
		});

		it("should skip tests marked with skip: true", async () => {
			const spec: TestSpec = {
				name: "Skipped test",
				description: "This test should be skipped",
				tool: "echo",
				arguments: {},
				assertions: [{ type: "success" }],
				skip: true,
			};

			const result = await runner.runTest(spec);

			expect(result.skipped).toBe(true);
			expect(result.passed).toBe(false);
			expect(result.duration).toBe(0);
			expect(result.assertions).toHaveLength(0);
		});

		it("should track test duration", async () => {
			// Mock with delay
			client = createMockMCPClient({
				callTool: async () => {
					await new Promise(resolve => setTimeout(resolve, 10));
					return createSuccessResponse({ result: "ok" });
				},
			});
			runner = new TestRunner(client);

			const spec: TestSpec = {
				name: "Duration test",
				description: "Test duration tracking",
				tool: "slow_tool",
				arguments: {},
				assertions: [{ type: "success" }],
			};

			const result = await runner.runTest(spec);

			expect(result.duration).toBeGreaterThanOrEqual(10);
		});

		it("should pass tool name and arguments to client", async () => {
			let capturedName: string | undefined;
			let capturedArgs: unknown;

			client = createMockMCPClient({
				callTool: async (name, args) => {
					capturedName = name;
					capturedArgs = args;
					return createSuccessResponse({ ok: true });
				},
			});
			runner = new TestRunner(client);

			const spec: TestSpec = {
				name: "Parameter test",
				description: "Test parameter passing",
				tool: "test_tool",
				arguments: { foo: "bar", count: 42 },
				assertions: [{ type: "success" }],
			};

			await runner.runTest(spec);

			expect(capturedName).toBe("test_tool");
			expect(capturedArgs).toEqual({ foo: "bar", count: 42 });
		});

		it("should run all assertions", async () => {
			const spec: TestSpec = {
				name: "Multiple assertions",
				description: "Test with multiple assertions",
				tool: "echo",
				arguments: { message: "test" },
				assertions: [
					{ type: "success" },
					{ type: "response_time_ms", max: 1000 },
					{ type: "contains_text", text: "test" },
				],
			};

			const result = await runner.runTest(spec);

			expect(result.assertions).toHaveLength(3);
		});

		it("should fail test if any assertion fails", async () => {
			client = createMockMCPClient({
				callTool: async () => createSuccessResponse({ value: "wrong" }),
			});
			runner = new TestRunner(client);

			const spec: TestSpec = {
				name: "Partial failure",
				description: "Test with one failing assertion",
				tool: "echo",
				arguments: {},
				assertions: [
					{ type: "success" }, // passes
					{ type: "contains_text", text: "expected" }, // fails
				],
			};

			const result = await runner.runTest(spec);

			expect(result.passed).toBe(false);
			expect(result.assertions[0].passed).toBe(true);
			expect(result.assertions[1].passed).toBe(false);
		});
	});

	describe("runTests", () => {
		it("should run multiple tests", async () => {
			const specs: TestSpec[] = [
				{
					name: "Test 1",
					description: "First test",
					tool: "echo",
					arguments: {},
					assertions: [{ type: "success" }],
				},
				{
					name: "Test 2",
					description: "Second test",
					tool: "echo",
					arguments: {},
					assertions: [{ type: "success" }],
				},
			];

			const results = await runner.runTests(specs);

			expect(results.tests).toHaveLength(2);
			expect(results.summary.total).toBe(2);
			expect(results.summary.passed).toBe(2);
			expect(results.summary.failed).toBe(0);
		});

		it("should calculate correct summary for mixed results", async () => {
			// First succeeds, second fails
			let callCount = 0;
			client = createMockMCPClient({
				callTool: async () => {
					callCount++;
					if (callCount === 1) {
						return createSuccessResponse({ ok: true });
					}
					return createErrorResponse("Failed");
				},
			});
			runner = new TestRunner(client);

			const specs: TestSpec[] = [
				{
					name: "Pass",
					description: "Passing test",
					tool: "echo",
					arguments: {},
					assertions: [{ type: "success" }],
				},
				{
					name: "Fail",
					description: "Failing test",
					tool: "echo",
					arguments: {},
					assertions: [{ type: "success" }],
				},
			];

			const results = await runner.runTests(specs);

			expect(results.summary.total).toBe(2);
			expect(results.summary.passed).toBe(1);
			expect(results.summary.failed).toBe(1);
			expect(results.summary.skipped).toBe(0);
			expect(results.summary.successRate).toBe(0.5);
		});

		it("should track skipped tests in summary", async () => {
			const specs: TestSpec[] = [
				{
					name: "Run",
					description: "Normal test",
					tool: "echo",
					arguments: {},
					assertions: [{ type: "success" }],
				},
				{
					name: "Skip",
					description: "Skipped test",
					tool: "echo",
					arguments: {},
					assertions: [{ type: "success" }],
					skip: true,
				},
			];

			const results = await runner.runTests(specs);

			expect(results.summary.total).toBe(2);
			expect(results.summary.passed).toBe(1);
			expect(results.summary.failed).toBe(0);
			expect(results.summary.skipped).toBe(1);
		});

		it("should collect failure details", async () => {
			client = createMockMCPClient({
				callTool: async () => createErrorResponse("Tool error"),
			});
			runner = new TestRunner(client);

			const specs: TestSpec[] = [
				{
					name: "Failing test",
					description: "A test that fails",
					tool: "failing_tool",
					arguments: {},
					assertions: [{ type: "success" }],
				},
			];

			const results = await runner.runTests(specs);

			expect(results.failures).toHaveLength(1);
			expect(results.failures[0].test).toBe("Failing test");
			expect(results.failures[0].assertion).toBe("success");
		});

		it("should collect execution error failures", async () => {
			client = createMockMCPClient({
				callTool: async () => {
					throw new Error("Connection timeout");
				},
			});
			runner = new TestRunner(client);

			const specs: TestSpec[] = [
				{
					name: "Error test",
					description: "Test with execution error",
					tool: "broken_tool",
					arguments: {},
					assertions: [{ type: "success" }],
				},
			];

			const results = await runner.runTests(specs);

			expect(results.failures).toHaveLength(1);
			expect(results.failures[0].test).toBe("Error test");
			expect(results.failures[0].assertion).toBe("execution");
			expect(results.failures[0].message).toBe("Connection timeout");
		});

		it("should only run tests marked with 'only'", async () => {
			const specs: TestSpec[] = [
				{
					name: "Normal test",
					description: "Should be skipped",
					tool: "echo",
					arguments: {},
					assertions: [{ type: "success" }],
				},
				{
					name: "Only test",
					description: "Should run",
					tool: "echo",
					arguments: {},
					assertions: [{ type: "success" }],
					only: true,
				},
			];

			const results = await runner.runTests(specs);

			expect(results.tests).toHaveLength(1);
			expect(results.tests[0].name).toBe("Only test");
		});

		it("should include timestamp in results", async () => {
			const specs: TestSpec[] = [
				{
					name: "Test",
					description: "Test",
					tool: "echo",
					arguments: {},
					assertions: [{ type: "success" }],
				},
			];

			const results = await runner.runTests(specs);

			expect(results.timestamp).toBeDefined();
			expect(new Date(results.timestamp).toString()).not.toBe("Invalid Date");
		});

		it("should include serverUrl when provided", async () => {
			const specs: TestSpec[] = [
				{
					name: "Test",
					description: "Test",
					tool: "echo",
					arguments: {},
					assertions: [{ type: "success" }],
				},
			];

			const results = await runner.runTests(specs, "http://localhost:8788");

			expect(results.serverUrl).toBe("http://localhost:8788");
		});

		it("should calculate total duration", async () => {
			const specs: TestSpec[] = [
				{
					name: "Test 1",
					description: "First",
					tool: "echo",
					arguments: {},
					assertions: [{ type: "success" }],
				},
				{
					name: "Test 2",
					description: "Second",
					tool: "echo",
					arguments: {},
					assertions: [{ type: "success" }],
				},
			];

			const results = await runner.runTests(specs);

			// Duration should be a non-negative number (can be 0 for very fast tests)
			expect(results.summary.duration).toBeGreaterThanOrEqual(0);
			expect(typeof results.summary.duration).toBe("number");
		});

		it("should handle empty test array", async () => {
			const results = await runner.runTests([]);

			expect(results.tests).toHaveLength(0);
			expect(results.summary.total).toBe(0);
			expect(results.summary.passed).toBe(0);
			expect(results.summary.failed).toBe(0);
			expect(results.summary.successRate).toBe(0);
		});
	});

	describe("connect/disconnect", () => {
		it("should call client connect", async () => {
			let connected = false;
			client = createMockMCPClient({
				connect: async () => {
					connected = true;
				},
			});
			runner = new TestRunner(client);

			await runner.connect();

			expect(connected).toBe(true);
		});

		it("should call client disconnect", async () => {
			let disconnected = false;
			client = createMockMCPClient({
				disconnect: async () => {
					disconnected = true;
				},
			});
			runner = new TestRunner(client);

			await runner.disconnect();

			expect(disconnected).toBe(true);
		});
	});
});
