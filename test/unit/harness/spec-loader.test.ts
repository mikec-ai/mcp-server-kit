/**
 * Unit Tests for Spec Loader
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
	loadTestSpec,
	loadTestSuiteSpec,
	parseTestSpec,
	serializeTestSpecToYAML,
	serializeTestSpecToJSON,
} from "../../../src/harness/spec-loader.js";
import type { TestSpec, TestSuiteSpec } from "../../../src/harness/types/spec.js";

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

	it("should include error message in validation failure", async () => {
		const invalidPath = join(tempDir, "validation-fail.json");
		await writeFile(invalidPath, JSON.stringify({ name: "Missing required fields" }));

		try {
			await loadTestSpec(invalidPath);
			expect.fail("Should have thrown error");
		} catch (error) {
			if (error instanceof Error) {
				expect(error.message).toContain("Invalid test spec");
				expect(error.message).toContain("validation-fail.json");
			}
		}

		await unlink(invalidPath);
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

describe("loadTestSuiteSpec", () => {
	const tempDir = tmpdir();
	const validSuite: TestSuiteSpec = {
		name: "Test Suite",
		tests: [
			{
				name: "Test 1",
				tool: "test_tool",
				arguments: { param: "value" },
				assertions: [{ type: "success" }],
			},
			{
				name: "Test 2",
				tool: "another_tool",
				arguments: {},
				assertions: [{ type: "success" }],
			},
		],
	};

	let yamlSuitePath: string;
	let jsonSuitePath: string;
	let invalidSuitePath: string;
	let unsupportedSuitePath: string;

	beforeAll(async () => {
		yamlSuitePath = join(tempDir, "test-suite.yaml");
		jsonSuitePath = join(tempDir, "test-suite.json");
		invalidSuitePath = join(tempDir, "invalid-suite.yaml");
		unsupportedSuitePath = join(tempDir, "suite.txt");

		await writeFile(
			yamlSuitePath,
			`name: "Test Suite"
tests:
  - name: "Test 1"
    tool: "test_tool"
    arguments:
      param: "value"
    assertions:
      - type: "success"
  - name: "Test 2"
    tool: "another_tool"
    arguments: {}
    assertions:
      - type: "success"`,
		);

		await writeFile(jsonSuitePath, JSON.stringify(validSuite));
		await writeFile(invalidSuitePath, "invalid: [suite content");
		await writeFile(unsupportedSuitePath, "Plain text");
	});

	afterAll(async () => {
		await Promise.all([
			unlink(yamlSuitePath).catch(() => {}),
			unlink(jsonSuitePath).catch(() => {}),
			unlink(invalidSuitePath).catch(() => {}),
			unlink(unsupportedSuitePath).catch(() => {}),
		]);
	});

	it("should load valid YAML test suite", async () => {
		const suite = await loadTestSuiteSpec(yamlSuitePath);

		expect(suite.name).toBe("Test Suite");
		expect(suite.tests).toHaveLength(2);
		expect(suite.tests[0].name).toBe("Test 1");
		expect(suite.tests[1].name).toBe("Test 2");
	});

	it("should load valid JSON test suite", async () => {
		const suite = await loadTestSuiteSpec(jsonSuitePath);

		expect(suite.name).toBe("Test Suite");
		expect(suite.tests).toHaveLength(2);
		expect(suite.tests[0].tool).toBe("test_tool");
		expect(suite.tests[1].tool).toBe("another_tool");
	});

	it("should throw error for unsupported file format", async () => {
		await expect(loadTestSuiteSpec(unsupportedSuitePath)).rejects.toThrow(
			"Unsupported file format",
		);
	});

	it("should throw error for non-existent file", async () => {
		await expect(
			loadTestSuiteSpec(join(tempDir, "nonexistent-suite.yaml")),
		).rejects.toThrow();
	});

	it("should throw error for invalid test suite spec", async () => {
		const invalidPath = join(tempDir, "invalid-structure.yaml");
		await writeFile(
			invalidPath,
			`name: "Suite"
tests: "not an array"`,
		);

		await expect(loadTestSuiteSpec(invalidPath)).rejects.toThrow(
			"Invalid test suite spec",
		);

		await unlink(invalidPath);
	});

	it("should handle .yml extension for test suites", async () => {
		const ymlPath = join(tempDir, "suite.yml");
		await writeFile(
			ymlPath,
			`name: "YML Suite"
tests:
  - name: "Test"
    tool: "tool"
    arguments: {}
    assertions:
      - type: "success"`,
		);

		const suite = await loadTestSuiteSpec(ymlPath);
		expect(suite.name).toBe("YML Suite");
		expect(suite.tests).toHaveLength(1);

		await unlink(ymlPath);
	});

	it("should include error message in validation failure", async () => {
		const invalidPath = join(tempDir, "validation-error.json");
		await writeFile(invalidPath, JSON.stringify({ name: "Missing tests field" }));

		try {
			await loadTestSuiteSpec(invalidPath);
			expect.fail("Should have thrown error");
		} catch (error) {
			if (error instanceof Error) {
				expect(error.message).toContain("Invalid test suite spec");
				expect(error.message).toContain("validation-error.json");
			}
		}

		await unlink(invalidPath);
	});
});
