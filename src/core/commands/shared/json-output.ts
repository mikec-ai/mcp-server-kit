/**
 * JSON Output Utility
 *
 * Handles outputting command results in either JSON or human-readable format.
 */

/**
 * Output a result in JSON or human-readable format
 *
 * @param result - The result object to output
 * @param jsonMode - Whether to output as JSON
 * @param fallbackFormatter - Function to format result as human-readable text
 */
export function outputResult<T>(
	result: T,
	jsonMode: boolean,
	fallbackFormatter?: (result: T) => void,
): void {
	if (jsonMode) {
		console.log(JSON.stringify(result, null, 2));
	} else if (fallbackFormatter) {
		fallbackFormatter(result);
	}
}
