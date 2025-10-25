/**
 * json-schema-to-zod - Unit Tests
 *
 * Tests for JSON Schema to Zod schema conversion utility
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";
import { jsonSchemaToZod, getZodErrorMessage } from "../../../src/utils/json-schema-to-zod.js";
import {
	simpleSchemas,
	stringSchemas,
	numberSchemas,
	arraySchemas,
	objectSchemas,
	complexSchemas,
	edgeCaseSchemas,
} from "../../fixtures/test-schemas.js";

describe("jsonSchemaToZod", () => {
	describe("Simple types", () => {
		it("should convert string schema", () => {
			const schema = jsonSchemaToZod(simpleSchemas.string);
			expect(schema).toBeInstanceOf(z.ZodString);

			// Test validation
			expect(schema.safeParse("hello").success).toBe(true);
			expect(schema.safeParse(123).success).toBe(false);
		});

		it("should convert number schema", () => {
			const schema = jsonSchemaToZod(simpleSchemas.number);
			expect(schema).toBeInstanceOf(z.ZodNumber);

			expect(schema.safeParse(123).success).toBe(true);
			expect(schema.safeParse(123.45).success).toBe(true);
			expect(schema.safeParse("123").success).toBe(false);
		});

		it("should convert integer schema", () => {
			const schema = jsonSchemaToZod(simpleSchemas.integer);
			expect(schema).toBeInstanceOf(z.ZodNumber);

			expect(schema.safeParse(123).success).toBe(true);
			expect(schema.safeParse(123.45).success).toBe(false); // Not an integer
		});

		it("should convert boolean schema", () => {
			const schema = jsonSchemaToZod(simpleSchemas.boolean);
			expect(schema).toBeInstanceOf(z.ZodBoolean);

			expect(schema.safeParse(true).success).toBe(true);
			expect(schema.safeParse(false).success).toBe(true);
			expect(schema.safeParse("true").success).toBe(false);
		});

		it("should convert null schema", () => {
			const schema = jsonSchemaToZod(simpleSchemas.null);
			expect(schema).toBeInstanceOf(z.ZodNull);

			expect(schema.safeParse(null).success).toBe(true);
			expect(schema.safeParse(undefined).success).toBe(false);
		});
	});

	describe("String schemas with constraints", () => {
		it("should handle minLength and maxLength", () => {
			const schema = jsonSchemaToZod(stringSchemas.withMinMax);

			expect(schema.safeParse("ab").success).toBe(false); // Too short
			expect(schema.safeParse("abc").success).toBe(true); // Min length
			expect(schema.safeParse("abcdefghij").success).toBe(true); // Max length
			expect(schema.safeParse("abcdefghijk").success).toBe(false); // Too long
		});

		it("should handle pattern validation", () => {
			const schema = jsonSchemaToZod(stringSchemas.withPattern);

			expect(schema.safeParse("AB1234").success).toBe(true);
			expect(schema.safeParse("XY5678").success).toBe(true);
			expect(schema.safeParse("ab1234").success).toBe(false); // Lowercase
			expect(schema.safeParse("ABC123").success).toBe(false); // Wrong format
		});

		it("should handle email format", () => {
			const schema = jsonSchemaToZod(stringSchemas.email);

			expect(schema.safeParse("user@example.com").success).toBe(true);
			expect(schema.safeParse("invalid-email").success).toBe(false);
		});

		it("should handle url format", () => {
			const schema = jsonSchemaToZod(stringSchemas.url);

			expect(schema.safeParse("https://example.com").success).toBe(true);
			expect(schema.safeParse("http://test.org/path").success).toBe(true);
			expect(schema.safeParse("not-a-url").success).toBe(false);
		});

		it("should handle uuid format", () => {
			const schema = jsonSchemaToZod(stringSchemas.uuid);

			expect(schema.safeParse("123e4567-e89b-12d3-a456-426614174000").success).toBe(true);
			expect(schema.safeParse("invalid-uuid").success).toBe(false);
		});

		it("should handle date format", () => {
			const schema = jsonSchemaToZod(stringSchemas.date);

			expect(schema.safeParse("2024-01-15").success).toBe(true);
			// Note: The regex pattern validation doesn't validate calendar dates,
			// it only checks the format (YYYY-MM-DD)
			expect(schema.safeParse("2024-13-45").success).toBe(true); // Matches pattern
			expect(schema.safeParse("not-a-date").success).toBe(false);
			expect(schema.safeParse("24-01-15").success).toBe(false); // Wrong format
		});

		it("should handle date-time format", () => {
			const schema = jsonSchemaToZod(stringSchemas.dateTime);

			expect(schema.safeParse("2024-01-15T10:30:00Z").success).toBe(true);
			expect(schema.safeParse("2024-01-15").success).toBe(true); // Also valid date string
			expect(schema.safeParse("invalid-datetime").success).toBe(false);
		});

		it("should handle ssn format", () => {
			const schema = jsonSchemaToZod(stringSchemas.ssn);

			expect(schema.safeParse("123-45-6789").success).toBe(true);
			expect(schema.safeParse("123456789").success).toBe(false); // Missing hyphens
		});

		it("should handle phone format", () => {
			const schema = jsonSchemaToZod(stringSchemas.phone);

			expect(schema.safeParse("555-123-4567").success).toBe(true);
			expect(schema.safeParse("5551234567").success).toBe(false); // Missing hyphens
		});

		it("should handle string enum", () => {
			const schema = jsonSchemaToZod(stringSchemas.stringEnum);

			expect(schema.safeParse("red").success).toBe(true);
			expect(schema.safeParse("green").success).toBe(true);
			expect(schema.safeParse("blue").success).toBe(true);
			expect(schema.safeParse("yellow").success).toBe(false);
		});
	});

	describe("Number schemas with constraints", () => {
		it("should handle minimum and maximum", () => {
			const schema = jsonSchemaToZod(numberSchemas.withMinMax);

			expect(schema.safeParse(-1).success).toBe(false); // Below minimum
			expect(schema.safeParse(0).success).toBe(true); // At minimum
			expect(schema.safeParse(50).success).toBe(true); // Within range
			expect(schema.safeParse(100).success).toBe(true); // At maximum
			expect(schema.safeParse(101).success).toBe(false); // Above maximum
		});

		it("should handle exclusive minimum and maximum", () => {
			const schema = jsonSchemaToZod(numberSchemas.withExclusiveMinMax);

			expect(schema.safeParse(0).success).toBe(false); // At exclusive minimum
			expect(schema.safeParse(0.1).success).toBe(true); // Above exclusive minimum
			expect(schema.safeParse(99.9).success).toBe(true); // Below exclusive maximum
			expect(schema.safeParse(100).success).toBe(false); // At exclusive maximum
		});

		it("should handle multipleOf", () => {
			const schema = jsonSchemaToZod(numberSchemas.withMultipleOf);

			expect(schema.safeParse(0).success).toBe(true);
			expect(schema.safeParse(5).success).toBe(true);
			expect(schema.safeParse(10).success).toBe(true);
			expect(schema.safeParse(3).success).toBe(false); // Not a multiple of 5
			expect(schema.safeParse(7).success).toBe(false);
		});

		it("should handle integer constraints", () => {
			const schema = jsonSchemaToZod(numberSchemas.integer);

			expect(schema.safeParse(5).success).toBe(true);
			expect(schema.safeParse(5.5).success).toBe(false); // Not an integer
			expect(schema.safeParse(0).success).toBe(false); // Below minimum
			expect(schema.safeParse(11).success).toBe(false); // Above maximum
		});
	});

	describe("Array schemas", () => {
		it("should handle string arrays", () => {
			const schema = jsonSchemaToZod(arraySchemas.stringArray);

			expect(schema.safeParse([]).success).toBe(true);
			expect(schema.safeParse(["a", "b", "c"]).success).toBe(true);
			expect(schema.safeParse([1, 2, 3]).success).toBe(false); // Wrong type
		});

		it("should handle number arrays", () => {
			const schema = jsonSchemaToZod(arraySchemas.numberArray);

			expect(schema.safeParse([1, 2, 3]).success).toBe(true);
			expect(schema.safeParse([1.5, 2.5]).success).toBe(true);
			expect(schema.safeParse(["a", "b"]).success).toBe(false); // Wrong type
		});

		it("should handle array length constraints", () => {
			const schema = jsonSchemaToZod(arraySchemas.withMinMax);

			expect(schema.safeParse([]).success).toBe(false); // Below minimum
			expect(schema.safeParse(["a"]).success).toBe(true); // At minimum
			expect(schema.safeParse(["a", "b", "c", "d", "e"]).success).toBe(true); // At maximum
			expect(schema.safeParse(["a", "b", "c", "d", "e", "f"]).success).toBe(false); // Above maximum
		});

		it("should handle nested arrays", () => {
			const schema = jsonSchemaToZod(arraySchemas.nestedArray);

			expect(schema.safeParse([["a", "b"], ["c"]]).success).toBe(true);
			expect(schema.safeParse([["a"], [1]]).success).toBe(false); // Wrong inner type
		});
	});

	describe("Object schemas", () => {
		it("should handle simple objects", () => {
			const schema = jsonSchemaToZod(objectSchemas.simple);

			expect(schema.safeParse({ name: "John" }).success).toBe(true);
			expect(schema.safeParse({ name: "John", age: 30 }).success).toBe(true);
			expect(schema.safeParse({ age: 30 }).success).toBe(false); // Missing required field
		});

		it("should handle nested objects", () => {
			const schema = jsonSchemaToZod(objectSchemas.nested);

			const valid = {
				user: {
					name: "John",
					email: "john@example.com",
				},
			};

			const invalid = {
				user: {
					name: "John",
					email: "invalid-email", // Invalid format
				},
			};

			expect(schema.safeParse(valid).success).toBe(true);
			expect(schema.safeParse(invalid).success).toBe(false);
		});

		it("should handle additionalProperties: true", () => {
			const schema = jsonSchemaToZod(objectSchemas.withAdditionalProperties);

			expect(schema.safeParse({ id: "123" }).success).toBe(true);
			expect(schema.safeParse({ id: "123", extra: "allowed" }).success).toBe(true);
		});

		it("should handle additionalProperties: false (strict)", () => {
			const schema = jsonSchemaToZod(objectSchemas.strictObject);

			expect(schema.safeParse({ id: "123" }).success).toBe(true);
			expect(schema.safeParse({ id: "123", extra: "not allowed" }).success).toBe(false);
		});

		it("should make optional fields optional", () => {
			const schema = jsonSchemaToZod(objectSchemas.simple);

			// age is optional (not in required array)
			expect(schema.safeParse({ name: "John" }).success).toBe(true);
			expect(schema.safeParse({ name: "John", age: 30 }).success).toBe(true);
		});
	});

	describe("Complex schemas (oneOf, anyOf, allOf)", () => {
		it("should handle oneOf", () => {
			const schema = jsonSchemaToZod(complexSchemas.oneOf);

			expect(schema.safeParse("hello").success).toBe(true);
			expect(schema.safeParse(123).success).toBe(true);
			expect(schema.safeParse(true).success).toBe(false); // Not in oneOf
		});

		it("should handle anyOf", () => {
			const schema = jsonSchemaToZod(complexSchemas.anyOf);

			expect(schema.safeParse("hello").success).toBe(true); // Matches first option
			expect(schema.safeParse("hi").success).toBe(false); // Too short for string option
			expect(schema.safeParse(15).success).toBe(true); // Matches second option
			expect(schema.safeParse(5).success).toBe(false); // Too small for number option
		});

		it("should handle allOf (merge schemas)", () => {
			const schema = jsonSchemaToZod(complexSchemas.allOf);

			expect(schema.safeParse({ name: "John", age: 30 }).success).toBe(true);
			expect(schema.safeParse({ name: "John" }).success).toBe(false); // Missing age
			expect(schema.safeParse({ age: 30 }).success).toBe(false); // Missing name
		});
	});

	describe("Edge cases", () => {
		it("should infer object type when properties exist but type is missing", () => {
			const schema = jsonSchemaToZod(edgeCaseSchemas.noType);

			expect(schema.safeParse({ name: "John" }).success).toBe(true);
			expect(schema.safeParse("not an object").success).toBe(false);
		});

		it("should handle empty object schema", () => {
			const schema = jsonSchemaToZod(edgeCaseSchemas.emptyObject);

			expect(schema.safeParse({}).success).toBe(true);
			expect(schema.safeParse({ any: "property" }).success).toBe(true);
		});

		it("should handle empty array schema", () => {
			const schema = jsonSchemaToZod(edgeCaseSchemas.emptyArray);

			expect(schema.safeParse([]).success).toBe(true);
			// Note: Without items definition, behavior may vary
		});

		it("should throw error for unresolved $ref", () => {
			expect(() => {
				jsonSchemaToZod(edgeCaseSchemas.withRef);
			}).toThrow("Unresolved $ref");
		});

		it("should return z.any() for schema with no type and no properties", () => {
			const schema = jsonSchemaToZod({});

			expect(schema.safeParse("anything").success).toBe(true);
			expect(schema.safeParse(123).success).toBe(true);
			expect(schema.safeParse({ any: "thing" }).success).toBe(true);
		});
	});
});

describe("getZodErrorMessage", () => {
	it("should format invalid_type errors", () => {
		const issue: z.ZodIssue = {
			code: "invalid_type",
			expected: "string",
			received: "number",
			path: ["name"],
			message: "Expected string, received number",
		};

		const message = getZodErrorMessage(issue, {});
		expect(message).toBe("Invalid type: expected string");
	});

	it("should format invalid_string (email) errors", () => {
		const issue: z.ZodIssue = {
			code: "invalid_string",
			validation: "email",
			path: ["email"],
			message: "Invalid email",
		};

		const message = getZodErrorMessage(issue, {});
		expect(message).toBe("Invalid email format");
	});

	it("should format invalid_string (url) errors", () => {
		const issue: z.ZodIssue = {
			code: "invalid_string",
			validation: "url",
			path: ["url"],
			message: "Invalid URL",
		};

		const message = getZodErrorMessage(issue, {});
		expect(message).toBe("Invalid URL format");
	});

	it("should format invalid_string (regex) errors", () => {
		const issue: z.ZodIssue = {
			code: "invalid_string",
			validation: "regex",
			path: ["code"],
			message: "Does not match pattern",
		};

		const message = getZodErrorMessage(issue, {});
		expect(message).toBe("Does not match pattern");
	});

	it("should format too_small (string) errors", () => {
		const issue: z.ZodIssue = {
			code: "too_small",
			minimum: 5,
			type: "string",
			inclusive: true,
			exact: false,
			path: ["name"],
			message: "String must contain at least 5 character(s)",
		};

		const message = getZodErrorMessage(issue, {});
		expect(message).toBe("Too short: minimum length is 5");
	});

	it("should format too_small (number) errors", () => {
		const issue: z.ZodIssue = {
			code: "too_small",
			minimum: 0,
			type: "number",
			inclusive: true,
			exact: false,
			path: ["age"],
			message: "Number must be greater than or equal to 0",
		};

		const message = getZodErrorMessage(issue, {});
		expect(message).toBe("Too small: minimum value is 0");
	});

	it("should format too_small (array) errors", () => {
		const issue: z.ZodIssue = {
			code: "too_small",
			minimum: 1,
			type: "array",
			inclusive: true,
			exact: false,
			path: ["items"],
			message: "Array must contain at least 1 element(s)",
		};

		const message = getZodErrorMessage(issue, {});
		expect(message).toBe("Too few items: minimum is 1");
	});

	it("should format too_big (string) errors", () => {
		const issue: z.ZodIssue = {
			code: "too_big",
			maximum: 100,
			type: "string",
			inclusive: true,
			exact: false,
			path: ["description"],
			message: "String must contain at most 100 character(s)",
		};

		const message = getZodErrorMessage(issue, {});
		expect(message).toBe("Too long: maximum length is 100");
	});

	it("should format too_big (number) errors", () => {
		const issue: z.ZodIssue = {
			code: "too_big",
			maximum: 100,
			type: "number",
			inclusive: true,
			exact: false,
			path: ["score"],
			message: "Number must be less than or equal to 100",
		};

		const message = getZodErrorMessage(issue, {});
		expect(message).toBe("Too large: maximum value is 100");
	});

	it("should format too_big (array) errors", () => {
		const issue: z.ZodIssue = {
			code: "too_big",
			maximum: 10,
			type: "array",
			inclusive: true,
			exact: false,
			path: ["tags"],
			message: "Array must contain at most 10 element(s)",
		};

		const message = getZodErrorMessage(issue, {});
		expect(message).toBe("Too many items: maximum is 10");
	});

	it("should format invalid_enum_value errors", () => {
		const issue: z.ZodIssue = {
			code: "invalid_enum_value",
			options: ["red", "green", "blue"],
			received: "yellow",
			path: ["color"],
			message: "Invalid enum value",
		};

		const message = getZodErrorMessage(issue, {});
		expect(message).toBe("Invalid value. Allowed values: red, green, blue");
	});

	it("should format custom errors", () => {
		const issue: z.ZodIssue = {
			code: "custom",
			path: ["field"],
			message: "Custom validation failed",
		};

		const message = getZodErrorMessage(issue, {});
		expect(message).toBe("Custom validation failed");
	});

	it("should use default message for unknown error codes", () => {
		const issue: z.ZodIssue = {
			code: "invalid_union" as any,
			path: ["field"],
			message: "Invalid union",
		};

		const message = getZodErrorMessage(issue, {});
		expect(message).toBe("Invalid union");
	});
});
