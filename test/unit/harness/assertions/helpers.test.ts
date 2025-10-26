/**
 * Assertion Helpers Tests
 *
 * Tests for shared utility functions used by assertions
 */

import { describe, it, expect } from "vitest";
import { getResponseText } from "../../../../src/harness/assertions/helpers.js";
import type {
	MCPToolResponse,
	MCPPromptResponse,
	MCPResourceContent,
} from "../../../../src/harness/types/client.js";

describe("getResponseText", () => {
	it("should extract text from single text item", () => {
		const response: MCPToolResponse = {
			content: [
				{
					type: "text",
					text: "Hello, world!",
				},
			],
		};

		const result = getResponseText(response);
		expect(result).toBe("Hello, world!");
	});

	it("should concatenate multiple text items with newlines", () => {
		const response: MCPToolResponse = {
			content: [
				{
					type: "text",
					text: "Line 1",
				},
				{
					type: "text",
					text: "Line 2",
				},
				{
					type: "text",
					text: "Line 3",
				},
			],
		};

		const result = getResponseText(response);
		expect(result).toBe("Line 1\nLine 2\nLine 3");
	});

	it("should filter out non-text items", () => {
		const response: MCPToolResponse = {
			content: [
				{
					type: "text",
					text: "Text content",
				},
				{
					type: "image",
					text: "Should be ignored",
				},
				{
					type: "text",
					text: "More text",
				},
			],
		};

		const result = getResponseText(response);
		expect(result).toBe("Text content\nMore text");
	});

	it("should return empty string when content is undefined", () => {
		const response: MCPToolResponse = {
			content: undefined as any,
		};

		const result = getResponseText(response);
		expect(result).toBe("");
	});

	it("should return empty string when content is empty array", () => {
		const response: MCPToolResponse = {
			content: [],
		};

		const result = getResponseText(response);
		expect(result).toBe("");
	});

	it("should return empty string when no text items", () => {
		const response: MCPToolResponse = {
			content: [
				{
					type: "image",
					text: "Image only",
				},
				{
					type: "data",
					text: "Data only",
				},
			],
		};

		const result = getResponseText(response);
		expect(result).toBe("");
	});

	it("should handle empty text strings", () => {
		const response: MCPToolResponse = {
			content: [
				{
					type: "text",
					text: "",
				},
				{
					type: "text",
					text: "Non-empty",
				},
				{
					type: "text",
					text: "",
				},
			],
		};

		const result = getResponseText(response);
		expect(result).toBe("\nNon-empty\n");
	});

	it("should handle whitespace-only text", () => {
		const response: MCPToolResponse = {
			content: [
				{
					type: "text",
					text: "   ",
				},
			],
		};

		const result = getResponseText(response);
		expect(result).toBe("   ");
	});

	it("should handle special characters and unicode", () => {
		const response: MCPToolResponse = {
			content: [
				{
					type: "text",
					text: "Hello 👋 World 🌍",
				},
				{
					type: "text",
					text: "Special chars: <>&\"'",
				},
			],
		};

		const result = getResponseText(response);
		expect(result).toBe("Hello 👋 World 🌍\nSpecial chars: <>&\"'");
	});

	it("should handle multi-line text within single item", () => {
		const response: MCPToolResponse = {
			content: [
				{
					type: "text",
					text: "Line 1\nLine 2\nLine 3",
				},
			],
		};

		const result = getResponseText(response);
		expect(result).toBe("Line 1\nLine 2\nLine 3");
	});
});

