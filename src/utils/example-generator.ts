/**
 * Generate example payloads from JSON schemas
 */

export class ExampleGenerator {
	private static readonly MAX_DEPTH = 5;

	/**
	 * Generate example payload from JSON schema
	 */
	static generate(schema: any, options?: { requiredOnly?: boolean; depth?: number }): any {
		const depth = options?.depth || 0;

		// Prevent infinite recursion
		if (depth > this.MAX_DEPTH) {
			return null;
		}

		if (!schema || typeof schema !== "object") {
			return null;
		}

		// Handle $ref (should be dereferenced already, but just in case)
		if (schema.$ref) {
			return `<reference: ${schema.$ref}>`;
		}

		// Use provided example if available
		if (schema.example !== undefined) {
			return schema.example;
		}

		// Use default if available
		if (schema.default !== undefined) {
			return schema.default;
		}

		// Handle by type
		switch (schema.type) {
			case "object":
				return this.generateObject(schema, { ...options, depth });

			case "array":
				return this.generateArray(schema, { ...options, depth });

			case "string":
				return this.generateString(schema);

			case "number":
			case "integer":
				return this.generateNumber(schema);

			case "boolean":
				return this.generateBoolean(schema);

			case "null":
				return null;

			default:
				// Handle oneOf, anyOf, allOf
				if (schema.oneOf && Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
					return this.generate(schema.oneOf[0], { ...options, depth: depth + 1 });
				}

				if (schema.anyOf && Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
					return this.generate(schema.anyOf[0], { ...options, depth: depth + 1 });
				}

				if (schema.allOf && Array.isArray(schema.allOf)) {
					// Merge all schemas
					const merged: any = { type: "object", properties: {} };
					for (const subSchema of schema.allOf) {
						if (subSchema.properties) {
							Object.assign(merged.properties, subSchema.properties);
						}
						if (subSchema.required) {
							merged.required = [...(merged.required || []), ...subSchema.required];
						}
					}
					return this.generate(merged, { ...options, depth: depth + 1 });
				}

				return null;
		}
	}

	/**
	 * Generate example object
	 */
	private static generateObject(
		schema: any,
		options?: { requiredOnly?: boolean; depth?: number },
	): any {
		const obj: any = {};
		const properties = schema.properties || {};
		const required = schema.required || [];
		const depth = options?.depth || 0;

		for (const prop in properties) {
			// Skip optional properties if requiredOnly is true
			if (options?.requiredOnly && !required.includes(prop)) {
				continue;
			}

			// Sanitize property name (ensure it's valid for JSON)
			const safeProp = this.sanitizePropertyName(prop);
			if (!safeProp) {
				continue;
			}

			const value = this.generate(properties[prop], { ...options, depth: depth + 1 });

			// Only add property if value is not undefined
			if (value !== undefined) {
				obj[safeProp] = value;
			}
		}

		return obj;
	}

	/**
	 * Sanitize property name to ensure it's valid for JSON
	 */
	private static sanitizePropertyName(prop: string): string | null {
		if (!prop || typeof prop !== "string") {
			return null;
		}

		// Remove invalid characters but keep alphanumeric, underscore, hyphen, and dollar sign
		const sanitized = prop.replace(/[^a-zA-Z0-9_$-]/g, "_");

		// Ensure property name is not empty after sanitization
		return sanitized.length > 0 ? sanitized : null;
	}

	/**
	 * Generate example array
	 */
	private static generateArray(
		schema: any,
		options?: { requiredOnly?: boolean; depth?: number },
	): any[] {
		if (!schema.items) {
			return [];
		}

		const depth = options?.depth || 0;

		// Generate example items, respecting minItems but capping at 10 to prevent huge examples
		const minItems = schema.minItems || 1;
		const itemCount = Math.min(minItems, 10);
		const items = [];

		for (let i = 0; i < itemCount; i++) {
			const item = this.generate(schema.items, { ...options, depth: depth + 1 });
			// Only add item if it's not undefined
			if (item !== undefined) {
				items.push(item);
			}
		}

		return items;
	}

	/**
	 * Generate example string
	 */
	private static generateString(schema: any): string {
		// Handle enum
		if (schema.enum && schema.enum.length > 0) {
			return schema.enum[0];
		}

		// Handle format
		if (schema.format) {
			return this.generateFormattedString(schema.format);
		}

		// Handle pattern
		if (schema.pattern) {
			return this.generatePatternString(schema.pattern);
		}

		// Default string
		return "string";
	}

	/**
	 * Generate formatted string
	 */
	private static generateFormattedString(format: string): string {
		switch (format) {
			case "email":
				return "user@example.com";
			case "date":
				return "2024-01-15";
			case "date-time":
				return "2024-01-15T10:30:00Z";
			case "uri":
			case "url":
				return "https://example.com";
			case "uuid":
				return "123e4567-e89b-12d3-a456-426614174000";
			case "ipv4":
				return "192.168.1.1";
			case "ipv6":
				return "2001:0db8:85a3:0000:0000:8a2e:0370:7334";
			case "ssn":
				return "123-45-6789";
			case "phone":
				return "555-123-4567";
			default:
				return "string";
		}
	}

	/**
	 * Generate string matching a pattern
	 */
	private static generatePatternString(pattern: string): string {
		// Handle common patterns
		if (pattern.includes("\\d{3}-\\d{2}-\\d{4}")) {
			return "123-45-6789"; // SSN
		}

		if (pattern.includes("\\d{3}-\\d{3}-\\d{4}")) {
			return "555-123-4567"; // Phone
		}

		if (pattern.includes("^[A-Z]{2}\\d{6}$")) {
			return "AB123456"; // ID pattern
		}

		// Default
		return "string";
	}

	/**
	 * Generate example number
	 */
	private static generateNumber(schema: any): number {
		// Handle enum
		if (schema.enum && schema.enum.length > 0) {
			return schema.enum[0];
		}

		// Use minimum if available
		if (schema.minimum !== undefined) {
			return schema.minimum;
		}

		// Use maximum if available
		if (schema.maximum !== undefined) {
			return schema.maximum;
		}

		// Default
		return schema.type === "integer" ? 0 : 0.0;
	}

	/**
	 * Generate example boolean
	 */
	private static generateBoolean(schema: any): boolean {
		return true;
	}
}
