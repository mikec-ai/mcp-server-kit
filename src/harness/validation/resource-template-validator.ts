/**
 * Resource Template Validation
 *
 * Validates that resources with URI template variables use ResourceTemplate class
 */

/**
 * Validate resource registration code
 *
 * Checks for the common mistake of using {variables} without ResourceTemplate
 *
 * @param code - Resource file content
 * @param fileName - Name of the file being validated
 * @returns Validation errors (empty array if valid)
 */
export function validateResourceTemplate(
	code: string,
	fileName: string,
): string[] {
	const errors: string[] = [];

	// Check if code has server.resource calls
	const resourceCalls = code.match(/server\.resource\([^)]+\)/gs);
	if (!resourceCalls) {
		return errors; // No resources to validate
	}

	for (const call of resourceCalls) {
		// Extract the URI pattern (second parameter)
		const uriPatternMatch = call.match(
			/server\.resource\s*\(\s*"[^"]+"\s*,\s*([^,]+)/,
		);

		if (!uriPatternMatch) continue;

		const uriPatternArg = uriPatternMatch[1].trim();

		// Check if URI pattern is a plain string with template variables
		const isPlainString =
			uriPatternArg.startsWith('"') || uriPatternArg.startsWith("'");
		const hasVariables =
			uriPatternArg.includes("{") && uriPatternArg.includes("}");

		if (isPlainString && hasVariables) {
			// Extract the actual URI pattern for the error message
			const uriPattern = uriPatternArg.match(/["']([^"']+)["']/)?.[1];

			errors.push(
				`${fileName}: Resource uses URI template "${uriPattern}" with variables but doesn't use ResourceTemplate class.

❌ Current code:
   server.resource("name", "${uriPattern}", ...)

✅ Should be:
   import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
   server.resource("name", new ResourceTemplate("${uriPattern}", { list: ..., complete: ... }), ...)

See docs/RESOURCES.md for more details.`,
			);
		}
	}

	return errors;
}

/**
 * Validate all resource files in a project
 *
 * @param resourceFiles - Map of file paths to file contents
 * @returns Array of validation errors
 */
export function validateAllResources(
	resourceFiles: Map<string, string>,
): string[] {
	const errors: string[] = [];

	for (const [fileName, code] of resourceFiles.entries()) {
		const fileErrors = validateResourceTemplate(code, fileName);
		errors.push(...fileErrors);
	}

	return errors;
}
