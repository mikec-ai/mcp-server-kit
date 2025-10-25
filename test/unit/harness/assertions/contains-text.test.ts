/**
 * Unit Tests for Contains Text Assertions
 */

import { describe, it, expect } from "vitest";
import {
	checkContainsText,
	checkNotContainsText,
} from "../../../src/harness/assertions/contains-text.ts";
import type { MCPToolResponse } from "../../../src/harness/types/client.ts";

describe("checkContainsText", () => {
	it("should pass when text is found", () => {
		const response: MCPToolResponse = {
			content: [{ type: "text", text: "Hello World" }],
			isError: false,
		};

		const result = checkContainsText(response, "Hello");

		expect(result.type).toBe("contains_text");
		expect(result.passed).toBe(true);
		expect(result.message).toContain("contains expected text");
	});

	it("should fail when text is not found", () => {
		const response: MCPToolResponse = {
			content: [{ type: "text", text: "Hello World" }],
			isError: false,
		};

		const result = checkContainsText(response, "Goodbye");

		expect(result.passed).toBe(false);
		expect(result.message).toContain("does not contain");
		expect(result.expected).toContain("Goodbye");
		expect(result.actual).toContain("Hello");
	});

	it("should be case sensitive by default", () => {
		const response: MCPToolResponse = {
			content: [{ type: "text", text: "Hello World" }],
			isError: false,
		};

		const result = checkContainsText(response, "hello");

		expect(result.passed).toBe(false);
	});

	it("should ignore case when caseInsensitive is true", () => {
		const response: MCPToolResponse = {
			content: [{ type: "text", text: "Hello World" }],
			isError: false,
		};

		const result = checkContainsText(response, "hello", true);

		expect(result.passed).toBe(true);
	});

	it("should handle special characters", () => {
		const response: MCPToolResponse = {
			content: [{ type: "text", text: "Price: $19.99" }],
			isError: false,
		};

		const result = checkContainsText(response, "$19.99");

		expect(result.passed).toBe(true);
	});

	it("should handle empty string search", () => {
		const response: MCPToolResponse = {
			content: [{ type: "text", text: "Hello World" }],
			isError: false,
		};

		const result = checkContainsText(response, "");

		expect(result.passed).toBe(true); // Empty string is always contained
	});

	it("should handle emoji", () => {
		const response: MCPToolResponse = {
			content: [{ type: "text", text: "Status: ✅ Success!" }],
			isError: false,
		};

		const result = checkContainsText(response, "✅");

		expect(result.passed).toBe(true);
	});

	it("should handle multiline text", () => {
		const response: MCPToolResponse = {
			content: [{ type: "text", text: "Line 1\nLine 2\nLine 3" }],
			isError: false,
		};

		const result = checkContainsText(response, "Line 2");

		expect(result.passed).toBe(true);
	});
});

describe("checkNotContainsText", () => {
	it("should pass when text is not found", () => {
		const response: MCPToolResponse = {
			content: [{ type: "text", text: "Hello World" }],
			isError: false,
		};

		const result = checkNotContainsText(response, "Goodbye");

		expect(result.type).toBe("not_contains_text");
		expect(result.passed).toBe(true);
		expect(result.message).toContain("does not contain unwanted text");
	});

	it("should fail when text is found", () => {
		const response: MCPToolResponse = {
			content: [{ type: "text", text: "Hello World" }],
			isError: false,
		};

		const result = checkNotContainsText(response, "Hello");

		expect(result.passed).toBe(false);
		expect(result.message).toContain("should not contain");
		expect(result.expected).toContain("not containing");
	});

	it("should be case sensitive by default", () => {
		const response: MCPToolResponse = {
			content: [{ type: "text", text: "Hello World" }],
			isError: false,
		};

		const result = checkNotContainsText(response, "hello");

		expect(result.passed).toBe(true); // "hello" not found (case sensitive)
	});

	it("should ignore case when caseInsensitive is true", () => {
		const response: MCPToolResponse = {
			content: [{ type: "text", text: "Hello World" }],
			isError: false,
		};

		const result = checkNotContainsText(response, "hello", true);

		expect(result.passed).toBe(false); // "hello" found (case insensitive)
	});

	it("should handle empty string search", () => {
		const response: MCPToolResponse = {
			content: [{ type: "text", text: "Hello World" }],
			isError: false,
		};

		const result = checkNotContainsText(response, "");

		expect(result.passed).toBe(false); // Empty string is always contained
	});
});
