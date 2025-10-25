/**
 * Test Fixtures - Sample JSON Schemas
 *
 * Shared test schemas used across multiple test files
 */

/**
 * Simple type schemas
 */
export const simpleSchemas = {
	string: { type: "string" },
	number: { type: "number" },
	integer: { type: "integer" },
	boolean: { type: "boolean" },
	null: { type: "null" },
};

/**
 * String schemas with constraints
 */
export const stringSchemas = {
	withMinMax: {
		type: "string",
		minLength: 3,
		maxLength: 10,
	},
	withPattern: {
		type: "string",
		pattern: "^[A-Z]{2}\\d{4}$",
	},
	email: {
		type: "string",
		format: "email",
	},
	url: {
		type: "string",
		format: "url",
	},
	uuid: {
		type: "string",
		format: "uuid",
	},
	date: {
		type: "string",
		format: "date",
	},
	dateTime: {
		type: "string",
		format: "date-time",
	},
	ssn: {
		type: "string",
		format: "ssn",
	},
	phone: {
		type: "string",
		format: "phone",
	},
	stringEnum: {
		type: "string",
		enum: ["red", "green", "blue"],
	},
};

/**
 * Number schemas with constraints
 */
export const numberSchemas = {
	withMinMax: {
		type: "number",
		minimum: 0,
		maximum: 100,
	},
	withExclusiveMinMax: {
		type: "number",
		exclusiveMinimum: 0,
		exclusiveMaximum: 100,
	},
	withMultipleOf: {
		type: "number",
		multipleOf: 5,
	},
	integer: {
		type: "integer",
		minimum: 1,
		maximum: 10,
	},
	numberEnum: {
		type: "number",
		enum: [1, 2, 3],
	},
};

/**
 * Array schemas
 */
export const arraySchemas = {
	stringArray: {
		type: "array",
		items: { type: "string" },
	},
	numberArray: {
		type: "array",
		items: { type: "number" },
	},
	withMinMax: {
		type: "array",
		items: { type: "string" },
		minItems: 1,
		maxItems: 5,
	},
	nestedArray: {
		type: "array",
		items: {
			type: "array",
			items: { type: "string" },
		},
	},
};

/**
 * Object schemas
 */
export const objectSchemas = {
	simple: {
		type: "object",
		properties: {
			name: { type: "string" },
			age: { type: "number" },
		},
		required: ["name"],
	},
	nested: {
		type: "object",
		properties: {
			user: {
				type: "object",
				properties: {
					name: { type: "string" },
					email: { type: "string", format: "email" },
				},
				required: ["name", "email"],
			},
			metadata: {
				type: "object",
				properties: {
					created: { type: "string", format: "date-time" },
					updated: { type: "string", format: "date-time" },
				},
			},
		},
		required: ["user"],
	},
	withAdditionalProperties: {
		type: "object",
		properties: {
			id: { type: "string" },
		},
		additionalProperties: true,
	},
	strictObject: {
		type: "object",
		properties: {
			id: { type: "string" },
		},
		additionalProperties: false,
	},
};

/**
 * Complex schemas (oneOf, anyOf, allOf)
 */
export const complexSchemas = {
	oneOf: {
		oneOf: [
			{ type: "string" },
			{ type: "number" },
		],
	},
	anyOf: {
		anyOf: [
			{ type: "string", minLength: 5 },
			{ type: "number", minimum: 10 },
		],
	},
	allOf: {
		allOf: [
			{
				type: "object",
				properties: {
					name: { type: "string" },
				},
				required: ["name"],
			},
			{
				type: "object",
				properties: {
					age: { type: "number" },
				},
				required: ["age"],
			},
		],
	},
};

/**
 * Edge case schemas
 */
export const edgeCaseSchemas = {
	noType: {
		properties: {
			name: { type: "string" },
		},
	},
	emptyObject: {
		type: "object",
	},
	emptyArray: {
		type: "array",
	},
	withRef: {
		$ref: "#/definitions/User",
	},
};

/**
 * Complete tool parameter schema example
 */
export const toolParameterSchema = {
	type: "object",
	properties: {
		message: {
			type: "string",
			description: "The message to process",
			minLength: 1,
			maxLength: 1000,
		},
		count: {
			type: "integer",
			description: "Number of times to repeat",
			minimum: 1,
			maximum: 10,
			default: 1,
		},
		priority: {
			type: "string",
			enum: ["low", "medium", "high"],
			description: "Message priority",
		},
		metadata: {
			type: "object",
			properties: {
				user_id: { type: "string", format: "uuid" },
				timestamp: { type: "string", format: "date-time" },
				tags: {
					type: "array",
					items: { type: "string" },
					maxItems: 5,
				},
			},
			required: ["user_id"],
		},
	},
	required: ["message"],
};
