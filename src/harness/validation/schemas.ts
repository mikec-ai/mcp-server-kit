/**
 * Zod Validation Schemas
 *
 * Validates test specifications loaded from YAML/JSON files.
 *
 * Design: Fully portable, uses Zod for runtime validation
 */

import { z } from "zod";

/**
 * Assertion schemas
 */
const SuccessAssertionSchema = z.object({
	type: z.literal("success"),
});

const ErrorAssertionSchema = z.object({
	type: z.literal("error"),
	messageContains: z.string().optional(),
});

const ContainsTextAssertionSchema = z.object({
	type: z.literal("contains_text"),
	text: z.string(),
	caseInsensitive: z.boolean().optional(),
});

const NotContainsTextAssertionSchema = z.object({
	type: z.literal("not_contains_text"),
	text: z.string(),
	caseInsensitive: z.boolean().optional(),
});

const ResponseTimeAssertionSchema = z.object({
	type: z.literal("response_time_ms"),
	max: z.number().positive(),
});

const JsonPathAssertionSchema = z.object({
	type: z.literal("json_path"),
	path: z.string(),
	expected: z.any(),
});

const RegexMatchAssertionSchema = z.object({
	type: z.literal("regex_match"),
	pattern: z.string(),
	flags: z.string().optional(),
});

const SnapshotAssertionSchema = z.object({
	type: z.literal("snapshot"),
	file: z.string(),
	ignoreFields: z.array(z.string()).optional(),
});

const JsonSchemaAssertionSchema = z.object({
	type: z.literal("json_schema"),
	schema: z.string(),
});

/**
 * Union of all assertion types
 */
export const AssertionSchema = z.discriminatedUnion("type", [
	SuccessAssertionSchema,
	ErrorAssertionSchema,
	ContainsTextAssertionSchema,
	NotContainsTextAssertionSchema,
	ResponseTimeAssertionSchema,
	JsonPathAssertionSchema,
	RegexMatchAssertionSchema,
	SnapshotAssertionSchema,
	JsonSchemaAssertionSchema,
]);

/**
 * Base test specification schema (shared fields)
 */
const BaseTestSpecSchema = z.object({
	name: z.string().min(1, "Test name is required"),
	description: z.string().optional(),
	assertions: z.array(AssertionSchema).min(1, "At least one assertion required"),
	timeout: z.number().positive().optional(),
	skip: z.boolean().optional(),
	only: z.boolean().optional(),
});

/**
 * Tool test specification schema
 */
const ToolTestSpecSchema = BaseTestSpecSchema.extend({
	type: z.literal("tool"),
	tool: z.string().min(1, "Tool name is required"),
	arguments: z.record(z.any()),
});

/**
 * Prompt test specification schema
 */
const PromptTestSpecSchema = BaseTestSpecSchema.extend({
	type: z.literal("prompt"),
	prompt: z.string().min(1, "Prompt name is required"),
	arguments: z.record(z.any()).optional(),
});

/**
 * Resource test specification schema
 */
const ResourceTestSpecSchema = BaseTestSpecSchema.extend({
	type: z.literal("resource"),
	uri: z.string().min(1, "Resource URI is required"),
});

/**
 * Test specification schema (discriminated union)
 */
const TestSpecUnionSchema = z.discriminatedUnion("type", [
	ToolTestSpecSchema,
	PromptTestSpecSchema,
	ResourceTestSpecSchema,
]);

/**
 * Test specification schema with backward compatibility
 *
 * Handles old test specs without a 'type' field by treating them as tool tests.
 */
export const TestSpecSchema = z.preprocess(
	(data) => {
		// If data has a 'type' field, use it as-is
		if (typeof data === "object" && data !== null && "type" in data) {
			return data;
		}

		// If data has a 'tool' field but no 'type', it's a legacy tool test
		if (typeof data === "object" && data !== null && "tool" in data) {
			return { ...data, type: "tool" };
		}

		// Otherwise, pass through and let validation fail with helpful message
		return data;
	},
	TestSpecUnionSchema,
);

/**
 * Test suite specification schema
 */
export const TestSuiteSpecSchema = z.object({
	name: z.string().min(1, "Suite name is required"),
	description: z.string().optional(),
	tests: z.array(z.union([z.string(), TestSpecSchema])),
	setup: z
		.object({
			serverUrl: z.string().url().optional(),
		})
		.optional(),
});

/**
 * Validate a test spec object
 *
 * @param data - Raw data to validate
 * @returns Validated TestSpec
 * @throws ZodError if validation fails
 */
export function validateTestSpec(data: unknown) {
	return TestSpecSchema.parse(data);
}

/**
 * Validate a test suite spec object
 *
 * @param data - Raw data to validate
 * @returns Validated TestSuiteSpec
 * @throws ZodError if validation fails
 */
export function validateTestSuiteSpec(data: unknown) {
	return TestSuiteSpecSchema.parse(data);
}

/**
 * Safe validation that returns success/error
 */
export function safeValidateTestSpec(data: unknown) {
	return TestSpecSchema.safeParse(data);
}

export function safeValidateTestSuiteSpec(data: unknown) {
	return TestSuiteSpecSchema.safeParse(data);
}
