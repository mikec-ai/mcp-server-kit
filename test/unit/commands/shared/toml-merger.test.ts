/**
 * TomlMerger - Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { TomlMerger } from "@/core/commands/shared/toml-merger.js";

describe("TomlMerger", () => {
	let tempDir: string;
	let merger: TomlMerger;
	let testFilePath: string;

	beforeEach(async () => {
		tempDir = join("/tmp", `toml-test-${Date.now()}`);
		await mkdir(tempDir, { recursive: true });
		merger = new TomlMerger();
		testFilePath = join(tempDir, "config.toml");
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	describe("mergeSection", () => {
		it("should merge values into existing section", async () => {
			const content = `name = "test-project"
version = "1.0.0"

[vars]
EXISTING_VAR = "existing"
`;
			await writeFile(testFilePath, content, "utf-8");

			const result = await merger.mergeSection(testFilePath, "vars", {
				NEW_VAR: "new",
				ANOTHER_VAR: "another",
			});

			expect(result.success).toBe(true);
			expect(result.modified).toBe(true);
			expect(result.error).toBeUndefined();

			const updatedContent = await readFile(testFilePath, "utf-8");
			expect(updatedContent).toContain("EXISTING_VAR");
			expect(updatedContent).toContain("NEW_VAR");
			expect(updatedContent).toContain("ANOTHER_VAR");
		});

		it("should create section if it does not exist", async () => {
			const content = `name = "test-project"
version = "1.0.0"
`;
			await writeFile(testFilePath, content, "utf-8");

			const result = await merger.mergeSection(testFilePath, "vars", {
				VAR_ONE: "value1",
				VAR_TWO: "value2",
			});

			expect(result.success).toBe(true);
			expect(result.modified).toBe(true);

			const updatedContent = await readFile(testFilePath, "utf-8");
			expect(updatedContent).toContain("[vars]");
			expect(updatedContent).toContain("VAR_ONE");
			expect(updatedContent).toContain("VAR_TWO");
		});

		it("should not overwrite existing values by default", async () => {
			const content = `[vars]
EXISTING_VAR = "original"
`;
			await writeFile(testFilePath, content, "utf-8");

			const result = await merger.mergeSection(testFilePath, "vars", {
				EXISTING_VAR: "modified",
				NEW_VAR: "new",
			});

			expect(result.success).toBe(true);
			expect(result.modified).toBe(true);

			const updatedContent = await readFile(testFilePath, "utf-8");
			expect(updatedContent).toContain('EXISTING_VAR = "original"');
			expect(updatedContent).toContain("NEW_VAR");
		});

		it("should overwrite existing values when overwrite option is true", async () => {
			const content = `[vars]
EXISTING_VAR = "original"
`;
			await writeFile(testFilePath, content, "utf-8");

			const result = await merger.mergeSection(
				testFilePath,
				"vars",
				{
					EXISTING_VAR: "modified",
				},
				{ overwrite: true },
			);

			expect(result.success).toBe(true);
			expect(result.modified).toBe(true);

			const updatedContent = await readFile(testFilePath, "utf-8");
			expect(updatedContent).toContain('EXISTING_VAR = "modified"');
			expect(updatedContent).not.toContain('EXISTING_VAR = "original"');
		});

		it("should return modified false when no changes made", async () => {
			const content = `[vars]
EXISTING_VAR = "value"
`;
			await writeFile(testFilePath, content, "utf-8");

			const result = await merger.mergeSection(testFilePath, "vars", {
				EXISTING_VAR: "different",
			});

			expect(result.success).toBe(true);
			expect(result.modified).toBe(false);
		});

		it("should handle different value types", async () => {
			const content = `[vars]
`;
			await writeFile(testFilePath, content, "utf-8");

			const result = await merger.mergeSection(testFilePath, "vars", {
				STRING_VAR: "text",
				NUMBER_VAR: 42,
				BOOLEAN_VAR: true,
			});

			expect(result.success).toBe(true);
			expect(result.modified).toBe(true);

			const updatedContent = await readFile(testFilePath, "utf-8");
			expect(updatedContent).toContain('STRING_VAR = "text"');
			expect(updatedContent).toContain("NUMBER_VAR = 42");
			expect(updatedContent).toContain("BOOLEAN_VAR = true");
		});

		it("should return error when file does not exist", async () => {
			const result = await merger.mergeSection(
				join(tempDir, "nonexistent.toml"),
				"vars",
				{ VAR: "value" },
			);

			expect(result.success).toBe(false);
			expect(result.modified).toBe(false);
			expect(result.error).toContain("File not found");
		});

		it("should return error when file has invalid TOML", async () => {
			const content = `[vars
INVALID TOML
`;
			await writeFile(testFilePath, content, "utf-8");

			const result = await merger.mergeSection(testFilePath, "vars", {
				VAR: "value",
			});

			expect(result.success).toBe(false);
			expect(result.modified).toBe(false);
			expect(result.error).toContain("TOML parse error");
		});
	});

	describe("removeKeys", () => {
		it("should remove specified keys from section", async () => {
			const content = `[vars]
VAR_ONE = "value1"
VAR_TWO = "value2"
VAR_THREE = "value3"
`;
			await writeFile(testFilePath, content, "utf-8");

			const result = await merger.removeKeys(testFilePath, "vars", [
				"VAR_ONE",
				"VAR_THREE",
			]);

			expect(result.success).toBe(true);
			expect(result.modified).toBe(true);

			const updatedContent = await readFile(testFilePath, "utf-8");
			expect(updatedContent).not.toContain("VAR_ONE");
			expect(updatedContent).toContain("VAR_TWO");
			expect(updatedContent).not.toContain("VAR_THREE");
		});

		it("should remove section when empty after key removal", async () => {
			const content = `[vars]
VAR_ONE = "value1"

[other]
OTHER_VAR = "value"
`;
			await writeFile(testFilePath, content, "utf-8");

			const result = await merger.removeKeys(testFilePath, "vars", ["VAR_ONE"]);

			expect(result.success).toBe(true);
			expect(result.modified).toBe(true);

			const updatedContent = await readFile(testFilePath, "utf-8");
			expect(updatedContent).not.toContain("[vars]");
			expect(updatedContent).toContain("[other]");
		});

		it("should return modified false when keys do not exist", async () => {
			const content = `[vars]
EXISTING_VAR = "value"
`;
			await writeFile(testFilePath, content, "utf-8");

			const result = await merger.removeKeys(testFilePath, "vars", [
				"NONEXISTENT_VAR",
			]);

			expect(result.success).toBe(true);
			expect(result.modified).toBe(false);
		});

		it("should return success when section does not exist", async () => {
			const content = `[other]
OTHER_VAR = "value"
`;
			await writeFile(testFilePath, content, "utf-8");

			const result = await merger.removeKeys(testFilePath, "vars", ["VAR_ONE"]);

			expect(result.success).toBe(true);
			expect(result.modified).toBe(false);
		});

		it("should return error when file does not exist", async () => {
			const result = await merger.removeKeys(
				join(tempDir, "nonexistent.toml"),
				"vars",
				["VAR"],
			);

			expect(result.success).toBe(false);
			expect(result.modified).toBe(false);
			expect(result.error).toContain("File not found");
		});

		it("should return error when file has invalid TOML", async () => {
			const content = `[vars
INVALID TOML
`;
			await writeFile(testFilePath, content, "utf-8");

			const result = await merger.removeKeys(testFilePath, "vars", ["VAR"]);

			expect(result.success).toBe(false);
			expect(result.modified).toBe(false);
			expect(result.error).toContain("TOML parse error");
		});
	});

	describe("hasKeys", () => {
		it("should return true for existing keys", async () => {
			const content = `[vars]
VAR_ONE = "value1"
VAR_TWO = "value2"
`;
			await writeFile(testFilePath, content, "utf-8");

			const result = await merger.hasKeys(testFilePath, "vars", [
				"VAR_ONE",
				"VAR_TWO",
			]);

			expect(result.VAR_ONE).toBe(true);
			expect(result.VAR_TWO).toBe(true);
		});

		it("should return false for nonexistent keys", async () => {
			const content = `[vars]
VAR_ONE = "value1"
`;
			await writeFile(testFilePath, content, "utf-8");

			const result = await merger.hasKeys(testFilePath, "vars", [
				"VAR_ONE",
				"NONEXISTENT",
			]);

			expect(result.VAR_ONE).toBe(true);
			expect(result.NONEXISTENT).toBe(false);
		});

		it("should return false for all keys when section does not exist", async () => {
			const content = `[other]
OTHER_VAR = "value"
`;
			await writeFile(testFilePath, content, "utf-8");

			const result = await merger.hasKeys(testFilePath, "vars", [
				"VAR_ONE",
				"VAR_TWO",
			]);

			expect(result.VAR_ONE).toBe(false);
			expect(result.VAR_TWO).toBe(false);
		});

		it("should return false for all keys when file does not exist", async () => {
			const result = await merger.hasKeys(
				join(tempDir, "nonexistent.toml"),
				"vars",
				["VAR_ONE", "VAR_TWO"],
			);

			expect(result.VAR_ONE).toBe(false);
			expect(result.VAR_TWO).toBe(false);
		});

		it("should return false for all keys when file has invalid TOML", async () => {
			const content = `[vars
INVALID TOML
`;
			await writeFile(testFilePath, content, "utf-8");

			const result = await merger.hasKeys(testFilePath, "vars", [
				"VAR_ONE",
				"VAR_TWO",
			]);

			expect(result.VAR_ONE).toBe(false);
			expect(result.VAR_TWO).toBe(false);
		});
	});

	describe("getValue", () => {
		it("should return value for existing key", async () => {
			const content = `[vars]
STRING_VAR = "text"
NUMBER_VAR = 42
BOOLEAN_VAR = true
`;
			await writeFile(testFilePath, content, "utf-8");

			const stringValue = await merger.getValue(
				testFilePath,
				"vars",
				"STRING_VAR",
			);
			const numberValue = await merger.getValue(
				testFilePath,
				"vars",
				"NUMBER_VAR",
			);
			const booleanValue = await merger.getValue(
				testFilePath,
				"vars",
				"BOOLEAN_VAR",
			);

			expect(stringValue).toBe("text");
			expect(numberValue).toBe(42);
			expect(booleanValue).toBe(true);
		});

		it("should return undefined for nonexistent key", async () => {
			const content = `[vars]
EXISTING_VAR = "value"
`;
			await writeFile(testFilePath, content, "utf-8");

			const result = await merger.getValue(
				testFilePath,
				"vars",
				"NONEXISTENT",
			);

			expect(result).toBeUndefined();
		});

		it("should return undefined when section does not exist", async () => {
			const content = `[other]
OTHER_VAR = "value"
`;
			await writeFile(testFilePath, content, "utf-8");

			const result = await merger.getValue(testFilePath, "vars", "VAR_ONE");

			expect(result).toBeUndefined();
		});

		it("should return undefined when file does not exist", async () => {
			const result = await merger.getValue(
				join(tempDir, "nonexistent.toml"),
				"vars",
				"VAR_ONE",
			);

			expect(result).toBeUndefined();
		});

		it("should return undefined when file has invalid TOML", async () => {
			const content = `[vars
INVALID TOML
`;
			await writeFile(testFilePath, content, "utf-8");

			const result = await merger.getValue(testFilePath, "vars", "VAR_ONE");

			expect(result).toBeUndefined();
		});
	});
});
