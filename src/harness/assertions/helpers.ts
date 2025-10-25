/**
 * Assertion Helpers
 *
 * Shared utility functions for assertions.
 */

import type { MCPToolResponse } from "../types/client.js";

/**
 * Get text content from MCP tool response
 *
 * Helper function to extract text from response content array.
 *
 * @param response - MCP tool response
 * @returns Concatenated text content
 */
export function getResponseText(response: MCPToolResponse): string {
	if (!response.content || response.content.length === 0) {
		return "";
	}

	return response.content
		.filter((item) => item.type === "text")
		.map((item) => item.text)
		.join("\n");
}
