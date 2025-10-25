/**
 * Unit Tests for Regex Match Assertion
 */

import { describe, it, expect } from "vitest";
import { checkRegexMatch } from "@/harness/assertions/index";
import type { MCPToolResponse } from "@/harness/types/client";

describe("checkRegexMatch", () => {
	it("should pass when pattern matches", () => {
		const response: MCPToolResponse = {
			content: [{ type: "text", text: "Order #12345" }],
			isError: false,
		};

		const result = checkRegexMatch(response, "#\\d+");

		expect(result.type).toBe("regex_match");
		expect(result.passed).toBe(true);
		expect(result.message).toContain("matches pattern");
	});

	it("should fail when pattern does not match", () => {
		const response: MCPToolResponse = {
			content: [{ type: "text", text: "Hello World" }],
			isError: false,
		};

		const result = checkRegexMatch(response, "\\d+");

		expect(result.passed).toBe(false);
		expect(result.message).toContain("does not match");
		expect(result.expected).toContain("\\d+");
	});

	it("should handle case-insensitive flag", () => {
		const response: MCPToolResponse = {
			content: [{ type: "text", text: "HELLO world" }],
			isError: false,
		};

		const result = checkRegexMatch(response, "hello", "i");

		expect(result.passed).toBe(true);
	});

	it("should be case-sensitive by default", () => {
		const response: MCPToolResponse = {
			content: [{ type: "text", text: "HELLO world" }],
			isError: false,
		};

		const result = checkRegexMatch(response, "hello");

		expect(result.passed).toBe(false);
	});

	it("should handle multiline flag", () => {
		const response: MCPToolResponse = {
			content: [{ type: "text", text: "Line 1\nLine 2\nLine 3" }],
			isError: false,
		};

		const result = checkRegexMatch(response, "^Line 2$", "m");

		expect(result.passed).toBe(true);
	});

	it("should handle global flag", () => {
		const response: MCPToolResponse = {
			content: [{ type: "text", text: "cat cat cat" }],
			isError: false,
		};

		const result = checkRegexMatch(response, "cat", "g");

		expect(result.passed).toBe(true);
	});

	it("should handle special regex characters", () => {
		const response: MCPToolResponse = {
			content: [{ type: "text", text: "Price: $19.99" }],
			isError: false,
		};

		const result = checkRegexMatch(response, "\\$\\d+\\.\\d+");

		expect(result.passed).toBe(true);
	});

	it("should handle word boundaries", () => {
		const response: MCPToolResponse = {
			content: [{ type: "text", text: "The cat is happy" }],
			isError: false,
		};

		const result = checkRegexMatch(response, "\\bcat\\b");

		expect(result.passed).toBe(true);
	});

	it("should handle optional groups", () => {
		const response: MCPToolResponse = {
			content: [{ type: "text", text: "Color is red" }],
			isError: false,
		};

		const result = checkRegexMatch(response, "Colou?r");

		expect(result.passed).toBe(true);
	});

	it("should handle alternation", () => {
		const response: MCPToolResponse = {
			content: [{ type: "text", text: "The cat is sleeping" }],
			isError: false,
		};

		const result = checkRegexMatch(response, "cat|dog");

		expect(result.passed).toBe(true);
	});

	it("should fail with invalid regex pattern", () => {
		const response: MCPToolResponse = {
			content: [{ type: "text", text: "Hello" }],
			isError: false,
		};

		const result = checkRegexMatch(response, "[invalid(");

		expect(result.passed).toBe(false);
		expect(result.message).toContain("Invalid");
	});

	it("should handle empty pattern", () => {
		const response: MCPToolResponse = {
			content: [{ type: "text", text: "Hello" }],
			isError: false,
		};

		const result = checkRegexMatch(response, "");

		expect(result.passed).toBe(true); // Empty regex matches everything
	});

	it("should handle multiple flags", () => {
		const response: MCPToolResponse = {
			content: [{ type: "text", text: "HELLO\nWORLD" }],
			isError: false,
		};

		const result = checkRegexMatch(response, "^hello$", "im");

		expect(result.passed).toBe(true);
	});
});
