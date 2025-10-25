/**
 * Unit Tests for JSON Path Assertion
 */

import { describe, it, expect } from "vitest";
import { checkJsonPath } from "../../../src/harness/assertions/json-path.ts";
import type { MCPToolResponse } from "../../../src/harness/types/client.ts";

describe("checkJsonPath", () => {
	it("should pass when JSON path matches expected value", async () => {
		const response: MCPToolResponse = {
			content: [
				{
					type: "text",
					text: JSON.stringify({ name: "John", age: 30 }),
				},
			],
			isError: false,
		};

		const result = await checkJsonPath(response, "$.name", "John");

		expect(result.type).toBe("json_path");
		expect(result.passed).toBe(true);
		expect(result.message).toContain("matches");
	});

	it("should fail when JSON path does not match expected value", async () => {
		const response: MCPToolResponse = {
			content: [
				{
					type: "text",
					text: JSON.stringify({ name: "John", age: 30 }),
				},
			],
			isError: false,
		};

		const result = await checkJsonPath(response, "$.name", "Jane");

		expect(result.passed).toBe(false);
		expect(result.message).toContain("does not match");
		expect(result.expected).toContain("Jane");
		expect(result.actual).toContain("John");
	});

	it("should handle nested JSON paths", async () => {
		const response: MCPToolResponse = {
			content: [
				{
					type: "text",
					text: JSON.stringify({
						user: { profile: { name: "John" } },
					}),
				},
			],
			isError: false,
		};

		const result = await checkJsonPath(response, "$.user.profile.name", "John");

		expect(result.passed).toBe(true);
	});

	it("should handle array indexing", async () => {
		const response: MCPToolResponse = {
			content: [
				{
					type: "text",
					text: JSON.stringify({ items: ["apple", "banana", "cherry"] }),
				},
			],
			isError: false,
		};

		const result = await checkJsonPath(response, "$.items[1]", "banana");

		expect(result.passed).toBe(true);
	});

	it("should fail when JSON path does not exist", async () => {
		const response: MCPToolResponse = {
			content: [
				{
					type: "text",
					text: JSON.stringify({ name: "John" }),
				},
			],
			isError: false,
		};

		const result = await checkJsonPath(response, "$.nonexistent", "value");

		expect(result.passed).toBe(false);
		expect(result.message).toContain("does not match");
	});

	it("should fail when response is not valid JSON", async () => {
		const response: MCPToolResponse = {
			content: [{ type: "text", text: "Not JSON" }],
			isError: false,
		};

		const result = await checkJsonPath(response, "$.name", "John");

		expect(result.passed).toBe(false);
		expect(result.message).toContain("not valid JSON");
	});

	it("should handle numeric values", async () => {
		const response: MCPToolResponse = {
			content: [
				{
					type: "text",
					text: JSON.stringify({ count: 42 }),
				},
			],
			isError: false,
		};

		const result = await checkJsonPath(response, "$.count", 42);

		expect(result.passed).toBe(true);
	});

	it("should handle boolean values", async () => {
		const response: MCPToolResponse = {
			content: [
				{
					type: "text",
					text: JSON.stringify({ active: true }),
				},
			],
			isError: false,
		};

		const result = await checkJsonPath(response, "$.active", true);

		expect(result.passed).toBe(true);
	});

	it("should handle null values", async () => {
		const response: MCPToolResponse = {
			content: [
				{
					type: "text",
					text: JSON.stringify({ value: null }),
				},
			],
			isError: false,
		};

		const result = await checkJsonPath(response, "$.value", null);

		expect(result.passed).toBe(true);
	});

	it("should handle empty objects", async () => {
		const response: MCPToolResponse = {
			content: [
				{
					type: "text",
					text: JSON.stringify({}),
				},
			],
			isError: false,
		};

		const result = await checkJsonPath(response, "$.name", "John");

		expect(result.passed).toBe(false);
	});
});
