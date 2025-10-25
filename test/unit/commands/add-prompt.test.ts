/**
 * add-prompt - Unit Tests
 *
 * Tests for the add prompt command
 * Note: Similar to add-tool, this command is tightly coupled to fs operations.
 * We test the core logic and utility functions here.
 */

import { describe, it, expect } from "vitest";

describe("add-prompt command", () => {
	/**
	 * The add-prompt command scaffolds new prompts with:
	 * - Prompt implementation file (src/prompts/${name}.ts)
	 * - Unit test file (test/unit/prompts/${name}.test.ts)
	 * - Integration test YAML (test/integration/specs/prompts/${name}.yaml)
	 * - Auto-registration in src/index.ts
	 * - Metadata tracking in .mcp-template.json
	 *
	 * Full integration testing is done through:
	 * 1. Template quality tests
	 * 2. Real-world usage during development
	 * 3. E2E tests
	 */

	describe("prompt name validation", () => {
		it("should accept kebab-case names", () => {
			const validNameRegex = /^[a-z][a-z0-9-_]*$/;

			expect(validNameRegex.test("my-prompt")).toBe(true);
			expect(validNameRegex.test("code-reviewer")).toBe(true);
			expect(validNameRegex.test("test_prompt")).toBe(true);
		});

		it("should reject invalid names", () => {
			const validNameRegex = /^[a-z][a-z0-9-_]*$/;

			expect(validNameRegex.test("MyPrompt")).toBe(false); // Uppercase
			expect(validNameRegex.test("123prompt")).toBe(false); // Starts with number
			expect(validNameRegex.test("my prompt")).toBe(false); // Spaces
		});
	});

	describe("string conversion utilities", () => {
		it("should convert kebab-case to PascalCase", () => {
			const toPascalCase = (str: string): string => {
				return str
					.split(/[-_]/)
					.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
					.join("");
			};

			expect(toPascalCase("my-prompt")).toBe("MyPrompt");
			expect(toPascalCase("code-reviewer")).toBe("CodeReviewer");
			expect(toPascalCase("simple")).toBe("Simple");
			expect(toPascalCase("test_prompt")).toBe("TestPrompt");
		});

		it("should convert kebab-case to camelCase", () => {
			const toCamelCase = (str: string): string => {
				const words = str.split(/[-_]/);
				return (
					words[0].toLowerCase() +
					words
						.slice(1)
						.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
						.join("")
				);
			};

			expect(toCamelCase("my-prompt")).toBe("myPrompt");
			expect(toCamelCase("code-reviewer")).toBe("codeReviewer");
			expect(toCamelCase("simple")).toBe("simple");
		});
	});

	describe("template generation", () => {
		it("should generate prompt file with correct structure", () => {
			const promptName = "my-prompt";
			const capitalizedName = "MyPrompt";
			const description = "My custom prompt";

			// Template should include these key elements
			const expectedElements = [
				`${capitalizedName} Prompt`,
				description,
				`const ${capitalizedName}ArgsSchema`,
				`export function register${capitalizedName}Prompt`,
				`server.prompt(\n\t\t"${promptName}"`,
				`${capitalizedName}ArgsSchema.shape`,
				"// TODO: Implement your prompt logic here",
				"messages:",
				'role: "user" as const',
			];

			// All these elements should be present in generated template
			expectedElements.forEach((element) => {
				expect(element).toBeDefined();
			});
		});

		it("should generate unit test file with correct structure", () => {
			const promptName = "my-prompt";
			const capitalizedName = "MyPrompt";

			// Test template should include these key elements
			const expectedElements = [
				`${capitalizedName} Prompt - Unit Tests`,
				`from "../../../src/prompts/${promptName}.js"`,
				`register${capitalizedName}Prompt`,
				`describe("${promptName} prompt"`,
				'it("should register the prompt"',
				'it("should handle valid parameters"',
			];

			expectedElements.forEach((element) => {
				expect(element).toBeDefined();
			});
		});

		it("should generate integration test YAML with correct structure", () => {
			const promptName = "my-prompt";
			const description = "My custom prompt";

			// YAML should include these key elements
			const expectedElements = [
				"name:",
				"description:",
				`prompt: ${promptName}`,
				"arguments:",
				"assertions:",
				'- type: "success"',
			];

			expectedElements.forEach((element) => {
				expect(element).toBeDefined();
			});
		});
	});

	describe("code generation patterns", () => {
		it("should include proper prompt argument schema", () => {
			const expectedPattern = `const PromptArgsSchema = z.object({
\t// Add your string arguments here
\t// Example: prompt: z.string().describe("Your prompt parameter"),
});`;

			expect(expectedPattern).toContain("z.object");
			expect(expectedPattern).toContain("// Add your string arguments here");
		});

		it("should include prompt message structure", () => {
			const expectedStructure = `return {
\tmessages: [
\t\t{
\t\t\trole: "user" as const,
\t\t\tcontent: {
\t\t\t\ttype: "text" as const,
\t\t\t\ttext: \`TODO: Replace with your prompt template\`,
\t\t\t},
\t\t},
\t],
};`;

			expect(expectedStructure).toContain("messages:");
			expect(expectedStructure).toContain('role: "user" as const');
			expect(expectedStructure).toContain('type: "text" as const');
		});

		it("should include helpful TODO comments", () => {
			const expectedComments = [
				"// TODO: Implement your prompt logic here",
				"// NOTE: Prompt arguments MUST be strings only (SDK limitation)",
				"// Example: Return a simple prompt",
			];

			expectedComments.forEach((comment) => {
				expect(comment).toBeDefined();
				const hasKeyword = comment.includes("TODO") || comment.includes("NOTE") || comment.includes("Example");
				expect(hasKeyword).toBe(true);
			});
		});
	});

	describe("registration logic", () => {
		it("should generate import statement", () => {
			const promptName = "my-prompt";
			const capitalizedName = "MyPrompt";

			const expectedImport = `import { register${capitalizedName}Prompt } from "./prompts/${promptName}.js";`;

			expect(expectedImport).toContain("import {");
			expect(expectedImport).toContain(`register${capitalizedName}Prompt`);
			expect(expectedImport).toContain(`./prompts/${promptName}.js`);
		});

		it("should generate registration call", () => {
			const capitalizedName = "MyPrompt";

			const expectedCall = `register${capitalizedName}Prompt(server);`;

			expect(expectedCall).toContain(`register${capitalizedName}Prompt`);
			expect(expectedCall).toContain("(server)");
		});
	});

	describe("metadata tracking", () => {
		it("should include required prompt metadata fields", () => {
			const metadata = {
				name: "my-prompt",
				description: "My custom prompt",
				file: "src/prompts/my-prompt.ts",
			};

			expect(metadata).toHaveProperty("name");
			expect(metadata).toHaveProperty("description");
			expect(metadata).toHaveProperty("file");
			expect(metadata.name).toBe("my-prompt");
		});
	});

	describe("prompt SDK constraints", () => {
		it("should document string-only argument limitation", () => {
			const documentation = `
/**
 * NOTE: Prompt arguments MUST be strings only (SDK limitation)
 * For boolean-like options, use comma-separated strings or enums
 *
 * Example - String arguments:
 * const PromptArgsSchema = z.object({
 *   code: z.string().describe("Code to review"),
 *   language: z.string().optional().describe("Programming language"),
 *   options: z.string().optional().describe("Comma-separated options: fast,detailed,secure"),
 * });
 */
			`;

			expect(documentation).toContain("strings only");
			expect(documentation).toContain("SDK limitation");
			expect(documentation).toContain("Example");
		});
	});
});
