/**
 * Unit Tests for Error Assertion
 */

import { describe, it, expect } from "vitest";
import { checkError } from "@/harness/assertions/index";
import type { MCPToolResponse } from "@/harness/types/client";

describe("checkError", () => {
	it("should pass when response is an error", () => {
		const response: MCPToolResponse = {
			content: [{ type: "text", text: "Error: Something went wrong" }],
			isError: true,
		};

		const result = checkError(response);

		expect(result.type).toBe("error");
		expect(result.passed).toBe(true);
		expect(result.message).toContain("failed as expected");
	});

	it("should fail when response is successful", () => {
		const response: MCPToolResponse = {
			content: [{ type: "text", text: "Success!" }],
			isError: false,
		};

		const result = checkError(response);

		expect(result.type).toBe("error");
		expect(result.passed).toBe(false);
		expect(result.message).toContain("Expected tool call to fail");
		expect(result.expected).toBe("error");
		expect(result.actual).toBe("success");
	});

	it("should pass when error message contains expected text", () => {
		const response: MCPToolResponse = {
			content: [{ type: "text", text: "Validation error: Invalid input" }],
			isError: true,
		};

		const result = checkError(response, "validation");

		expect(result.passed).toBe(true);
		expect(result.message).toContain("validation");
	});

	it("should fail when error message does not contain expected text", () => {
		const response: MCPToolResponse = {
			content: [{ type: "text", text: "Network error" }],
			isError: true,
		};

		const result = checkError(response, "validation");

		expect(result.passed).toBe(false);
		expect(result.message).toContain("does not contain expected text");
		expect(result.expected).toContain("validation");
	});

	it("should match messageContains case-insensitively", () => {
		const response: MCPToolResponse = {
			content: [{ type: "text", text: "VALIDATION ERROR" }],
			isError: true,
		};

		const result = checkError(response, "validation");

		expect(result.passed).toBe(true);
	});

	it("should handle partial messageContains matching", () => {
		const response: MCPToolResponse = {
			content: [{ type: "text", text: "Error: The validation process failed" }],
			isError: true,
		};

		const result = checkError(response, "validation");

		expect(result.passed).toBe(true);
	});
});
