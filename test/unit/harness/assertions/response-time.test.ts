/**
 * Unit Tests for Response Time Assertion
 */

import { describe, it, expect } from "vitest";
import { checkResponseTime } from "../../../src/harness/assertions/response-time.ts";

describe("checkResponseTime", () => {
	it("should pass when duration is under max", () => {
		const result = checkResponseTime(100, 500);

		expect(result.type).toBe("response_time_ms");
		expect(result.passed).toBe(true);
		expect(result.message).toContain("100ms");
		expect(result.message).toContain("500ms");
	});

	it("should fail when duration exceeds max", () => {
		const result = checkResponseTime(600, 500);

		expect(result.passed).toBe(false);
		expect(result.message).toContain("exceeds");
		expect(result.expected).toContain("500ms");
		expect(result.actual).toContain("600ms");
	});

	it("should pass when duration equals max (boundary condition)", () => {
		const result = checkResponseTime(500, 500);

		expect(result.passed).toBe(true);
	});

	it("should handle very small durations", () => {
		const result = checkResponseTime(1, 5000);

		expect(result.passed).toBe(true);
	});

	it("should handle zero duration", () => {
		const result = checkResponseTime(0, 1000);

		expect(result.passed).toBe(true);
	});

	it("should handle very large durations", () => {
		const result = checkResponseTime(30000, 5000);

		expect(result.passed).toBe(false);
		expect(result.actual).toContain("30000ms");
	});

	it("should fail when duration is exactly 1ms over max", () => {
		const result = checkResponseTime(501, 500);

		expect(result.passed).toBe(false);
	});
});
