/**
 * Shared Utilities - Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
	toPascalCase,
	toKebabCase,
	capitalize,
	fileExists,
} from "@/core/commands/shared/utils.js";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";

describe("String Utilities", () => {
	describe("toPascalCase()", () => {
		it("should convert kebab-case to PascalCase", () => {
			expect(toPascalCase("my-tool")).toBe("MyTool");
			expect(toPascalCase("my-long-tool-name")).toBe("MyLongToolName");
		});

		it("should handle single words", () => {
			expect(toPascalCase("tool")).toBe("Tool");
		});

		it("should handle already capitalized words", () => {
			expect(toPascalCase("MY-TOOL")).toBe("MyTool");
		});

		it("should handle multiple hyphens", () => {
			expect(toPascalCase("api-client-tool")).toBe("ApiClientTool");
		});

		it("should handle empty string", () => {
			expect(toPascalCase("")).toBe("");
		});
	});

	describe("toKebabCase()", () => {
		it("should convert PascalCase to kebab-case", () => {
			expect(toKebabCase("MyTool")).toBe("my-tool");
			expect(toKebabCase("MyLongToolName")).toBe("my-long-tool-name");
		});

		it("should handle consecutive capitals", () => {
			expect(toKebabCase("HTTPServer")).toBe("h-t-t-p-server");
			expect(toKebabCase("APIClient")).toBe("a-p-i-client");
		});

		it("should handle single word", () => {
			expect(toKebabCase("Tool")).toBe("tool");
		});

		it("should handle already kebab-case", () => {
			expect(toKebabCase("my-tool")).toBe("my-tool");
		});

		it("should handle empty string", () => {
			expect(toKebabCase("")).toBe("");
		});

		it("should not add leading hyphen", () => {
			expect(toKebabCase("Test")).toBe("test");
			expect(toKebabCase("T")).toBe("t");
		});
	});

	describe("capitalize()", () => {
		it("should capitalize first letter", () => {
			expect(capitalize("hello")).toBe("Hello");
			expect(capitalize("world")).toBe("World");
		});

		it("should not affect already capitalized strings", () => {
			expect(capitalize("Hello")).toBe("Hello");
		});

		it("should handle single character", () => {
			expect(capitalize("a")).toBe("A");
		});

		it("should handle empty string", () => {
			expect(capitalize("")).toBe("");
		});
	});
});

describe("File Utilities", () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "utils-test-"));
	});

	afterEach(async () => {
		if (tempDir) {
			await rm(tempDir, { recursive: true, force: true });
		}
	});

	describe("fileExists()", () => {
		it("should return true for existing files", async () => {
			const tempFile = join(tempDir, "test.txt");
			await writeFile(tempFile, "test content");

			expect(await fileExists(tempFile)).toBe(true);
		});

		it("should return false for non-existent files", async () => {
			expect(await fileExists(join(tempDir, "non-existent.txt"))).toBe(false);
		});

		it("should return false for non-existent absolute path", async () => {
			expect(await fileExists("/non/existent/file.txt")).toBe(false);
		});

		it("should work with nested directories", async () => {
			const nestedDir = join(tempDir, "nested", "dir");
			await mkdir(nestedDir, { recursive: true });
			const nestedFile = join(nestedDir, "file.txt");
			await writeFile(nestedFile, "nested content");

			expect(await fileExists(nestedFile)).toBe(true);
		});
	});
});
