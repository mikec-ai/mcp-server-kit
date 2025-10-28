/**
 * Unit Tests for JSON Path Assertion
 */

import { describe, it, expect } from "vitest";
import { checkJsonPath } from "@/harness/assertions/index";
import type {
	MCPToolResponse,
	MCPPromptResponse,
	MCPResourceContent,
} from "@/harness/types/client";

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

	it("should handle deep equality for arrays", async () => {
		const response: MCPToolResponse = {
			content: [
				{
					type: "text",
					text: JSON.stringify({ items: [1, 2, 3] }),
				},
			],
			isError: false,
		};

		const result = await checkJsonPath(response, "$.items", [1, 2, 3]);

		expect(result.passed).toBe(true);
	});

	it("should fail when arrays have different lengths", async () => {
		const response: MCPToolResponse = {
			content: [
				{
					type: "text",
					text: JSON.stringify({ items: [1, 2, 3] }),
				},
			],
			isError: false,
		};

		const result = await checkJsonPath(response, "$.items", [1, 2]);

		expect(result.passed).toBe(false);
	});

	it("should fail when arrays have different values", async () => {
		const response: MCPToolResponse = {
			content: [
				{
					type: "text",
					text: JSON.stringify({ items: [1, 2, 3] }),
				},
			],
			isError: false,
		};

		const result = await checkJsonPath(response, "$.items", [1, 2, 4]);

		expect(result.passed).toBe(false);
	});

	it("should handle deep equality for objects", async () => {
		const response: MCPToolResponse = {
			content: [
				{
					type: "text",
					text: JSON.stringify({
						user: { name: "John", age: 30, active: true },
					}),
				},
			],
			isError: false,
		};

		const result = await checkJsonPath(response, "$.user", {
			name: "John",
			age: 30,
			active: true,
		});

		expect(result.passed).toBe(true);
	});

	it("should fail when objects have different keys", async () => {
		const response: MCPToolResponse = {
			content: [
				{
					type: "text",
					text: JSON.stringify({ user: { name: "John", age: 30 } }),
				},
			],
			isError: false,
		};

		const result = await checkJsonPath(response, "$.user", {
			name: "John",
		});

		expect(result.passed).toBe(false);
	});

	it("should fail when objects have different values", async () => {
		const response: MCPToolResponse = {
			content: [
				{
					type: "text",
					text: JSON.stringify({ user: { name: "John" } }),
				},
			],
			isError: false,
		};

		const result = await checkJsonPath(response, "$.user", {
			name: "Jane",
		});

		expect(result.passed).toBe(false);
	});

	it("should handle nested arrays", async () => {
		const response: MCPToolResponse = {
			content: [
				{
					type: "text",
					text: JSON.stringify({
						matrix: [
							[1, 2],
							[3, 4],
						],
					}),
				},
			],
			isError: false,
		};

		const result = await checkJsonPath(response, "$.matrix", [
			[1, 2],
			[3, 4],
		]);

		expect(result.passed).toBe(true);
	});

	it("should handle nested objects", async () => {
		const response: MCPToolResponse = {
			content: [
				{
					type: "text",
					text: JSON.stringify({
						company: {
							employees: {
								john: { role: "dev" },
								jane: { role: "designer" },
							},
						},
					}),
				},
			],
			isError: false,
		};

		const result = await checkJsonPath(response, "$.company.employees", {
			john: { role: "dev" },
			jane: { role: "designer" },
		});

		expect(result.passed).toBe(true);
	});

	it("should handle comparing array to non-array", async () => {
		const response: MCPToolResponse = {
			content: [
				{
					type: "text",
					text: JSON.stringify({ value: [1, 2, 3] }),
				},
			],
			isError: false,
		};

		const result = await checkJsonPath(response, "$.value", { a: 1 });

		expect(result.passed).toBe(false);
	});

	it("should handle comparing different types", async () => {
		const response: MCPToolResponse = {
			content: [
				{
					type: "text",
					text: JSON.stringify({ value: 42 }),
				},
			],
			isError: false,
		};

		const result = await checkJsonPath(response, "$.value", "42");

		expect(result.passed).toBe(false);
	});

	it("should handle empty arrays", async () => {
		const response: MCPToolResponse = {
			content: [
				{
					type: "text",
					text: JSON.stringify({ items: [] }),
				},
			],
			isError: false,
		};

		const result = await checkJsonPath(response, "$.items", []);

		expect(result.passed).toBe(true);
	});

	describe("Prompt Response Support", () => {
		it("should query prompt response object directly", async () => {
			const response: MCPPromptResponse = {
				messages: [
					{
						role: "user",
						content: {
							type: "text",
							text: "Hello",
						},
					},
					{
						role: "assistant",
						content: {
							type: "text",
							text: "World",
						},
					},
				],
			};

			const result = await checkJsonPath(response, "$.messages[0].role", "user");

			expect(result.passed).toBe(true);
		});

		it("should query nested prompt content", async () => {
			const response: MCPPromptResponse = {
				messages: [
					{
						role: "assistant",
						content: {
							type: "text",
							text: "Response text",
						},
					},
				],
			};

			const result = await checkJsonPath(
				response,
				"$.messages[0].content.text",
				"Response text",
			);

			expect(result.passed).toBe(true);
		});
	});

	describe("Resource Response Support", () => {
		it("should query resource response object directly", async () => {
			const response: MCPResourceContent = {
				contents: [
					{
						uri: "config://app",
						text: '{"key": "value"}',
						mimeType: "application/json",
					},
				],
			};

			const result = await checkJsonPath(
				response,
				"$.contents[0].mimeType",
				"application/json",
			);

			expect(result.passed).toBe(true);
		});

		it("should query multiple resource contents", async () => {
			const response: MCPResourceContent = {
				contents: [
					{
						uri: "resource://1",
						text: "First",
						mimeType: "text/plain",
					},
					{
						uri: "resource://2",
						text: "Second",
						mimeType: "text/plain",
					},
				],
			};

			const result = await checkJsonPath(
				response,
				"$.contents[1].uri",
				"resource://2",
			);

			expect(result.passed).toBe(true);
		});
	});

	describe("Error Handling", () => {
		it("should handle unknown response type", async () => {
			const invalidResponse = {
				unknown: "field",
			} as any;

			const result = await checkJsonPath(invalidResponse, "$.test", "value");

			expect(result.passed).toBe(false);
			expect(result.message).toContain("Unknown response type");
		});

		it("should handle exceptions during path evaluation", async () => {
			const response: MCPToolResponse = {
				content: [
					{
						type: "text",
						text: JSON.stringify({ valid: "json" }),
					},
				],
			};

			// Use an invalid JSONPath expression that might throw
			const result = await checkJsonPath(response, "$..[invalid", "value");

			expect(result.passed).toBe(false);
			// Error message should contain exception details
			expect(result.message).toBeTruthy();
		});
	});

	describe("optional expected field (existence checks)", () => {
		it("should pass when path exists and expected is omitted", async () => {
			const response: MCPToolResponse = {
				content: [
					{
						type: "text",
						text: JSON.stringify({ data: { id: "123" } }),
					},
				],
			};

			const result = await checkJsonPath(response, "$.data.id", undefined);

			expect(result.passed).toBe(true);
			expect(result.message).toContain("exists");
			expect(result.actual).toBe("123");
		});

		it("should fail when path doesn't exist and expected is omitted", async () => {
			const response: MCPToolResponse = {
				content: [
					{
						type: "text",
						text: JSON.stringify({ data: {} }),
					},
				],
			};

			const result = await checkJsonPath(response, "$.data.id", undefined);

			expect(result.passed).toBe(false);
			expect(result.message).toContain("does not exist");
		});

		it("should pass when path has null value and expected is omitted", async () => {
			const response: MCPToolResponse = {
				content: [
					{
						type: "text",
						text: JSON.stringify({ data: { id: null } }),
					},
				],
			};

			const result = await checkJsonPath(response, "$.data.id", undefined);

			expect(result.passed).toBe(true);
			expect(result.message).toContain("exists");
			expect(result.actual).toBeNull();
		});

		it("should pass when path has false value and expected is omitted", async () => {
			const response: MCPToolResponse = {
				content: [
					{
						type: "text",
						text: JSON.stringify({ active: false }),
					},
				],
			};

			const result = await checkJsonPath(response, "$.active", undefined);

			expect(result.passed).toBe(true);
			expect(result.message).toContain("exists");
			expect(result.actual).toBe(false);
		});

		it("should pass when path has zero value and expected is omitted", async () => {
			const response: MCPToolResponse = {
				content: [
					{
						type: "text",
						text: JSON.stringify({ count: 0 }),
					},
				],
			};

			const result = await checkJsonPath(response, "$.count", undefined);

			expect(result.passed).toBe(true);
			expect(result.message).toContain("exists");
			expect(result.actual).toBe(0);
		});

		it("should pass when path has empty string and expected is omitted", async () => {
			const response: MCPToolResponse = {
				content: [
					{
						type: "text",
						text: JSON.stringify({ name: "" }),
					},
				],
			};

			const result = await checkJsonPath(response, "$.name", undefined);

			expect(result.passed).toBe(true);
			expect(result.message).toContain("exists");
			expect(result.actual).toBe("");
		});
	});

	describe("type mismatch error messages", () => {
		it("should indicate type mismatch when comparing number to string", async () => {
			const response: MCPToolResponse = {
				content: [
					{
						type: "text",
						text: JSON.stringify({ count: 42 }),
					},
				],
			};

			const result = await checkJsonPath(response, "$.count", "42");

			expect(result.passed).toBe(false);
			expect(result.message).toContain("type mismatch: number vs string");
			expect(result.expected).toBe("42");
			expect(result.actual).toBe(42);
		});

		it("should indicate type mismatch when comparing string to number", async () => {
			const response: MCPToolResponse = {
				content: [
					{
						type: "text",
						text: JSON.stringify({ status: "200" }),
					},
				],
			};

			const result = await checkJsonPath(response, "$.status", 200);

			expect(result.passed).toBe(false);
			expect(result.message).toContain("type mismatch: string vs number");
			expect(result.expected).toBe(200);
			expect(result.actual).toBe("200");
		});

		it("should indicate type mismatch when comparing boolean to string", async () => {
			const response: MCPToolResponse = {
				content: [
					{
						type: "text",
						text: JSON.stringify({ active: true }),
					},
				],
			};

			const result = await checkJsonPath(response, "$.active", "true");

			expect(result.passed).toBe(false);
			expect(result.message).toContain("type mismatch: boolean vs string");
			expect(result.expected).toBe("true");
			expect(result.actual).toBe(true);
		});

		it("should not show type mismatch hint for same type comparisons", async () => {
			const response: MCPToolResponse = {
				content: [
					{
						type: "text",
						text: JSON.stringify({ name: "Alice" }),
					},
				],
			};

			const result = await checkJsonPath(response, "$.name", "Bob");

			expect(result.passed).toBe(false);
			expect(result.message).not.toContain("type mismatch");
			expect(result.message).toContain("does not match expected");
			expect(result.expected).toBe("Bob");
			expect(result.actual).toBe("Alice");
		});
	});
});
