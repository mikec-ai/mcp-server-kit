/**
 * Entity Lister - Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { EntityLister, EntityConfig, EntityInfo } from "@/core/commands/shared/entity-lister.js";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";

describe("EntityLister", () => {
	let testDir: string;
	let toolsConfig: EntityConfig;

	beforeEach(async () => {
		testDir = await mkdtemp(join(tmpdir(), "entity-lister-test-"));

		toolsConfig = {
			entityType: "tool",
			entityTypePlural: "tools",
			sourceDir: "src/tools",
			registrationPattern: /register(\w+)Tool\(this\.server\)/g,
			unitTestDir: "test/unit/tools",
			integrationTestDir: "test/integration/specs",
			descriptionPattern:
				/server\.tool\(\s*["']([^"']+)["'],\s*["']([^"']+)["']/,
		};
	});

	afterEach(async () => {
		if (testDir) {
			await rm(testDir, { recursive: true, force: true });
		}
	});

	describe("createCommand()", () => {
		it("should create command with correct name", () => {
			const lister = new EntityLister(toolsConfig);
			const command = lister.createCommand();

			expect(command.name()).toBe("tools");
		});

		it("should create command with correct description", () => {
			const lister = new EntityLister(toolsConfig);
			const command = lister.createCommand();

			expect(command.description()).toBe(
				"List all tools in the MCP server project",
			);
		});

		it("should have --json option", () => {
			const lister = new EntityLister(toolsConfig);
			const command = lister.createCommand();

			const options = command.options;
			const jsonOption = options.find((o) => o.long === "--json");

			expect(jsonOption).toBeDefined();
		});

		it("should have --filter option", () => {
			const lister = new EntityLister(toolsConfig);
			const command = lister.createCommand();

			const options = command.options;
			const filterOption = options.find((o) => o.long === "--filter");

			expect(filterOption).toBeDefined();
			expect(filterOption?.defaultValue).toBe("all");
		});

		it("should have --show-examples option", () => {
			const lister = new EntityLister(toolsConfig);
			const command = lister.createCommand();

			const options = command.options;
			const showExamplesOption = options.find(
				(o) => o.long === "--show-examples",
			);

			expect(showExamplesOption).toBeDefined();
		});

		it("should work with prompts configuration", () => {
			const promptsConfig: EntityConfig = {
				...toolsConfig,
				entityType: "prompt",
				entityTypePlural: "prompts",
			};

			const lister = new EntityLister(promptsConfig);
			const command = lister.createCommand();

			expect(command.name()).toBe("prompts");
			expect(command.description()).toBe(
				"List all prompts in the MCP server project",
			);
		});
	});

	describe("discoverEntities()", () => {
		it("should discover entities in source directory", async () => {
			// Create test structure
			const toolsDir = join(testDir, "src", "tools");
			await mkdir(toolsDir, { recursive: true });
			await writeFile(join(toolsDir, "my-tool.ts"), "// tool code");
			await writeFile(join(toolsDir, "another-tool.ts"), "// another tool");

			// Create index.ts with registrations
			const indexPath = join(testDir, "src", "index.ts");
			await writeFile(
				indexPath,
				`
				registerMyToolTool(this.server);
				registerAnotherToolTool(this.server);
			`,
			);

			const lister = new EntityLister(toolsConfig);
			const entities = await lister.discoverEntities(testDir, false);

			expect(entities).toHaveLength(2);
			const names = entities.map((e) => e.name).sort();
			expect(names).toEqual(["another-tool", "my-tool"]);
		});

		it("should exclude example files by default", async () => {
			const toolsDir = join(testDir, "src", "tools");
			await mkdir(toolsDir, { recursive: true });
			await writeFile(join(toolsDir, "my-tool.ts"), "// tool code");
			await writeFile(join(toolsDir, "_example-tool.ts"), "// example");

			const indexPath = join(testDir, "src", "index.ts");
			await writeFile(indexPath, "");

			const lister = new EntityLister(toolsConfig);
			const entities = await lister.discoverEntities(testDir, false);

			expect(entities).toHaveLength(1);
			expect(entities[0].name).toBe("my-tool");
		});

		it("should include example files when requested", async () => {
			const toolsDir = join(testDir, "src", "tools");
			await mkdir(toolsDir, { recursive: true });
			await writeFile(join(toolsDir, "my-tool.ts"), "// tool code");
			await writeFile(join(toolsDir, "_example-tool.ts"), "// example");

			const indexPath = join(testDir, "src", "index.ts");
			await writeFile(indexPath, "");

			const lister = new EntityLister(toolsConfig);
			const entities = await lister.discoverEntities(testDir, true);

			expect(entities).toHaveLength(2);
			expect(entities.some((e) => e.name === "_example-tool")).toBe(true);
		});

		it("should exclude .test.ts files", async () => {
			const toolsDir = join(testDir, "src", "tools");
			await mkdir(toolsDir, { recursive: true });
			await writeFile(join(toolsDir, "my-tool.ts"), "// tool code");
			await writeFile(join(toolsDir, "my-tool.test.ts"), "// test");

			const indexPath = join(testDir, "src", "index.ts");
			await writeFile(indexPath, "");

			const lister = new EntityLister(toolsConfig);
			const entities = await lister.discoverEntities(testDir, false);

			expect(entities).toHaveLength(1);
			expect(entities[0].name).toBe("my-tool");
		});

		it("should throw error if source directory not found", async () => {
			const lister = new EntityLister(toolsConfig);

			await expect(lister.discoverEntities(testDir, false)).rejects.toThrow(
				"src/tools/ directory not found",
			);
		});

		it("should detect registration status", async () => {
			const toolsDir = join(testDir, "src", "tools");
			await mkdir(toolsDir, { recursive: true });
			await writeFile(join(toolsDir, "registered-tool.ts"), "// tool code");
			await writeFile(join(toolsDir, "unregistered-tool.ts"), "// tool code");

			const indexPath = join(testDir, "src", "index.ts");
			await writeFile(
				indexPath,
				"registerRegisteredToolTool(this.server);",
			);

			const lister = new EntityLister(toolsConfig);
			const entities = await lister.discoverEntities(testDir, false);

			const registered = entities.find((e) => e.name === "registered-tool");
			const unregistered = entities.find(
				(e) => e.name === "unregistered-tool",
			);

			expect(registered?.registered).toBe(true);
			expect(unregistered?.registered).toBe(false);
		});

		it("should detect unit test presence", async () => {
			const toolsDir = join(testDir, "src", "tools");
			await mkdir(toolsDir, { recursive: true});
			await writeFile(join(toolsDir, "with-test.ts"), "// tool code");
			await writeFile(join(toolsDir, "without-test.ts"), "// tool code");

			const testDir2 = join(testDir, "test", "unit", "tools");
			await mkdir(testDir2, { recursive: true });
			await writeFile(join(testDir2, "with-test.test.ts"), "// test");

			const indexPath = join(testDir, "src", "index.ts");
			await writeFile(indexPath, "");

			const lister = new EntityLister(toolsConfig);
			const entities = await lister.discoverEntities(testDir, false);

			const withTest = entities.find((e) => e.name === "with-test");
			const withoutTest = entities.find((e) => e.name === "without-test");

			expect(withTest?.hasUnitTest).toBe(true);
			expect(withoutTest?.hasUnitTest).toBe(false);
		});

		it("should detect integration test presence", async () => {
			const toolsDir = join(testDir, "src", "tools");
			await mkdir(toolsDir, { recursive: true });
			await writeFile(join(toolsDir, "with-test.ts"), "// tool code");
			await writeFile(join(toolsDir, "without-test.ts"), "// tool code");

			const integrationDir = join(testDir, "test", "integration", "specs");
			await mkdir(integrationDir, { recursive: true });
			await writeFile(join(integrationDir, "with-test.yaml"), "# test");

			const indexPath = join(testDir, "src", "index.ts");
			await writeFile(indexPath, "");

			const lister = new EntityLister(toolsConfig);
			const entities = await lister.discoverEntities(testDir, false);

			const withTest = entities.find((e) => e.name === "with-test");
			const withoutTest = entities.find((e) => e.name === "without-test");

			expect(withTest?.hasIntegrationTest).toBe(true);
			expect(withoutTest?.hasIntegrationTest).toBe(false);
		});

		it("should extract description from tool file", async () => {
			const toolsDir = join(testDir, "src", "tools");
			await mkdir(toolsDir, { recursive: true });
			await writeFile(
				join(toolsDir, "my-tool.ts"),
				`server.tool("my-tool", "This is a test tool", schema, async (params) => {});`,
			);

			const indexPath = join(testDir, "src", "index.ts");
			await writeFile(indexPath, "");

			const lister = new EntityLister(toolsConfig);
			const entities = await lister.discoverEntities(testDir, false);

			expect(entities[0].description).toBe("This is a test tool");
		});
	});

	describe("checkRegistrations()", () => {
		it("should find registered tools", async () => {
			const indexPath = join(testDir, "index.ts");
			await writeFile(
				indexPath,
				`
				registerMyToolTool(this.server);
				registerAnotherToolTool(this.server);
			`,
			);

			const lister = new EntityLister(toolsConfig);
			const registered = await lister.checkRegistrations(indexPath);

			expect(registered).toContain("my-tool");
			expect(registered).toContain("another-tool");
		});

		it("should handle missing index.ts", async () => {
			const lister = new EntityLister(toolsConfig);
			const registered = await lister.checkRegistrations(
				join(testDir, "non-existent.ts"),
			);

			expect(registered).toEqual([]);
		});

		it("should work with different entity types", async () => {
			const promptsConfig: EntityConfig = {
				...toolsConfig,
				entityType: "prompt",
				entityTypePlural: "prompts",
				registrationPattern: /register(\w+)Prompt\(this\.server\)/g,
			};

			const indexPath = join(testDir, "index.ts");
			await writeFile(
				indexPath,
				`
				registerMyPromptPrompt(this.server);
				registerAnotherPromptPrompt(this.server);
			`,
			);

			const lister = new EntityLister(promptsConfig);
			const registered = await lister.checkRegistrations(indexPath);

			expect(registered).toContain("my-prompt");
			expect(registered).toContain("another-prompt");
		});
	});

	describe("filterEntities()", () => {
		let entities: EntityInfo[];

		beforeEach(() => {
			entities = [
				{
					name: "registered-tested",
					file: "src/tools/registered-tested.ts",
					registered: true,
					hasUnitTest: true,
					hasIntegrationTest: true,
				},
				{
					name: "registered-untested",
					file: "src/tools/registered-untested.ts",
					registered: true,
					hasUnitTest: false,
					hasIntegrationTest: false,
				},
				{
					name: "unregistered-tested",
					file: "src/tools/unregistered-tested.ts",
					registered: false,
					hasUnitTest: true,
					hasIntegrationTest: false,
				},
				{
					name: "unregistered-untested",
					file: "src/tools/unregistered-untested.ts",
					registered: false,
					hasUnitTest: false,
					hasIntegrationTest: false,
				},
			];
		});

		it("should filter by 'all'", () => {
			const lister = new EntityLister(toolsConfig);
			const filtered = lister.filterEntities(entities, "all");

			expect(filtered).toHaveLength(4);
		});

		it("should filter by 'registered'", () => {
			const lister = new EntityLister(toolsConfig);
			const filtered = lister.filterEntities(entities, "registered");

			expect(filtered).toHaveLength(2);
			expect(filtered.every((e) => e.registered)).toBe(true);
		});

		it("should filter by 'unregistered'", () => {
			const lister = new EntityLister(toolsConfig);
			const filtered = lister.filterEntities(entities, "unregistered");

			expect(filtered).toHaveLength(2);
			expect(filtered.every((e) => !e.registered)).toBe(true);
		});

		it("should filter by 'tested'", () => {
			const lister = new EntityLister(toolsConfig);
			const filtered = lister.filterEntities(entities, "tested");

			expect(filtered).toHaveLength(2);
			expect(
				filtered.every((e) => e.hasUnitTest || e.hasIntegrationTest),
			).toBe(true);
		});

		it("should filter by 'untested'", () => {
			const lister = new EntityLister(toolsConfig);
			const filtered = lister.filterEntities(entities, "untested");

			expect(filtered).toHaveLength(2);
			expect(
				filtered.every((e) => !e.hasUnitTest && !e.hasIntegrationTest),
			).toBe(true);
		});

		it("should handle case-insensitive filter", () => {
			const lister = new EntityLister(toolsConfig);
			const filtered = lister.filterEntities(entities, "REGISTERED");

			expect(filtered).toHaveLength(2);
		});

		it("should default to 'all' for unknown filter", () => {
			const lister = new EntityLister(toolsConfig);
			const filtered = lister.filterEntities(entities, "unknown");

			expect(filtered).toHaveLength(4);
		});
	});

	describe("printTable()", () => {
		it("should handle empty list", () => {
			const consoleSpy = vi.spyOn(console, "log");
			const lister = new EntityLister(toolsConfig);

			lister.printTable([]);

			expect(consoleSpy).toHaveBeenCalledWith("No tools found.\n");
			consoleSpy.mockRestore();
		});

		it("should print table with entities", () => {
			const consoleSpy = vi.spyOn(console, "log");
			const lister = new EntityLister(toolsConfig);

			const entities: EntityInfo[] = [
				{
					name: "my-tool",
					file: "src/tools/my-tool.ts",
					registered: true,
					hasUnitTest: true,
					hasIntegrationTest: true,
					description: "Test tool",
				},
			];

			lister.printTable(entities);

			expect(consoleSpy).toHaveBeenCalled();
			const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");

			expect(output).toContain("Found 1 tool:");
			expect(output).toContain("my-tool");
			expect(output).toContain("Summary:");
			expect(output).toContain("Registered:       1/1");

			consoleSpy.mockRestore();
		});

		it("should use plural form for multiple entities", () => {
			const consoleSpy = vi.spyOn(console, "log");
			const lister = new EntityLister(toolsConfig);

			const entities: EntityInfo[] = [
				{
					name: "tool1",
					file: "src/tools/tool1.ts",
					registered: true,
					hasUnitTest: true,
					hasIntegrationTest: true,
				},
				{
					name: "tool2",
					file: "src/tools/tool2.ts",
					registered: false,
					hasUnitTest: false,
					hasIntegrationTest: false,
				},
			];

			lister.printTable(entities);

			const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
			expect(output).toContain("Found 2 tools:");

			consoleSpy.mockRestore();
		});

		it("should show checkmarks for registered/tested entities", () => {
			const consoleSpy = vi.spyOn(console, "log");
			const lister = new EntityLister(toolsConfig);

			const entities: EntityInfo[] = [
				{
					name: "my-tool",
					file: "src/tools/my-tool.ts",
					registered: true,
					hasUnitTest: true,
					hasIntegrationTest: true,
				},
			];

			lister.printTable(entities);

			const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
			expect(output).toContain("✓");

			consoleSpy.mockRestore();
		});

		it("should show X marks for unregistered/untested entities", () => {
			const consoleSpy = vi.spyOn(console, "log");
			const lister = new EntityLister(toolsConfig);

			const entities: EntityInfo[] = [
				{
					name: "my-tool",
					file: "src/tools/my-tool.ts",
					registered: false,
					hasUnitTest: false,
					hasIntegrationTest: false,
				},
			];

			lister.printTable(entities);

			const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
			expect(output).toContain("✗");

			consoleSpy.mockRestore();
		});

		it("should show description if available", () => {
			const consoleSpy = vi.spyOn(console, "log");
			const lister = new EntityLister(toolsConfig);

			const entities: EntityInfo[] = [
				{
					name: "my-tool",
					file: "src/tools/my-tool.ts",
					registered: true,
					hasUnitTest: true,
					hasIntegrationTest: true,
					description: "Test description",
				},
			];

			lister.printTable(entities);

			const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
			expect(output).toContain("Test description");

			consoleSpy.mockRestore();
		});

		it("should not show 'No description' message", () => {
			const consoleSpy = vi.spyOn(console, "log");
			const lister = new EntityLister(toolsConfig);

			const entities: EntityInfo[] = [
				{
					name: "my-tool",
					file: "src/tools/my-tool.ts",
					registered: true,
					hasUnitTest: true,
					hasIntegrationTest: true,
					description: "No description",
				},
			];

			lister.printTable(entities);

			const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
			expect(output).not.toContain("No description");

			consoleSpy.mockRestore();
		});
	});
});
