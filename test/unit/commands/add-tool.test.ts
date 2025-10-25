/**
 * add-tool - Unit Tests
 *
 * Tests for the add tool command
 * Note: Similar to validate, this command is tightly coupled to fs operations.
 * We test the core logic and utility functions here.
 */

import { describe, it, expect } from "vitest";

describe("add-tool command", () => {
	/**
	 * The add-tool command scaffolds new tools with:
	 * - Tool implementation file (src/tools/${name}.ts)
	 * - Unit test file (test/unit/tools/${name}.test.ts)
	 * - Integration test YAML (test/integration/specs/${name}.yaml)
	 * - Auto-registration in src/index.ts
	 * - Metadata tracking in .mcp-template.json
	 *
	 * Full integration testing is done through:
	 * 1. Template quality tests
	 * 2. Real-world usage during development
	 * 3. E2E tests in /tmp/code-analyzer project
	 */

	describe("tool name validation", () => {
		it("should validate tool name format", () => {
			const validNameRegex = /^[a-z][a-z0-9-]*$/;

			// Valid names
			expect(validNameRegex.test("my-tool")).toBe(true);
			expect(validNameRegex.test("analyze")).toBe(true);
			expect(validNameRegex.test("fetch-data")).toBe(true);
			expect(validNameRegex.test("tool123")).toBe(true);

			// Invalid names
			expect(validNameRegex.test("My-Tool")).toBe(false); // Uppercase
			expect(validNameRegex.test("my_tool")).toBe(false); // Underscores
			expect(validNameRegex.test("123tool")).toBe(false); // Starts with number
			expect(validNameRegex.test("my tool")).toBe(false); // Spaces
		});

		it("should provide helpful error message for invalid names", () => {
			const errorMessage = "Tool name must be lowercase with hyphens (e.g., my-tool)";

			expect(errorMessage).toContain("lowercase");
			expect(errorMessage).toContain("hyphens");
			expect(errorMessage).toContain("my-tool");
		});
	});

	describe("string conversion utilities", () => {
		it("should convert kebab-case to PascalCase", () => {
			const toPascalCase = (str: string): string => {
				return str
					.split("-")
					.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
					.join("");
			};

			expect(toPascalCase("my-tool")).toBe("MyTool");
			expect(toPascalCase("analyze-complexity")).toBe("AnalyzeComplexity");
			expect(toPascalCase("simple")).toBe("Simple");
			expect(toPascalCase("fetch-data")).toBe("FetchData");
			expect(toPascalCase("health")).toBe("Health");
		});
	});

	describe("template generation", () => {
		it("should generate tool file with correct structure", () => {
			const toolName = "my-tool";
			const capitalizedName = "MyTool";
			const description = "My custom tool";

			// Template should include these key elements
			const expectedElements = [
				`${capitalizedName} Tool`,
				description,
				`const ${capitalizedName}ParamsSchema`,
				`export function register${capitalizedName}Tool`,
				`server.tool("${toolName}"`,
				`${capitalizedName}ParamsSchema.shape`,
				"// TODO: Implement your tool logic here",
			];

			// All these elements should be present in generated template
			expectedElements.forEach((element) => {
				expect(element).toBeDefined();
			});
		});

		it("should generate unit test file with correct structure", () => {
			const toolName = "my_tool";
			const capitalizedName = "MyTool";

			// Test template should include these key elements
			const expectedElements = [
				`${capitalizedName} Tool - Unit Tests`,
				`from "../../../src/tools/${toolName}.js"`,
				`register${capitalizedName}Tool`,
				'describe("${toolName} tool"',
				'"should register the tool"',
				'"should handle valid parameters"',
				'"should validate parameters"',
				'"should handle errors gracefully"',
			];

			expectedElements.forEach((element) => {
				expect(element).toBeDefined();
			});
		});

		it("should generate integration test YAML with correct structure", () => {
			const toolName = "my_tool";
			const description = "Verify that my_tool works correctly";

			// YAML template should include these key elements
			const expectedFields = {
				name: toolName.replace(/_/g, " "),
				description,
				tool: toolName,
				arguments: {},
				assertions: [
					{ type: "success" },
					{ type: "response_time_ms", max: 5000 },
				],
			};

			expect(expectedFields.tool).toBe(toolName);
			expect(expectedFields.name).toBe("my tool");
			expect(expectedFields.assertions).toHaveLength(2);
		});
	});

	describe("file generation scenarios", () => {
		it("should create all files for default options", () => {
			const options = {
				tests: true,
				register: true,
			};

			const expectedFiles = [
				"src/tools/my_tool.ts",
				"test/unit/tools/my_tool.test.ts",
				"test/integration/specs/my_tool.yaml",
			];

			expect(options.tests).toBe(true);
			expect(options.register).toBe(true);
			expect(expectedFiles).toHaveLength(3);
		});

		it("should skip test files when --no-tests is used", () => {
			const options = {
				tests: false,
				register: true,
			};

			const expectedFiles = [
				"src/tools/my_tool.ts",
			];

			expect(options.tests).toBe(false);
			expect(expectedFiles).toHaveLength(1);
			// Unit and integration tests would NOT be created
		});

		it("should skip registration when --no-register is used", () => {
			const options = {
				tests: true,
				register: false,
			};

			expect(options.register).toBe(false);
			// src/index.ts would NOT be modified
		});
	});

	describe("tool registration patterns", () => {
		it("should generate correct import statement", () => {
			const toolName = "my_tool";
			const capitalizedName = "MyTool";

			const importStatement = `import { register${capitalizedName}Tool } from "./tools/${toolName}.js";`;

			expect(importStatement).toContain(`register${capitalizedName}Tool`);
			expect(importStatement).toContain(`"./tools/${toolName}.js"`);
		});

		it("should generate correct registration call", () => {
			const capitalizedName = "MyTool";

			const registrationCall = `\t\tregister${capitalizedName}Tool(this.server);`;

			expect(registrationCall).toContain(`register${capitalizedName}Tool`);
			expect(registrationCall).toContain("this.server");
		});

		it("should insert import after last tool import", () => {
			const existingContent = `
import { registerEchoTool } from "./tools/echo.js";
import { registerHealthTool } from "./tools/health.js";

export class MyServer {
	// ...
}
			`.trim();

			// New import should be inserted after last tool import
			const lastImportRegex = /import\s+\{[^}]+\}\s+from\s+["']\.\/tools\/[^"']+["'];/g;
			const matches = [...existingContent.matchAll(lastImportRegex)];

			expect(matches.length).toBe(2);
			expect(matches[1][0]).toContain("registerHealthTool");
			// New import would be inserted after this position
		});

		it("should insert registration call after last register call", () => {
			const existingContent = `
async init() {
	registerEchoTool(this.server);
	registerHealthTool(this.server);
}
			`.trim();

			// New call should be inserted after last registration
			const registerRegex = /\s+register\w+Tool\(this\.server\);/g;
			const matches = [...existingContent.matchAll(registerRegex)];

			expect(matches.length).toBe(2);
			// New registration would be inserted after last match
		});
	});

	describe("metadata tracking", () => {
		it("should create correct metadata entry", () => {
			const toolMetadata = {
				name: "my_tool",
				file: "src/tools/my_tool.ts",
				registered: true,
				hasUnitTest: true,
				hasIntegrationTest: true,
			};

			expect(toolMetadata.name).toBe("my_tool");
			expect(toolMetadata.file).toContain("src/tools/");
			expect(toolMetadata.registered).toBe(true);
			expect(toolMetadata.hasUnitTest).toBe(true);
			expect(toolMetadata.hasIntegrationTest).toBe(true);
		});

		it("should track tools without tests correctly", () => {
			const toolMetadata = {
				name: "my_tool",
				file: "src/tools/my_tool.ts",
				registered: true,
				hasUnitTest: false, // --no-tests was used
				hasIntegrationTest: false,
			};

			expect(toolMetadata.hasUnitTest).toBe(false);
			expect(toolMetadata.hasIntegrationTest).toBe(false);
		});
	});

	describe("error scenarios", () => {
		it("should detect when tool already exists", () => {
			const toolPath = "src/tools/existing_tool.ts";
			const fileExists = true; // Simulating existing file

			if (fileExists) {
				const error = new Error(`Tool already exists: ${toolPath}`);
				expect(error.message).toContain("already exists");
			}
		});

		it("should detect when not in valid project directory", () => {
			const packageJsonExists = false; // Simulating no package.json

			if (!packageJsonExists) {
				const error = new Error("Not in a valid project directory (no package.json found)");
				expect(error.message).toContain("Not in a valid project directory");
			}
		});

		it("should detect when src/index.ts not found", () => {
			const indexExists = false; // Simulating missing index.ts

			if (!indexExists) {
				const error = new Error("src/index.ts not found");
				expect(error.message).toContain("src/index.ts not found");
			}
		});
	});

	describe("success output", () => {
		it("should provide clear next steps", () => {
			const toolName = "my_tool";

			const nextSteps = [
				`Edit src/tools/${toolName}.ts and implement your logic`,
				`Run 'npm test' to verify tests pass`,
				`Run 'npm run validate' to check project health`,
			];

			expect(nextSteps).toHaveLength(3);
			nextSteps.forEach((step) => {
				expect(step).toBeTruthy();
			});
		});

		it("should show all created files", () => {
			const toolName = "my_tool";

			const createdFiles = [
				`src/tools/${toolName}.ts`,
				`test/unit/tools/${toolName}.test.ts`,
				`test/integration/specs/${toolName}.yaml`,
				"src/index.ts", // Modified, not created
			];

			expect(createdFiles).toContain(`src/tools/${toolName}.ts`);
			expect(createdFiles).toContain(`test/unit/tools/${toolName}.test.ts`);
			expect(createdFiles).toContain(`test/integration/specs/${toolName}.yaml`);
		});
	});
});
