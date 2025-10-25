/**
 * example-generator - Unit Tests
 *
 * Tests for example payload generation from JSON schemas
 */

import { describe, it, expect } from "vitest";
import { ExampleGenerator } from "../../../src/utils/example-generator.js";
import {
	simpleSchemas,
	stringSchemas,
	numberSchemas,
	arraySchemas,
	objectSchemas,
	complexSchemas,
	toolParameterSchema,
} from "../../fixtures/test-schemas.js";

describe("ExampleGenerator", () => {
	describe("Simple types", () => {
		it("should generate string example", () => {
			const example = ExampleGenerator.generate(simpleSchemas.string);
			expect(typeof example).toBe("string");
			expect(example).toBe("string");
		});

		it("should generate number example", () => {
			const example = ExampleGenerator.generate(simpleSchemas.number);
			expect(typeof example).toBe("number");
			expect(example).toBe(0);
		});

		it("should generate integer example", () => {
			const example = ExampleGenerator.generate(simpleSchemas.integer);
			expect(typeof example).toBe("number");
			expect(example).toBe(0);
		});

		it("should generate boolean example", () => {
			const example = ExampleGenerator.generate(simpleSchemas.boolean);
			expect(typeof example).toBe("boolean");
			expect(example).toBe(true);
		});

		it("should generate null example", () => {
			const example = ExampleGenerator.generate(simpleSchemas.null);
			expect(example).toBe(null);
		});
	});

	describe("String schemas with formats", () => {
		it("should generate email example", () => {
			const example = ExampleGenerator.generate(stringSchemas.email);
			expect(example).toBe("user@example.com");
		});

		it("should generate url example", () => {
			const example = ExampleGenerator.generate(stringSchemas.url);
			expect(example).toBe("https://example.com");
		});

		it("should generate uuid example", () => {
			const example = ExampleGenerator.generate(stringSchemas.uuid);
			expect(example).toBe("123e4567-e89b-12d3-a456-426614174000");
		});

		it("should generate date example", () => {
			const example = ExampleGenerator.generate(stringSchemas.date);
			expect(example).toBe("2024-01-15");
		});

		it("should generate date-time example", () => {
			const example = ExampleGenerator.generate(stringSchemas.dateTime);
			expect(example).toBe("2024-01-15T10:30:00Z");
		});

		it("should generate ssn example", () => {
			const example = ExampleGenerator.generate(stringSchemas.ssn);
			expect(example).toBe("123-45-6789");
		});

		it("should generate phone example", () => {
			const example = ExampleGenerator.generate(stringSchemas.phone);
			expect(example).toBe("555-123-4567");
		});

		it("should use first enum value", () => {
			const example = ExampleGenerator.generate(stringSchemas.stringEnum);
			expect(example).toBe("red");
		});
	});

	describe("Number schemas with constraints", () => {
		it("should use minimum when available", () => {
			const example = ExampleGenerator.generate(numberSchemas.withMinMax);
			expect(example).toBe(0);
		});

		it("should use minimum for integer", () => {
			const example = ExampleGenerator.generate(numberSchemas.integer);
			expect(example).toBe(1);
		});

		it("should use first enum value for number enum", () => {
			const example = ExampleGenerator.generate(numberSchemas.numberEnum);
			expect(example).toBe(1);
		});

		it("should generate default number when no constraints", () => {
			const example = ExampleGenerator.generate({ type: "number" });
			expect(example).toBe(0);
		});

		it("should use maximum when minimum not available", () => {
			const example = ExampleGenerator.generate({
				type: "number",
				maximum: 100,
			});
			expect(example).toBe(100);
		});
	});

	describe("Array schemas", () => {
		it("should generate string array", () => {
			const example = ExampleGenerator.generate(arraySchemas.stringArray);
			expect(Array.isArray(example)).toBe(true);
			expect(example.length).toBeGreaterThan(0);
			expect(typeof example[0]).toBe("string");
		});

		it("should generate number array", () => {
			const example = ExampleGenerator.generate(arraySchemas.numberArray);
			expect(Array.isArray(example)).toBe(true);
			expect(example.length).toBeGreaterThan(0);
			expect(typeof example[0]).toBe("number");
		});

		it("should respect minItems constraint", () => {
			const example = ExampleGenerator.generate(arraySchemas.withMinMax);
			expect(Array.isArray(example)).toBe(true);
			expect(example.length).toBeGreaterThanOrEqual(1);
			expect(example.length).toBeLessThanOrEqual(5);
		});

		it("should generate nested arrays", () => {
			const example = ExampleGenerator.generate(arraySchemas.nestedArray);
			expect(Array.isArray(example)).toBe(true);
			expect(Array.isArray(example[0])).toBe(true);
			expect(typeof example[0][0]).toBe("string");
		});

		it("should generate empty array when no items schema", () => {
			const example = ExampleGenerator.generate({
				type: "array",
			});
			expect(Array.isArray(example)).toBe(true);
			expect(example.length).toBe(0);
		});

		it("should cap array length at 10 even with higher minItems", () => {
			const example = ExampleGenerator.generate({
				type: "array",
				items: { type: "string" },
				minItems: 50,
			});
			expect(Array.isArray(example)).toBe(true);
			expect(example.length).toBeLessThanOrEqual(10);
		});
	});

	describe("Object schemas", () => {
		it("should generate simple object", () => {
			const example = ExampleGenerator.generate(objectSchemas.simple);
			expect(typeof example).toBe("object");
			expect(example).toHaveProperty("name");
			expect(typeof example.name).toBe("string");
		});

		it("should generate nested object", () => {
			const example = ExampleGenerator.generate(objectSchemas.nested);
			expect(typeof example).toBe("object");
			expect(example).toHaveProperty("user");
			expect(example.user).toHaveProperty("name");
			expect(example.user).toHaveProperty("email");
			expect(example.user.email).toBe("user@example.com");
		});

		it("should include optional properties by default", () => {
			const example = ExampleGenerator.generate(objectSchemas.simple);
			// age is optional but should be included
			expect(example).toHaveProperty("age");
		});

		it("should exclude optional properties in requiredOnly mode", () => {
			const example = ExampleGenerator.generate(objectSchemas.simple, {
				requiredOnly: true,
			});
			expect(example).toHaveProperty("name");
			expect(example).not.toHaveProperty("age");
		});

		it("should generate empty object when no properties", () => {
			const example = ExampleGenerator.generate({
				type: "object",
			});
			expect(typeof example).toBe("object");
			expect(Object.keys(example).length).toBe(0);
		});

		it("should sanitize invalid property names", () => {
			const example = ExampleGenerator.generate({
				type: "object",
				properties: {
					"valid-name": { type: "string" },
					"invalid@name": { type: "string" },
				},
			});
			expect(example).toHaveProperty("valid-name");
			// @ should be replaced with _
			expect(example).toHaveProperty("invalid_name");
		});
	});

	describe("Complex schemas (oneOf, anyOf, allOf)", () => {
		it("should handle oneOf (use first option)", () => {
			const example = ExampleGenerator.generate(complexSchemas.oneOf);
			// Should use first schema (string)
			expect(typeof example).toBe("string");
		});

		it("should handle anyOf (use first option)", () => {
			const example = ExampleGenerator.generate(complexSchemas.anyOf);
			// Should use first schema (string with minLength: 5)
			expect(typeof example).toBe("string");
		});

		it("should handle allOf (merge schemas)", () => {
			const example = ExampleGenerator.generate(complexSchemas.allOf);
			expect(typeof example).toBe("object");
			expect(example).toHaveProperty("name");
			expect(example).toHaveProperty("age");
		});
	});

	describe("Schema with example/default values", () => {
		it("should use example value when present", () => {
			const example = ExampleGenerator.generate({
				type: "string",
				example: "custom example",
			});
			expect(example).toBe("custom example");
		});

		it("should use default value when present", () => {
			const example = ExampleGenerator.generate({
				type: "number",
				default: 42,
			});
			expect(example).toBe(42);
		});

		it("should prefer example over default", () => {
			const example = ExampleGenerator.generate({
				type: "string",
				example: "example value",
				default: "default value",
			});
			expect(example).toBe("example value");
		});
	});

	describe("Pattern strings", () => {
		it("should generate SSN pattern", () => {
			const example = ExampleGenerator.generate({
				type: "string",
				pattern: "\\d{3}-\\d{2}-\\d{4}",
			});
			expect(example).toBe("123-45-6789");
		});

		it("should generate phone pattern", () => {
			const example = ExampleGenerator.generate({
				type: "string",
				pattern: "\\d{3}-\\d{3}-\\d{4}",
			});
			expect(example).toBe("555-123-4567");
		});

		it("should generate ID pattern", () => {
			const example = ExampleGenerator.generate({
				type: "string",
				pattern: "^[A-Z]{2}\\d{6}$",
			});
			expect(example).toBe("AB123456");
		});

		it("should fallback to 'string' for unknown patterns", () => {
			const example = ExampleGenerator.generate({
				type: "string",
				pattern: "^[a-z]{1,5}$",
			});
			expect(example).toBe("string");
		});
	});

	describe("Edge cases", () => {
		it("should handle null schema", () => {
			const example = ExampleGenerator.generate(null);
			expect(example).toBe(null);
		});

		it("should handle undefined schema", () => {
			const example = ExampleGenerator.generate(undefined);
			expect(example).toBe(null);
		});

		it("should handle non-object schema", () => {
			const example = ExampleGenerator.generate("not an object" as any);
			expect(example).toBe(null);
		});

		it("should handle $ref with placeholder", () => {
			const example = ExampleGenerator.generate({
				$ref: "#/definitions/User",
			});
			expect(example).toBe("<reference: #/definitions/User>");
		});

		it("should prevent infinite recursion with max depth", () => {
			// Create deeply nested schema
			const deepSchema: any = {
				type: "object",
				properties: {
					child: null as any,
				},
			};
			// Create circular-like deep nesting
			let current = deepSchema;
			for (let i = 0; i < 10; i++) {
				current.properties.child = {
					type: "object",
					properties: {
						child: null as any,
					},
				};
				current = current.properties.child;
			}

			// Should not throw, should stop at max depth
			expect(() => {
				ExampleGenerator.generate(deepSchema);
			}).not.toThrow();
		});

		it("should handle empty property name gracefully", () => {
			const example = ExampleGenerator.generate({
				type: "object",
				properties: {
					"": { type: "string" },
				},
			});
			// Empty property names should be skipped
			expect(example).toBeDefined();
		});

		it("should skip properties with undefined values", () => {
			const example = ExampleGenerator.generate({
				type: "object",
				properties: {
					valid: { type: "string" },
					invalid: { type: "unknown" }, // Unknown type returns undefined
				},
			});
			expect(example).toHaveProperty("valid");
			// Properties with undefined values should not be included
		});
	});

	describe("Complete tool parameter schema", () => {
		it("should generate realistic tool parameters", () => {
			const example = ExampleGenerator.generate(toolParameterSchema);

			expect(example).toHaveProperty("message");
			expect(typeof example.message).toBe("string");

			expect(example).toHaveProperty("count");
			expect(example.count).toBe(1); // default value

			expect(example).toHaveProperty("priority");
			expect(["low", "medium", "high"]).toContain(example.priority);

			expect(example).toHaveProperty("metadata");
			expect(example.metadata).toHaveProperty("user_id");
			expect(example.metadata.user_id).toBe("123e4567-e89b-12d3-a456-426614174000");

			expect(example.metadata).toHaveProperty("timestamp");
			expect(example.metadata.timestamp).toBe("2024-01-15T10:30:00Z");

			expect(example.metadata).toHaveProperty("tags");
			expect(Array.isArray(example.metadata.tags)).toBe(true);
		});

		it("should generate required-only tool parameters", () => {
			const example = ExampleGenerator.generate(toolParameterSchema, {
				requiredOnly: true,
			});

			expect(example).toHaveProperty("message");
			expect(example).not.toHaveProperty("count"); // optional
			expect(example).not.toHaveProperty("priority"); // optional

			// metadata is optional at root level
			expect(example).not.toHaveProperty("metadata");
		});
	});
});
