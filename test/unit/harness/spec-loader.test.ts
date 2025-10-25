/**
 * Unit Tests for Spec Loader
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
	loadTestSpec,
	parseTestSpec,
	serializeTestSpecToYAML,
	serializeTestSpecToJSON,
} from "../../../src/harness/spec-loader.ts";
import type { TestSpec } from "../types/spec.js";

describe("loadTestSpec", () => {
	const tempDir = tmpdir();
	const validSpec: TestSpec = {
		name: "Test name",
		tool: "test_tool",
		arguments: { param: "value" },
		assertions: [{ type: "success" }],
	};

	let yamlFilePath: string;
	let jsonFilePath: string;
	let invalidYamlPath: string;
	let unsupportedPath: string;

	beforeAll(async () => {
		// Create test files
		yamlFilePath = join(tempDir, "test-spec.yaml");
		jsonFilePath = join(tempDir, "test-spec.json");
		invalidYamlPath = join(tempDir, "invalid.yaml");
		unsupportedPath = join(tempDir, "test.txt");

		await writeFile(
			yamlFilePath,
			`name: "Test name"
tool: "test_tool"
arguments:
  param: "value"
assertions:
  - type: "success"`,
		);

		await writeFile(
			jsonFilePath,
			JSON.stringify({
				name: "Test name",
				tool: "test_tool",
				arguments: { param: "value" },
				assertions: [{ type: "success" }],
			}),
		);

		await writeFile(invalidYamlPath, "invalid: yaml: content: [unclosed");
		await writeFile(unsupportedPath, "Plain text file");
	});

	afterAll(async () => {
		// Clean up test files
		await Promise.all([
			unlink(yamlFilePath).catch(() => {}),
			unlink(jsonFilePath).catch(() => {}),
			unlink(invalidYamlPath).catch(() => {}),
			unlink(unsupportedPath).catch(() => {}),
		]);
	});

	it("should load valid YAML file", async () => {
		const spec = await loadTestSpec(yamlFilePath);

		expect(spec.name).toBe("Test name");
		expect(spec.tool).toBe("test_tool");
		expect(spec.arguments).toEqual({ param: "value" });
		expect(spec.assertions).toHaveLength(1);
	});

	it("should load valid JSON file", async () => {
		const spec = await loadTestSpec(jsonFilePath);

		expect(spec.name).toBe("Test name");
		expect(spec.tool).toBe("test_tool");
		expect(spec.arguments).toEqual({ param: "value" });
		expect(spec.assertions).toHaveLength(1);
	});

	it("should throw error for unsupported file format", async () => {
		await expect(loadTestSpec(unsupportedPath)).rejects.toThrow("Unsupported file format");
	});

	it("should throw error for non-existent file", async () => {
		await expect(loadTestSpec(join(tempDir, "nonexistent.yaml"))).rejects.toThrow();
	});

	it("should throw error for malformed YAML", async () => {
		await expect(loadTestSpec(invalidYamlPath)).rejects.toThrow();
	});

	it("should handle .yml extension", async () => {
		const ymlPath = join(tempDir, "test.yml");
		await writeFile(
			ymlPath,
			`name: "Test"
tool: "tool"
arguments: {}
assertions:
  - type: "success"`,
		);

		const spec = await loadTestSpec(ymlPath);
		expect(spec.name).toBe("Test");

		await unlink(ymlPath);
	});
});

describe("parseTestSpec", () => {
	it("should parse valid YAML string", () => {
		const yaml = `name: "Test"
tool: "test_tool"
arguments:
  key: "value"
assertions:
  - type: "success"`;

		const spec = parseTestSpec(yaml, "yaml");

		expect(spec.name).toBe("Test");
		expect(spec.tool).toBe("test_tool");
	});

	it("should parse valid JSON string", () => {
		const json = JSON.stringify({
			name: "Test",
			tool: "test_tool",
			arguments: {},
			assertions: [{ type: "success" }],
		});

		const spec = parseTestSpec(json, "json");

		expect(spec.name).toBe("Test");
	});

	it("should throw error for invalid YAML", () => {
		expect(() => parseTestSpec("invalid: [yaml", "yaml")).toThrow();
	});

	it("should throw error for invalid JSON", () => {
		expect(() => parseTestSpec("{invalid json}", "json")).toThrow();
	});

	it("should throw error for missing required fields", () => {
		const invalid = JSON.stringify({ name: "Test" }); // Missing tool, arguments, assertions

		expect(() => parseTestSpec(invalid, "json")).toThrow();
	});
});

describe("serializeTestSpecToYAML", () => {
	it("should serialize spec to YAML", () => {
		const spec: TestSpec = {
			name: "Test",
			tool: "test_tool",
			arguments: { key: "value" },
			assertions: [{ type: "success" }],
		};

		const yaml = serializeTestSpecToYAML(spec);

		expect(yaml).toContain("name: Test");
		expect(yaml).toContain("tool: test_tool");
		expect(yaml).toContain("type: success");
	});

	it("should handle complex nested objects", () => {
		const spec: TestSpec = {
			name: "Complex",
			tool: "tool",
			arguments: {
				nested: { deep: { value: 123 } },
				array: [1, 2, 3],
			},
			assertions: [{ type: "success" }],
		};

		const yaml = serializeTestSpecToYAML(spec);

		expect(yaml).toContain("nested:");
		expect(yaml).toContain("deep:");
	});
});

describe("serializeTestSpecToJSON", () => {
	it("should serialize spec to JSON with pretty print", () => {
		const spec: TestSpec = {
			name: "Test",
			tool: "test_tool",
			arguments: {},
			assertions: [{ type: "success" }],
		};

		const json = serializeTestSpecToJSON(spec, true);

		expect(json).toContain('"name": "Test"');
		expect(json).toContain('"tool": "test_tool"');
		expect(json).toContain("\n"); // Pretty printed
	});

	it("should serialize spec to compact JSON", () => {
		const spec: TestSpec = {
			name: "Test",
			tool: "test_tool",
			arguments: {},
			assertions: [{ type: "success" }],
		};

		const json = serializeTestSpecToJSON(spec, false);

		expect(json).not.toContain("\n"); // Compact
		expect(json).toContain('{"name":"Test"');
	});
});
