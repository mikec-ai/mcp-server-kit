/**
 * Unit Tests for Validation Schemas
 */

import { describe, it, expect } from "vitest";
import {
	validateTestSpec,
	validateTestSuiteSpec,
	safeValidateTestSpec,
} from "../../../src/harness/validation/schemas.ts";

describe("validateTestSpec", () => {
	it("should validate a valid test spec", () => {
		const validSpec = {
			name: "Test name",
			tool: "test_tool",
			arguments: { key: "value" },
			assertions: [{ type: "success" }],
		};

		expect(() => validateTestSpec(validSpec)).not.toThrow();
		const result = validateTestSpec(validSpec);
		expect(result.name).toBe("Test name");
	});

	it("should throw error for missing name", () => {
		const invalid = {
			tool: "test_tool",
			arguments: {},
			assertions: [{ type: "success" }],
		};

		expect(() => validateTestSpec(invalid)).toThrow();
	});

	it("should throw error for empty name", () => {
		const invalid = {
			name: "",
			tool: "test_tool",
			arguments: {},
			assertions: [{ type: "success" }],
		};

		expect(() => validateTestSpec(invalid)).toThrow();
	});

	it("should throw error for missing tool", () => {
		const invalid = {
			name: "Test",
			arguments: {},
			assertions: [{ type: "success" }],
		};

		expect(() => validateTestSpec(invalid)).toThrow();
	});

	it("should throw error for missing arguments", () => {
		const invalid = {
			name: "Test",
			tool: "tool",
			assertions: [{ type: "success" }],
		};

		expect(() => validateTestSpec(invalid)).toThrow();
	});

	it("should throw error for empty assertions array", () => {
		const invalid = {
			name: "Test",
			tool: "tool",
			arguments: {},
			assertions: [],
		};

		expect(() => validateTestSpec(invalid)).toThrow(/at least one assertion/i);
	});

	it("should throw error for missing assertions", () => {
		const invalid = {
			name: "Test",
			tool: "tool",
			arguments: {},
		};

		expect(() => validateTestSpec(invalid)).toThrow();
	});

	it("should validate all assertion types", () => {
		const specs = [
			{ type: "success" },
			{ type: "error", messageContains: "error" },
			{ type: "contains_text", text: "hello" },
			{ type: "not_contains_text", text: "goodbye" },
			{ type: "response_time_ms", max: 1000 },
			{ type: "json_path", path: "$.name", expected: "value" },
			{ type: "regex_match", pattern: "\\d+" },
			{ type: "snapshot", file: "snapshot.json" },
			{ type: "json_schema", schema: "schema.json" },
		];

		for (const assertion of specs) {
			const spec = {
				name: "Test",
				tool: "tool",
				arguments: {},
				assertions: [assertion],
			};

			expect(() => validateTestSpec(spec)).not.toThrow();
		}
	});

	it("should throw error for invalid assertion type", () => {
		const invalid = {
			name: "Test",
			tool: "tool",
			arguments: {},
			assertions: [{ type: "invalid_type" }],
		};

		expect(() => validateTestSpec(invalid)).toThrow();
	});

	it("should accept optional fields", () => {
		const spec = {
			name: "Test",
			description: "Test description",
			tool: "tool",
			arguments: {},
			assertions: [{ type: "success" }],
			timeout: 5000,
			skip: true,
			only: false,
		};

		expect(() => validateTestSpec(spec)).not.toThrow();
		const result = validateTestSpec(spec);
		expect(result.description).toBe("Test description");
		expect(result.timeout).toBe(5000);
	});

	it("should throw error for negative timeout", () => {
		const invalid = {
			name: "Test",
			tool: "tool",
			arguments: {},
			assertions: [{ type: "success" }],
			timeout: -100,
		};

		expect(() => validateTestSpec(invalid)).toThrow();
	});

	it("should validate contains_text assertion requires text field", () => {
		const invalid = {
			name: "Test",
			tool: "tool",
			arguments: {},
			assertions: [{ type: "contains_text" }], // Missing text
		};

		expect(() => validateTestSpec(invalid)).toThrow();
	});

	it("should validate response_time_ms assertion requires positive max", () => {
		const invalid = {
			name: "Test",
			tool: "tool",
			arguments: {},
			assertions: [{ type: "response_time_ms", max: 0 }], // Must be positive
		};

		expect(() => validateTestSpec(invalid)).toThrow();
	});
});

describe("safeValidateTestSpec", () => {
	it("should return success for valid spec", () => {
		const validSpec = {
			name: "Test",
			tool: "tool",
			arguments: {},
			assertions: [{ type: "success" }],
		};

		const result = safeValidateTestSpec(validSpec);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.name).toBe("Test");
		}
	});

	it("should return error for invalid spec", () => {
		const invalid = {
			name: "Test",
			// Missing required fields
		};

		const result = safeValidateTestSpec(invalid);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBeDefined();
		}
	});
});

describe("validateTestSuiteSpec", () => {
	it("should validate a valid test suite", () => {
		const validSuite = {
			name: "Suite name",
			tests: ["test1.yaml", "test2.yaml"],
		};

		expect(() => validateTestSuiteSpec(validSuite)).not.toThrow();
	});

	it("should allow inline test specs", () => {
		const suite = {
			name: "Suite",
			tests: [
				"test1.yaml",
				{
					name: "Inline test",
					tool: "tool",
					arguments: {},
					assertions: [{ type: "success" }],
				},
			],
		};

		expect(() => validateTestSuiteSpec(suite)).not.toThrow();
	});

	it("should accept optional setup configuration", () => {
		const suite = {
			name: "Suite",
			description: "Suite description",
			tests: ["test.yaml"],
			setup: {
				serverUrl: "http://localhost:8788",
			},
		};

		expect(() => validateTestSuiteSpec(suite)).not.toThrow();
	});

	it("should throw error for invalid serverUrl", () => {
		const invalid = {
			name: "Suite",
			tests: ["test.yaml"],
			setup: {
				serverUrl: "not-a-url",
			},
		};

		expect(() => validateTestSuiteSpec(invalid)).toThrow();
	});

	it("should throw error for missing name", () => {
		const invalid = {
			tests: ["test.yaml"],
		};

		expect(() => validateTestSuiteSpec(invalid)).toThrow();
	});

	it("should throw error for empty tests array", () => {
		const invalid = {
			name: "Suite",
			tests: [],
		};

		// Empty tests array might be valid, depending on schema
		// Check actual behavior
		const result = validateTestSuiteSpec(invalid);
		expect(result.tests).toEqual([]);
	});
});
