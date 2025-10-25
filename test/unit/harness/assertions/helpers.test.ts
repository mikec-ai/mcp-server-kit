/**
 * Assertion Helpers Tests
 *
 * Tests for shared utility functions used by assertions
 */

import { describe, it, expect } from "vitest";
import { getResponseText } from "../../../../src/harness/assertions/helpers.js";
import type { MCPToolResponse } from "../../../../src/harness/types/client.js";

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
