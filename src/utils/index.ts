/**
 * Utilities - Reusable Helper Functions
 *
 * General-purpose utilities extracted from va-lighthouse-mcp
 * that are useful for any MCP server.
 */

// JSON Schema to Zod conversion
export { jsonSchemaToZod } from "./json-schema-to-zod.js";

// Example payload generation
export { generateExamplePayload } from "./example-generator.js";

// Validation error formatting
export {
	formatValidationErrors,
	formatSingleError,
	type FormattedValidationError,
} from "./error-formatter.js";
