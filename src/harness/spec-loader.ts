/**
 * Test Specification Loader
 *
 * Loads and validates test specifications from YAML or JSON files.
 *
 * Design: Fully portable, no project-specific dependencies
 */

import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { parse as parseYAML, stringify as stringifyYAML } from "yaml";
import { validateTestSpec, validateTestSuiteSpec } from "./validation/schemas.js";
import type { TestSpec, TestSuiteSpec } from "./types/spec.js";

/**
 * Load a test specification from a file
 *
 * Supports both YAML (.yaml, .yml) and JSON (.json) formats.
 *
 * @param filePath - Path to test spec file
 * @returns Validated TestSpec
 * @throws Error if file cannot be read or validation fails
 */
export async function loadTestSpec(filePath: string): Promise<TestSpec> {
	const content = await readFile(filePath, "utf-8");
	const ext = extname(filePath).toLowerCase();

	let data: unknown;

	if (ext === ".yaml" || ext === ".yml") {
		data = parseYAML(content);
	} else if (ext === ".json") {
		data = JSON.parse(content);
	} else {
		throw new Error(`Unsupported file format: ${ext}. Use .yaml, .yml, or .json`);
	}

	try {
		return validateTestSpec(data);
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Invalid test spec in ${filePath}: ${error.message}`);
		}
		throw error;
	}
}

/**
 * Load a test suite specification from a file
 *
 * @param filePath - Path to test suite spec file
 * @returns Validated TestSuiteSpec
 * @throws Error if file cannot be read or validation fails
 */
export async function loadTestSuiteSpec(filePath: string): Promise<TestSuiteSpec> {
	const content = await readFile(filePath, "utf-8");
	const ext = extname(filePath).toLowerCase();

	let data: unknown;

	if (ext === ".yaml" || ext === ".yml") {
		data = parseYAML(content);
	} else if (ext === ".json") {
		data = JSON.parse(content);
	} else {
		throw new Error(`Unsupported file format: ${ext}. Use .yaml, .yml, or .json`);
	}

	try {
		return validateTestSuiteSpec(data);
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Invalid test suite spec in ${filePath}: ${error.message}`);
		}
		throw error;
	}
}

/**
 * Parse a test spec from a string
 *
 * Useful for programmatic test generation.
 *
 * @param content - YAML or JSON string
 * @param format - Format of the content ('yaml' or 'json')
 * @returns Validated TestSpec
 */
export function parseTestSpec(content: string, format: "yaml" | "json"): TestSpec {
	let data: unknown;

	if (format === "yaml") {
		data = parseYAML(content);
	} else {
		data = JSON.parse(content);
	}

	return validateTestSpec(data);
}

/**
 * Serialize a test spec to YAML string
 *
 * @param spec - TestSpec object
 * @returns YAML string
 */
export function serializeTestSpecToYAML(spec: TestSpec): string {
	return stringifyYAML(spec);
}

/**
 * Serialize a test spec to JSON string
 *
 * @param spec - TestSpec object
 * @param pretty - Pretty print (default: true)
 * @returns JSON string
 */
export function serializeTestSpecToJSON(spec: TestSpec, pretty = true): string {
	return pretty ? JSON.stringify(spec, null, 2) : JSON.stringify(spec);
}
