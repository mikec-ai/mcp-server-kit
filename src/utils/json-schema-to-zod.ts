/**
 * Convert JSON Schema to Zod schema for validation
 * Supports OpenAPI 3.0 JSON Schema subset
 */

import { z } from "zod";

/**
 * Custom format validators
 */
const formatValidators = {
	email: (val: string) => z.string().email().safeParse(val).success,
	uri: (val: string) => {
		try {
			new URL(val);
			return true;
		} catch {
			return false;
		}
	},
	url: (val: string) => formatValidators.uri(val),
	uuid: (val: string) =>
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val),
	date: (val: string) => /^\d{4}-\d{2}-\d{2}$/.test(val),
	"date-time": (val: string) => !isNaN(Date.parse(val)),
	time: (val: string) => /^\d{2}:\d{2}:\d{2}/.test(val),
	ipv4: (val: string) => /^(\d{1,3}\.){3}\d{1,3}$/.test(val),
	ipv6: (val: string) => /^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i.test(val),
	// Custom VA formats
	ssn: (val: string) => /^\d{3}-\d{2}-\d{4}$/.test(val),
	phone: (val: string) => /^\d{3}-\d{3}-\d{4}$/.test(val),
};

/**
 * Convert a JSON Schema to a Zod schema
 */
export function jsonSchemaToZod(schema: any): z.ZodTypeAny {
	// Handle $ref (should be dereferenced already in most cases)
	if (schema.$ref) {
		throw new Error(`Unresolved $ref: ${schema.$ref}. Schema should be dereferenced first.`);
	}

	// Handle oneOf, anyOf, allOf
	if (schema.oneOf) {
		const schemas = schema.oneOf.map((s: any) => jsonSchemaToZod(s));
		return z.union(schemas as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
	}

	if (schema.anyOf) {
		const schemas = schema.anyOf.map((s: any) => jsonSchemaToZod(s));
		return z.union(schemas as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
	}

	if (schema.allOf) {
		// For allOf, we merge the schemas
		// This is a simplified implementation - full allOf support is complex
		const merged = schema.allOf.reduce((acc: any, curr: any) => {
			return {
				...acc,
				...curr,
				properties: { ...(acc.properties || {}), ...(curr.properties || {}) },
				required: [...(acc.required || []), ...(curr.required || [])],
			};
		}, {});
		return jsonSchemaToZod(merged);
	}

	// Handle by type
	// If no explicit type but has object-like properties, infer it's an object
	// This handles malformed OpenAPI specs that omit "type": "object"
	let type = schema.type;
	if (!type && (schema.properties || schema.required)) {
		type = "object";
	}

	switch (type) {
		case "string":
			return createStringSchema(schema);

		case "number":
			return createNumberSchema(schema, false);

		case "integer":
			return createNumberSchema(schema, true);

		case "boolean":
			return z.boolean();

		case "null":
			return z.null();

		case "array":
			return createArraySchema(schema);

		case "object":
			return createObjectSchema(schema);

		default:
			// If no type specified, accept any
			return z.any();
	}
}

/**
 * Create Zod string schema with formats and constraints
 */
function createStringSchema(schema: any): z.ZodTypeAny {
	// Handle enum first - must return enum type, not string
	if (schema.enum) {
		return z.enum(schema.enum as [string, ...string[]]);
	}

	let zodSchema: z.ZodString | z.ZodEffects<z.ZodString> = z.string();

	// Handle length constraints first (these work on ZodString)
	if (schema.minLength !== undefined) {
		zodSchema = zodSchema.min(schema.minLength);
	}
	if (schema.maxLength !== undefined) {
		zodSchema = zodSchema.max(schema.maxLength);
	}

	// Handle pattern (must be before refine/format validators)
	if (schema.pattern) {
		const regex = new RegExp(schema.pattern);
		zodSchema = zodSchema.regex(regex, {
			message: `Does not match pattern: ${schema.pattern}`,
		});
	}

	// Handle format last (refine returns ZodEffects which doesn't support regex)
	if (schema.format) {
		const format = schema.format;
		const validator = formatValidators[format as keyof typeof formatValidators];

		if (validator) {
			zodSchema = zodSchema.refine(validator, {
				message: `Invalid ${format} format`,
			});
		} else if (format === "email") {
			zodSchema = (zodSchema as z.ZodString).email();
		} else if (format === "url" || format === "uri") {
			zodSchema = (zodSchema as z.ZodString).url();
		}
	}

	return zodSchema;
}

/**
 * Create Zod number schema with constraints
 */
function createNumberSchema(schema: any, isInteger: boolean): z.ZodTypeAny {
	let zodSchema = z.number();

	if (isInteger) {
		zodSchema = zodSchema.int();
	}

	// Handle enum
	if (schema.enum) {
		return z.enum(schema.enum.map(String) as [string, ...string[]]).transform(Number);
	}

	// Handle constraints
	if (schema.minimum !== undefined) {
		zodSchema = zodSchema.min(schema.minimum);
	}
	if (schema.maximum !== undefined) {
		zodSchema = zodSchema.max(schema.maximum);
	}
	if (schema.exclusiveMinimum !== undefined) {
		zodSchema = zodSchema.gt(schema.exclusiveMinimum);
	}
	if (schema.exclusiveMaximum !== undefined) {
		zodSchema = zodSchema.lt(schema.exclusiveMaximum);
	}
	if (schema.multipleOf !== undefined) {
		zodSchema = zodSchema.multipleOf(schema.multipleOf);
	}

	return zodSchema;
}

/**
 * Create Zod array schema
 */
function createArraySchema(schema: any): z.ZodArray<any> {
	const items = schema.items || {};
	const itemSchema = jsonSchemaToZod(items);

	let zodSchema = z.array(itemSchema);

	// Handle length constraints
	if (schema.minItems !== undefined) {
		zodSchema = zodSchema.min(schema.minItems);
	}
	if (schema.maxItems !== undefined) {
		zodSchema = zodSchema.max(schema.maxItems);
	}

	return zodSchema;
}

/**
 * Create Zod object schema
 */
function createObjectSchema(schema: any): z.ZodObject<any> {
	const properties = schema.properties || {};
	const required = schema.required || [];
	const additionalProperties = schema.additionalProperties;

	const shape: Record<string, z.ZodTypeAny> = {};

	for (const key in properties) {
		const propSchema = jsonSchemaToZod(properties[key]);

		// Make optional if not in required array
		if (required.includes(key)) {
			shape[key] = propSchema;
		} else {
			shape[key] = propSchema.optional();
		}
	}

	// Handle additionalProperties
	// If additionalProperties is false, use strict mode
	// If additionalProperties is true or undefined, use passthrough mode
	let zodObject = z.object(shape);

	if (additionalProperties === false) {
		zodObject = zodObject.strict() as any;
	} else {
		zodObject = zodObject.passthrough() as any;
	}

	return zodObject;
}

/**
 * Get a human-readable error message for a Zod issue
 */
export function getZodErrorMessage(issue: z.ZodIssue, schema: any): string {
	const { code, path, message } = issue;

	switch (code) {
		case "invalid_type":
			return `Invalid type: expected ${issue.expected}`;

		case "invalid_string":
			if (issue.validation === "email") {
				return "Invalid email format";
			}
			if (issue.validation === "url") {
				return "Invalid URL format";
			}
			if (issue.validation === "regex") {
				return message || "Does not match required pattern";
			}
			return message;

		case "too_small":
			if (issue.type === "string") {
				return `Too short: minimum length is ${issue.minimum}`;
			}
			if (issue.type === "number") {
				return `Too small: minimum value is ${issue.minimum}`;
			}
			if (issue.type === "array") {
				return `Too few items: minimum is ${issue.minimum}`;
			}
			return message;

		case "too_big":
			if (issue.type === "string") {
				return `Too long: maximum length is ${issue.maximum}`;
			}
			if (issue.type === "number") {
				return `Too large: maximum value is ${issue.maximum}`;
			}
			if (issue.type === "array") {
				return `Too many items: maximum is ${issue.maximum}`;
			}
			return message;

		case "invalid_enum_value":
			return `Invalid value. Allowed values: ${issue.options.join(", ")}`;

		case "custom":
			return message || "Validation failed";

		default:
			return message || "Validation error";
	}
}
