/**
 * Unit Tests for Success Assertion
 */

import { describe, it, expect } from "vitest";
import { checkSuccess } from "@/harness/assertions/index";
import type { MCPToolResponse } from "@/harness/types/client";

describe("checkSuccess", () => {
	it("should pass when response is successful", () => {
		const response: MCPToolResponse = {
			content: [{ type: "text", text: "Success!" }],
			isError: false,
		};

		const result = checkSuccess(response);

		expect(result.type).toBe("success");
		expect(result.passed).toBe(true);
		expect(result.message).toContain("succeeded");
	});

	it("should fail when response is an error", () => {
		const response: MCPToolResponse = {
			content: [{ type: "text", text: "Error occurred" }],
			isError: true,
		};

		const result = checkSuccess(response);

		expect(result.type).toBe("success");
		expect(result.passed).toBe(false);
		expect(result.message).toContain("error");
		expect(result.expected).toBe("success");
		expect(result.actual).toBe("error");
	});

	it("should pass when response has empty content but isError is false", () => {
		const response: MCPToolResponse = {
			content: [],
			isError: false,
		};

		const result = checkSuccess(response);

		expect(result.passed).toBe(true);
	});
});
