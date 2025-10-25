/**
 * error-formatter - Unit Tests
 *
 * Tests for error formatting utility
 */

import { describe, it, expect } from "vitest";
import { ErrorFormatter } from "../../../src/utils/error-formatter.js";
import type { ValidationError, ValidationWarning } from "../../../src/types/mcp-tools.js";

describe("ErrorFormatter", () => {
	describe("formatErrors", () => {
		it("should handle empty error array", () => {
			const result = ErrorFormatter.formatErrors([]);
			expect(result).toBe("No errors");
		});

		it("should format single error", () => {
			const errors: ValidationError[] = [
				{
					field: "name",
					message: "Field is required",
				},
			];

			const result = ErrorFormatter.formatErrors(errors);

			expect(result).toContain("Found 1 validation error:");
			expect(result).toContain("1. Field: name");
			expect(result).toContain("   Error: Field is required");
		});

		it("should format multiple errors", () => {
			const errors: ValidationError[] = [
				{
					field: "name",
					message: "Field is required",
				},
				{
					field: "email",
					message: "Invalid email format",
				},
			];

			const result = ErrorFormatter.formatErrors(errors);

			expect(result).toContain("Found 2 validation errors:");
			expect(result).toContain("1. Field: name");
			expect(result).toContain("   Error: Field is required");
			expect(result).toContain("2. Field: email");
			expect(result).toContain("   Error: Invalid email format");
		});

		it("should include expected value when present", () => {
			const errors: ValidationError[] = [
				{
					field: "age",
					message: "Invalid type",
					expected: "number",
				},
			];

			const result = ErrorFormatter.formatErrors(errors);

			expect(result).toContain("Expected: \"number\"");
		});

		it("should include received value when present", () => {
			const errors: ValidationError[] = [
				{
					field: "age",
					message: "Invalid type",
					received: "string",
				},
			];

			const result = ErrorFormatter.formatErrors(errors);

			expect(result).toContain("Received: \"string\"");
		});

		it("should include fix suggestion when present", () => {
			const errors: ValidationError[] = [
				{
					field: "email",
					message: "Invalid format",
					fixSuggestion: "Use format: user@example.com",
				},
			];

			const result = ErrorFormatter.formatErrors(errors);

			expect(result).toContain("Fix: Use format: user@example.com");
		});

		it("should handle error with all fields", () => {
			const errors: ValidationError[] = [
				{
					field: "count",
					message: "Value out of range",
					expected: "1-10",
					received: "15",
					fixSuggestion: "Provide a value between 1 and 10",
				},
			];

			const result = ErrorFormatter.formatErrors(errors);

			expect(result).toContain("Field: count");
			expect(result).toContain("Error: Value out of range");
			expect(result).toContain("Expected: \"1-10\"");
			expect(result).toContain("Received: \"15\"");
			expect(result).toContain("Fix: Provide a value between 1 and 10");
		});
	});

	describe("formatWarnings", () => {
		it("should handle empty warning array", () => {
			const result = ErrorFormatter.formatWarnings([]);
			expect(result).toBe("");
		});

		it("should format single warning", () => {
			const warnings: ValidationWarning[] = [
				{
					field: "description",
					message: "Field is optional but recommended",
				},
			];

			const result = ErrorFormatter.formatWarnings(warnings);

			expect(result).toContain("Found 1 warning:");
			expect(result).toContain("1. Field: description");
			expect(result).toContain("   Warning: Field is optional but recommended");
		});

		it("should format multiple warnings", () => {
			const warnings: ValidationWarning[] = [
				{
					field: "description",
					message: "Field is optional but recommended",
				},
				{
					field: "tags",
					message: "Consider adding tags for better categorization",
				},
			];

			const result = ErrorFormatter.formatWarnings(warnings);

			expect(result).toContain("Found 2 warnings:");
			expect(result).toContain("1. Field: description");
			expect(result).toContain("2. Field: tags");
		});

		it("should include suggestion when present", () => {
			const warnings: ValidationWarning[] = [
				{
					field: "metadata",
					message: "Metadata is sparse",
					suggestion: "Add more descriptive metadata for better documentation",
				},
			];

			const result = ErrorFormatter.formatWarnings(warnings);

			expect(result).toContain("Suggestion: Add more descriptive metadata for better documentation");
		});
	});

	describe("formatValidationResult", () => {
		it("should format valid result without warnings", () => {
			const result = ErrorFormatter.formatValidationResult({
				valid: true,
				errors: [],
			});

			expect(result).toBe("✓ Payload is valid");
		});

		it("should format valid result with warnings", () => {
			const warnings: ValidationWarning[] = [
				{
					field: "description",
					message: "Field is optional but recommended",
				},
			];

			const result = ErrorFormatter.formatValidationResult({
				valid: true,
				errors: [],
				warnings,
			});

			expect(result).toContain("✓ Payload is valid");
			expect(result).toContain("Found 1 warning:");
			expect(result).toContain("Field: description");
		});

		it("should format invalid result", () => {
			const errors: ValidationError[] = [
				{
					field: "name",
					message: "Field is required",
				},
			];

			const result = ErrorFormatter.formatValidationResult({
				valid: false,
				errors,
			});

			expect(result).toContain("✗ Payload validation failed");
			expect(result).toContain("Found 1 validation error:");
			expect(result).toContain("Field: name");
			expect(result).toContain("Error: Field is required");
		});

		it("should format invalid result with multiple errors", () => {
			const errors: ValidationError[] = [
				{
					field: "name",
					message: "Field is required",
				},
				{
					field: "email",
					message: "Invalid email format",
					expected: "email",
					received: "not-an-email",
					fixSuggestion: "Use format: user@example.com",
				},
			];

			const result = ErrorFormatter.formatValidationResult({
				valid: false,
				errors,
			});

			expect(result).toContain("✗ Payload validation failed");
			expect(result).toContain("Found 2 validation errors:");
			expect(result).toContain("1. Field: name");
			expect(result).toContain("2. Field: email");
			expect(result).toContain("Expected: \"email\"");
			expect(result).toContain("Received: \"not-an-email\"");
			expect(result).toContain("Fix: Use format: user@example.com");
		});
	});

	describe("Edge cases", () => {
		it("should handle field names with special characters", () => {
			const errors: ValidationError[] = [
				{
					field: "user.profile.email",
					message: "Invalid nested field",
				},
			];

			const result = ErrorFormatter.formatErrors(errors);

			expect(result).toContain("Field: user.profile.email");
		});

		it("should handle long error messages", () => {
			const errors: ValidationError[] = [
				{
					field: "data",
					message: "This is a very long error message that describes in great detail what went wrong with the validation and provides extensive context about the issue at hand",
				},
			];

			const result = ErrorFormatter.formatErrors(errors);

			expect(result).toContain("This is a very long error message");
		});

		it("should handle complex expected/received values", () => {
			const errors: ValidationError[] = [
				{
					field: "config",
					message: "Object structure mismatch",
					expected: { type: "object", properties: { name: "string" } },
					received: { type: "array" },
				},
			];

			const result = ErrorFormatter.formatErrors(errors);

			// JSON.stringify should be used for complex values
			expect(result).toContain("Expected:");
			expect(result).toContain("Received:");
		});

		it("should handle empty string field names", () => {
			const errors: ValidationError[] = [
				{
					field: "",
					message: "Root level error",
				},
			];

			const result = ErrorFormatter.formatErrors(errors);

			expect(result).toContain("Field: ");
			expect(result).toContain("Error: Root level error");
		});
	});
});
