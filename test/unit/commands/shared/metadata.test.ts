/**
 * Template Metadata Management - Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
	updateTemplateMetadata,
	readTemplateMetadata,
} from "@/core/commands/shared/metadata.js";
import { writeFile, mkdir, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";

describe("Metadata Utilities", () => {
	let testDir: string;

	beforeEach(async () => {
		testDir = await mkdtemp(join(tmpdir(), "metadata-test-"));
	});

	afterEach(async () => {
		if (testDir) {
			await rm(testDir, { recursive: true, force: true });
		}
	});

	describe("updateTemplateMetadata()", () => {
		it("should create tools array if missing", async () => {
			// Create minimal metadata
			const metadataPath = join(testDir, ".mcp-template.json");
			await writeFile(
				metadataPath,
				JSON.stringify({ id: "test", version: "1.0.0" }),
				"utf-8",
			);

			await updateTemplateMetadata(
				testDir,
				"tools",
				"my-tool",
				"src/tools/my-tool.ts",
				true,
			);

			const result = await readTemplateMetadata(testDir);
			expect(result?.tools as unknown[]).toHaveLength(1);
			expect((result?.tools as unknown[])[0]).toMatchObject({
				name: "my-tool",
				file: "src/tools/my-tool.ts",
				registered: true,
				hasUnitTest: true,
				hasIntegrationTest: true,
			});
		});

		it("should create prompts array if missing", async () => {
			const metadataPath = join(testDir, ".mcp-template.json");
			await writeFile(
				metadataPath,
				JSON.stringify({ id: "test", version: "1.0.0" }),
				"utf-8",
			);

			await updateTemplateMetadata(
				testDir,
				"prompts",
				"code-reviewer",
				"src/prompts/code-reviewer.ts",
				true,
			);

			const result = await readTemplateMetadata(testDir);
			expect(result?.prompts as unknown[]).toHaveLength(1);
			expect((result?.prompts as unknown[])[0]).toMatchObject({
				name: "code-reviewer",
				file: "src/prompts/code-reviewer.ts",
			});
		});

		it("should create resources array if missing", async () => {
			const metadataPath = join(testDir, ".mcp-template.json");
			await writeFile(
				metadataPath,
				JSON.stringify({ id: "test", version: "1.0.0" }),
				"utf-8",
			);

			await updateTemplateMetadata(
				testDir,
				"resources",
				"config",
				"src/resources/config.ts",
				false,
			);

			const result = await readTemplateMetadata(testDir);
			expect(result?.resources as unknown[]).toHaveLength(1);
			expect((result?.resources as unknown[])[0]).toMatchObject({
				name: "config",
				file: "src/resources/config.ts",
				hasUnitTest: false,
				hasIntegrationTest: false,
			});
		});

		it("should append to existing tools array", async () => {
			// Create metadata with existing tool
			const metadataPath = join(testDir, ".mcp-template.json");
			await writeFile(
				metadataPath,
				JSON.stringify({
					id: "test",
					version: "1.0.0",
					tools: [
						{
							name: "existing-tool",
							file: "src/tools/existing-tool.ts",
							registered: true,
							hasUnitTest: true,
							hasIntegrationTest: true,
						},
					],
				}),
				"utf-8",
			);

			await updateTemplateMetadata(
				testDir,
				"tools",
				"new-tool",
				"src/tools/new-tool.ts",
				false,
			);

			const result = await readTemplateMetadata(testDir);
			expect(result?.tools as unknown[]).toHaveLength(2);
			expect(((result?.tools as unknown[])[0] as { name: string }).name).toBe("existing-tool");
			expect(((result?.tools as unknown[])[1] as { name: string }).name).toBe("new-tool");
		});

		it("should not throw if file doesn't exist", async () => {
			await expect(
				updateTemplateMetadata(
					testDir,
					"tools",
					"my-tool",
					"src/tools/my-tool.ts",
					true,
				),
			).resolves.not.toThrow();
		});

		it("should handle malformed JSON gracefully", async () => {
			const metadataPath = join(testDir, ".mcp-template.json");
			await writeFile(metadataPath, "{ invalid json", "utf-8");

			// Mock console.warn to suppress expected warning
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			// Should not throw, just warn
			await expect(
				updateTemplateMetadata(
					testDir,
					"tools",
					"my-tool",
					"src/tools/my-tool.ts",
					true,
				),
			).resolves.not.toThrow();

			warnSpy.mockRestore();
		});

		it("should preserve existing metadata fields", async () => {
			const metadataPath = join(testDir, ".mcp-template.json");
			await writeFile(
				metadataPath,
				JSON.stringify({
					id: "test-server",
					version: "1.0.0",
					name: "My Server",
					customField: "custom value",
				}),
				"utf-8",
			);

			await updateTemplateMetadata(
				testDir,
				"tools",
				"my-tool",
				"src/tools/my-tool.ts",
				true,
			);

			const content = await readFile(metadataPath, "utf-8");
			const metadata = JSON.parse(content);

			expect(metadata.id).toBe("test-server");
			expect(metadata.version).toBe("1.0.0");
			expect(metadata.name).toBe("My Server");
			expect(metadata.customField).toBe("custom value");
		});

		it("should format JSON with tabs", async () => {
			const metadataPath = join(testDir, ".mcp-template.json");
			await writeFile(
				metadataPath,
				JSON.stringify({ id: "test", version: "1.0.0" }),
				"utf-8",
			);

			await updateTemplateMetadata(
				testDir,
				"tools",
				"my-tool",
				"src/tools/my-tool.ts",
				true,
			);

			const content = await readFile(metadataPath, "utf-8");
			expect(content).toContain("\t");
		});
	});

	describe("readTemplateMetadata()", () => {
		it("should return null if file doesn't exist", async () => {
			const result = await readTemplateMetadata(testDir);
			expect(result).toBeNull();
		});

		it("should parse valid JSON", async () => {
			const metadata = {
				id: "test",
				version: "1.0.0",
				tools: [],
			};
			const metadataPath = join(testDir, ".mcp-template.json");
			await writeFile(metadataPath, JSON.stringify(metadata), "utf-8");

			const result = await readTemplateMetadata(testDir);
			expect(result).toEqual(metadata);
		});

		it("should return null for malformed JSON", async () => {
			const metadataPath = join(testDir, ".mcp-template.json");
			await writeFile(metadataPath, "{ invalid json", "utf-8");

			// Mock console.warn to suppress expected warning
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			const result = await readTemplateMetadata(testDir);
			expect(result).toBeNull();

			warnSpy.mockRestore();
		});

		it("should read complex metadata structures", async () => {
			const metadata = {
				id: "test",
				version: "1.0.0",
				tools: [{ name: "tool1" }, { name: "tool2" }],
				prompts: [{ name: "prompt1" }],
				resources: [{ name: "resource1" }],
			};
			const metadataPath = join(testDir, ".mcp-template.json");
			await writeFile(metadataPath, JSON.stringify(metadata), "utf-8");

			const result = await readTemplateMetadata(testDir);
			expect(result).toEqual(metadata);
		});
	});
});
