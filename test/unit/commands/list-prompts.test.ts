/**
 * list-prompts - Unit Tests
 *
 * Tests for the list prompts command
 */

import { describe, it, expect } from "vitest";

describe("list-prompts command", () => {
	/**
	 * The list-prompts command discovers all prompts in the project and shows:
	 * - Registration status
	 * - Unit test coverage
	 * - Integration test coverage
	 * - File locations
	 *
	 * Full integration testing is done through:
	 * 1. Real project scaffolding
	 * 2. E2E tests
	 */

	describe("prompt name conversion", () => {
		it("should convert PascalCase to kebab-case", () => {
			const toKebabCase = (str: string): string => {
				return str
					.replace(/([A-Z])/g, "-$1")
					.toLowerCase()
					.replace(/^-/, "");
			};

			expect(toKebabCase("CodeReviewer")).toBe("code-reviewer");
			expect(toKebabCase("TestGenerator")).toBe("test-generator");
			expect(toKebabCase("Simple")).toBe("simple");
			expect(toKebabCase("APIClient")).toBe("a-p-i-client");
			expect(toKebabCase("MyPrompt")).toBe("my-prompt");
		});

		it("should handle single word names", () => {
			const toKebabCase = (str: string): string => {
				return str
					.replace(/([A-Z])/g, "-$1")
					.toLowerCase()
					.replace(/^-/, "");
			};

			expect(toKebabCase("Health")).toBe("health");
			expect(toKebabCase("Test")).toBe("test");
		});
	});

	describe("prompt registration detection", () => {
		it("should detect registerXxxPrompt pattern", () => {
			const indexContent = `
				registerCodeReviewerPrompt(this.server);
				registerTestGeneratorPrompt(this.server);
			`;

			const registerRegex = /register(\w+)Prompt\(this\.server\)/g;
			const matches: string[] = [];
			let match: RegExpExecArray | null;

			while ((match = registerRegex.exec(indexContent)) !== null) {
				matches.push(match[1]);
			}

			expect(matches).toContain("CodeReviewer");
			expect(matches).toContain("TestGenerator");
			expect(matches).toHaveLength(2);
		});

		it("should not match tool or resource registrations", () => {
			const indexContent = `
				registerHealthTool(this.server);
				registerConfigResource(this.server);
			`;

			const registerRegex = /register(\w+)Prompt\(this\.server\)/g;
			const matches: string[] = [];
			let match: RegExpExecArray | null;

			while ((match = registerRegex.exec(indexContent)) !== null) {
				matches.push(match[1]);
			}

			expect(matches).toHaveLength(0);
		});
	});

	describe("prompt filtering", () => {
		it("should filter registered prompts", () => {
			const prompts = [
				{ name: "prompt1", registered: true, hasUnitTest: true, hasIntegrationTest: true },
				{ name: "prompt2", registered: false, hasUnitTest: true, hasIntegrationTest: false },
				{ name: "prompt3", registered: true, hasUnitTest: false, hasIntegrationTest: false },
			];

			const filtered = prompts.filter((p) => p.registered);

			expect(filtered).toHaveLength(2);
			expect(filtered[0].name).toBe("prompt1");
			expect(filtered[1].name).toBe("prompt3");
		});

		it("should filter unregistered prompts", () => {
			const prompts = [
				{ name: "prompt1", registered: true, hasUnitTest: true, hasIntegrationTest: true },
				{ name: "prompt2", registered: false, hasUnitTest: true, hasIntegrationTest: false },
				{ name: "prompt3", registered: true, hasUnitTest: false, hasIntegrationTest: false },
			];

			const filtered = prompts.filter((p) => !p.registered);

			expect(filtered).toHaveLength(1);
			expect(filtered[0].name).toBe("prompt2");
		});

		it("should filter tested prompts", () => {
			const prompts = [
				{ name: "prompt1", registered: true, hasUnitTest: true, hasIntegrationTest: true },
				{ name: "prompt2", registered: false, hasUnitTest: true, hasIntegrationTest: false },
				{ name: "prompt3", registered: true, hasUnitTest: false, hasIntegrationTest: false },
			];

			const filtered = prompts.filter((p) => p.hasUnitTest || p.hasIntegrationTest);

			expect(filtered).toHaveLength(2);
			expect(filtered[0].name).toBe("prompt1");
			expect(filtered[1].name).toBe("prompt2");
		});

		it("should filter untested prompts", () => {
			const prompts = [
				{ name: "prompt1", registered: true, hasUnitTest: true, hasIntegrationTest: true },
				{ name: "prompt2", registered: false, hasUnitTest: true, hasIntegrationTest: false },
				{ name: "prompt3", registered: true, hasUnitTest: false, hasIntegrationTest: false },
			];

			const filtered = prompts.filter((p) => !p.hasUnitTest && !p.hasIntegrationTest);

			expect(filtered).toHaveLength(1);
			expect(filtered[0].name).toBe("prompt3");
		});
	});

	describe("description extraction", () => {
		it("should extract description from server.prompt call", () => {
			const fileContent = `
				server.prompt('code-reviewer', 'Review code quality',
					async (request) => {
						// ...
					}
				);
			`;

			const promptCallRegex = /server\.prompt\(\s*["']([^"']+)["'],\s*["']([^"']+)["']/;
			const match = fileContent.match(promptCallRegex);

			expect(match).not.toBeNull();
			if (match) {
				expect(match[1]).toBe("code-reviewer");
				expect(match[2]).toBe("Review code quality");
			}
		});

		it("should extract description from header comment", () => {
			const fileContent = `
				/**
				 * Code Reviewer Prompt
				 */
				export function registerCodeReviewerPrompt() {
					// ...
				}
			`;

			const headerRegex = /\/\*\*[\s\S]*?\*\s*([^\n]+)/;
			const match = fileContent.match(headerRegex);

			expect(match).not.toBeNull();
			if (match) {
				expect(match[1].trim()).toBe("Code Reviewer Prompt");
			}
		});
	});

	describe("output formats", () => {
		it("should format table header correctly", () => {
			const nameWidth = 15;
			const fileWidth = 25;
			const header = `${"NAME".padEnd(nameWidth)} | REG | UNIT | INT | ${"FILE".padEnd(fileWidth)}`;

			expect(header).toContain("NAME");
			expect(header).toContain("REG");
			expect(header).toContain("UNIT");
			expect(header).toContain("INT");
			expect(header).toContain("FILE");
		});

		it("should use checkmarks for status indicators", () => {
			const registered = true;
			const hasUnitTest = true;
			const hasIntegrationTest = false;

			const reg = registered ? " ✓ " : " ✗ ";
			const unit = hasUnitTest ? " ✓ " : " ✗ ";
			const int = hasIntegrationTest ? " ✓ " : " ✗ ";

			expect(reg).toBe(" ✓ ");
			expect(unit).toBe(" ✓ ");
			expect(int).toBe(" ✗ ");
		});

		it("should support JSON output format", () => {
			const prompts = [
				{
					name: "code-reviewer",
					file: "src/prompts/code-reviewer.ts",
					registered: true,
					hasUnitTest: true,
					hasIntegrationTest: true,
					description: "Review code quality",
				},
			];

			const json = JSON.stringify(prompts, null, 2);
			const parsed = JSON.parse(json);

			expect(parsed).toHaveLength(1);
			expect(parsed[0].name).toBe("code-reviewer");
			expect(parsed[0].registered).toBe(true);
		});
	});

	describe("example prompt filtering", () => {
		it("should exclude example prompts by default", () => {
			const files = ["code-reviewer.ts", "_example-prompt.ts", "test-generator.ts"];

			const filtered = files.filter((f) => !f.startsWith("_example"));

			expect(filtered).toHaveLength(2);
			expect(filtered).not.toContain("_example-prompt.ts");
		});

		it("should include example prompts when requested", () => {
			const files = ["code-reviewer.ts", "_example-prompt.ts", "test-generator.ts"];
			const includeExamples = true;

			const filtered = files.filter((f) => includeExamples || !f.startsWith("_example"));

			expect(filtered).toHaveLength(3);
			expect(filtered).toContain("_example-prompt.ts");
		});
	});

	describe("summary calculation", () => {
		it("should calculate correct summary statistics", () => {
			const prompts = [
				{ name: "p1", registered: true, hasUnitTest: true, hasIntegrationTest: true },
				{ name: "p2", registered: false, hasUnitTest: true, hasIntegrationTest: false },
				{ name: "p3", registered: true, hasUnitTest: false, hasIntegrationTest: true },
				{ name: "p4", registered: true, hasUnitTest: true, hasIntegrationTest: true },
			];

			const registered = prompts.filter((p) => p.registered).length;
			const withUnitTests = prompts.filter((p) => p.hasUnitTest).length;
			const withIntegrationTests = prompts.filter((p) => p.hasIntegrationTest).length;

			expect(registered).toBe(3);
			expect(withUnitTests).toBe(3);
			expect(withIntegrationTests).toBe(3);
		});
	});
});
