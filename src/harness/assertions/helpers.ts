/**
 * Assertion Helpers
 *
 * Shared utility functions for assertions.
 */

import type {
	MCPToolResponse,
	MCPPromptResponse,
	MCPResourceContent,
} from "../types/client.js";

/** Union type for all MCP response types */
export type MCPResponse = MCPToolResponse | MCPPromptResponse | MCPResourceContent;

/**
 * Get text content from any MCP response
 *
 * Helper function to extract text from various response types.
 *
 * @param response - MCP response (tool, prompt, or resource)
 * @returns Concatenated text content
 */
export function getResponseText(response: MCPResponse): string {
	// Handle tool responses
	if ("content" in response && Array.isArray(response.content)) {
		return response.content
			.filter((item) => item.type === "text")
			.map((item) => item.text)
			.join("\n");
	}

	// Handle prompt responses
	if ("messages" in response && Array.isArray(response.messages)) {
		return response.messages
			.map((msg) => {
				if (msg.content.type === "text") {
					return msg.content.text || "";
				}
				return "";
			})
			.join("\n");
	}

	// Handle resource responses
	if ("contents" in response && Array.isArray(response.contents)) {
		return response.contents
			.filter((item) => item.text)
			.map((item) => item.text)
			.join("\n");
	}

	// Unknown response type
	return "";
}