describe("getResponseText - Prompt Responses", () => {
	it("should extract text from single prompt message", () => {
		const response: MCPPromptResponse = {
			messages: [
				{
					role: "user",
					content: {
						type: "text",
						text: "Prompt text",
					},
				},
			],
		};

		const result = getResponseText(response);
		expect(result).toBe("Prompt text");
	});

	it("should concatenate multiple prompt messages", () => {
		const response: MCPPromptResponse = {
			messages: [
				{
					role: "user",
					content: {
						type: "text",
						text: "First message",
					},
				},
				{
					role: "assistant",
					content: {
						type: "text",
						text: "Second message",
					},
				},
				{
					role: "user",
					content: {
						type: "text",
						text: "Third message",
					},
				},
			],
		};

		const result = getResponseText(response);
		expect(result).toBe("First message\nSecond message\nThird message");
	});

	it("should handle empty messages array", () => {
		const response: MCPPromptResponse = {
			messages: [],
		};

		const result = getResponseText(response);
		expect(result).toBe("");
	});

	it("should handle messages with empty text", () => {
		const response: MCPPromptResponse = {
			messages: [
				{
					role: "user",
					content: {
						type: "text",
						text: "",
					},
				},
				{
					role: "assistant",
					content: {
						type: "text",
						text: "Non-empty",
					},
				},
			],
		};

		const result = getResponseText(response);
		expect(result).toBe("\nNon-empty");
	});

	it("should handle messages with undefined text", () => {
		const response: MCPPromptResponse = {
			messages: [
				{
					role: "user",
					content: {
						type: "text",
						text: undefined as any,
					},
				},
			],
		};

		const result = getResponseText(response);
		expect(result).toBe("");
	});

	it("should handle non-text content types", () => {
		const response: MCPPromptResponse = {
			messages: [
				{
					role: "user",
					content: {
						type: "image" as any,
						text: "Should be filtered",
					},
				},
				{
					role: "assistant",
					content: {
						type: "text",
						text: "Valid text",
					},
				},
			],
		};

		const result = getResponseText(response);
		expect(result).toBe("\nValid text");
	});

	it("should handle multi-line text in prompt messages", () => {
		const response: MCPPromptResponse = {
			messages: [
				{
					role: "user",
					content: {
						type: "text",
						text: "Line 1\nLine 2\nLine 3",
					},
				},
			],
		};

		const result = getResponseText(response);
		expect(result).toBe("Line 1\nLine 2\nLine 3");
	});
});

describe("getResponseText - Resource Responses", () => {
	it("should extract text from single resource content", () => {
		const response: MCPResourceContent = {
			contents: [
				{
					uri: "test://resource",
					text: "Resource text",
					mimeType: "text/plain",
				},
			],
		};

		const result = getResponseText(response);
		expect(result).toBe("Resource text");
	});

	it("should concatenate multiple resource contents", () => {
		const response: MCPResourceContent = {
			contents: [
				{
					uri: "test://resource1",
					text: "First resource",
					mimeType: "text/plain",
				},
				{
					uri: "test://resource2",
					text: "Second resource",
					mimeType: "text/plain",
				},
				{
					uri: "test://resource3",
					text: "Third resource",
					mimeType: "application/json",
				},
			],
		};

		const result = getResponseText(response);
		expect(result).toBe("First resource\nSecond resource\nThird resource");
	});

	it("should handle empty contents array", () => {
		const response: MCPResourceContent = {
			contents: [],
		};

		const result = getResponseText(response);
		expect(result).toBe("");
	});

	it("should filter out contents without text", () => {
		const response: MCPResourceContent = {
			contents: [
				{
					uri: "test://blob",
					blob: "base64data",
					mimeType: "image/png",
				},
				{
					uri: "test://text",
					text: "Valid text",
					mimeType: "text/plain",
				},
				{
					uri: "test://another-blob",
					blob: "moredata",
					mimeType: "application/octet-stream",
				},
			],
		};

		const result = getResponseText(response);
		expect(result).toBe("Valid text");
	});

	it("should handle contents with empty text", () => {
		const response: MCPResourceContent = {
			contents: [
				{
					uri: "test://empty",
					text: "",
					mimeType: "text/plain",
				},
				{
					uri: "test://non-empty",
					text: "Non-empty",
					mimeType: "text/plain",
				},
			],
		};

		const result = getResponseText(response);
		// Empty text strings are filtered out (falsy values excluded)
		expect(result).toBe("Non-empty");
	});

	it("should handle contents with undefined text", () => {
		const response: MCPResourceContent = {
			contents: [
				{
					uri: "test://undefined",
					text: undefined,
					mimeType: "text/plain",
				},
			],
		};

		const result = getResponseText(response);
		expect(result).toBe("");
	});

	it("should handle JSON resource content", () => {
		const response: MCPResourceContent = {
			contents: [
				{
					uri: "config://app",
					text: JSON.stringify({ key: "value", nested: { data: "test" } }, null, 2),
					mimeType: "application/json",
				},
			],
		};

		const result = getResponseText(response);
		expect(result).toContain('"key": "value"');
		expect(result).toContain('"nested"');
	});

	it("should handle multi-line text in resource content", () => {
		const response: MCPResourceContent = {
			contents: [
				{
					uri: "test://multiline",
					text: "Line 1\nLine 2\nLine 3",
					mimeType: "text/plain",
				},
			],
		};

		const result = getResponseText(response);
		expect(result).toBe("Line 1\nLine 2\nLine 3");
	});
});
