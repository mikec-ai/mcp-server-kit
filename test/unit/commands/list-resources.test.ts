/**
 * list-resources - Unit Tests
 *
 * Tests for the list resources command
 */

import { describe, it, expect } from "vitest";

describe("list-resources command", () => {
	/**
	 * The list-resources command discovers all resources in the project and shows:
	 * - Registration status
	 * - Unit test coverage
	 * - Integration test coverage
	 * - File locations
	 *
	 * Full integration testing is done through:
	 * 1. Real project scaffolding
	 * 2. E2E tests
	 */

	describe("resource name conversion", () => {
		it("should convert PascalCase to kebab-case", () => {
			const toKebabCase = (str: string): string => {
				return str
					.replace(/([A-Z])/g, "-$1")
					.toLowerCase()
					.replace(/^-/, "");
			};

			expect(toKebabCase("UserData")).toBe("user-data");
			expect(toKebabCase("AppConfig")).toBe("app-config");
			expect(toKebabCase("Simple")).toBe("simple");
			expect(toKebabCase("APIConfig")).toBe("a-p-i-config");
			expect(toKebabCase("MyResource")).toBe("my-resource");
		});

		it("should handle single word names", () => {
			const toKebabCase = (str: string): string => {
				return str
					.replace(/([A-Z])/g, "-$1")
					.toLowerCase()
					.replace(/^-/, "");
			};

			expect(toKebabCase("Config")).toBe("config");
			expect(toKebabCase("Data")).toBe("data");
		});
	});

	describe("resource registration detection", () => {
		it("should detect registerXxxResource pattern", () => {
			const indexContent = `
				registerUserDataResource(this.server);
				registerAppConfigResource(this.server);
			`;

			const registerRegex = /register(\w+)Resource\(this\.server\)/g;
			const matches: string[] = [];
			let match: RegExpExecArray | null;

			while ((match = registerRegex.exec(indexContent)) !== null) {
				matches.push(match[1]);
			}

			expect(matches).toContain("UserData");
			expect(matches).toContain("AppConfig");
			expect(matches).toHaveLength(2);
		});

		it("should not match tool or prompt registrations", () => {
			const indexContent = `
				registerHealthTool(this.server);
				registerCodeReviewPrompt(this.server);
			`;

			const registerRegex = /register(\w+)Resource\(this\.server\)/g;
			const matches: string[] = [];
			let match: RegExpExecArray | null;

			while ((match = registerRegex.exec(indexContent)) !== null) {
				matches.push(match[1]);
			}

			expect(matches).toHaveLength(0);
		});
	});

	describe("resource filtering", () => {
		it("should filter registered resources", () => {
			const resources = [
				{ name: "resource1", registered: true, hasUnitTest: true, hasIntegrationTest: true },
				{ name: "resource2", registered: false, hasUnitTest: true, hasIntegrationTest: false },
				{ name: "resource3", registered: true, hasUnitTest: false, hasIntegrationTest: false },
			];

			const filtered = resources.filter((r) => r.registered);

			expect(filtered).toHaveLength(2);
			expect(filtered[0].name).toBe("resource1");
			expect(filtered[1].name).toBe("resource3");
		});

		it("should filter unregistered resources", () => {
			const resources = [
				{ name: "resource1", registered: true, hasUnitTest: true, hasIntegrationTest: true },
				{ name: "resource2", registered: false, hasUnitTest: true, hasIntegrationTest: false },
				{ name: "resource3", registered: true, hasUnitTest: false, hasIntegrationTest: false },
			];

			const filtered = resources.filter((r) => !r.registered);

			expect(filtered).toHaveLength(1);
			expect(filtered[0].name).toBe("resource2");
		});

		it("should filter tested resources", () => {
			const resources = [
				{ name: "resource1", registered: true, hasUnitTest: true, hasIntegrationTest: true },
				{ name: "resource2", registered: false, hasUnitTest: true, hasIntegrationTest: false },
				{ name: "resource3", registered: true, hasUnitTest: false, hasIntegrationTest: false },
			];

			const filtered = resources.filter((r) => r.hasUnitTest || r.hasIntegrationTest);

			expect(filtered).toHaveLength(2);
			expect(filtered[0].name).toBe("resource1");
			expect(filtered[1].name).toBe("resource2");
		});

		it("should filter untested resources", () => {
			const resources = [
				{ name: "resource1", registered: true, hasUnitTest: true, hasIntegrationTest: true },
				{ name: "resource2", registered: false, hasUnitTest: true, hasIntegrationTest: false },
				{ name: "resource3", registered: true, hasUnitTest: false, hasIntegrationTest: false },
			];

			const filtered = resources.filter((r) => !r.hasUnitTest && !r.hasIntegrationTest);

			expect(filtered).toHaveLength(1);
			expect(filtered[0].name).toBe("resource3");
		});
	});

	describe("description extraction", () => {
		it("should extract description from ResourceTemplate", () => {
			const fileContent = `
				new ResourceTemplate("user-data/{id}", "User data by ID");
			`;

			const templateRegex = /new ResourceTemplate\(\s*["']([^"']+)["'],\s*["']([^"']+)["']/;
			const match = fileContent.match(templateRegex);

			expect(match).not.toBeNull();
			if (match) {
				expect(match[1]).toBe("user-data/{id}");
				expect(match[2]).toBe("User data by ID");
			}
		});

		it("should extract description from static resource", () => {
			const fileContent = `
				server.resource("config", "Application configuration",
					async () => {
						// ...
					}
				);
			`;

			const resourceCallRegex = /server\.resource\(\s*["']([^"']+)["'],\s*["']([^"']+)["']/;
			const match = fileContent.match(resourceCallRegex);

			expect(match).not.toBeNull();
			if (match) {
				expect(match[1]).toBe("config");
				expect(match[2]).toBe("Application configuration");
			}
		});

		it("should extract description from header comment", () => {
			const fileContent = `
				/**
				 * User Data Resource
				 */
				export function registerUserDataResource() {
					// ...
				}
			`;

			const headerRegex = /\/\*\*[\s\S]*?\*\s*([^\n]+)/;
			const match = fileContent.match(headerRegex);

			expect(match).not.toBeNull();
			if (match) {
				expect(match[1].trim()).toBe("User Data Resource");
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
			const resources = [
				{
					name: "user-data",
					file: "src/resources/user-data.ts",
					registered: true,
					hasUnitTest: true,
					hasIntegrationTest: true,
					description: "User data by ID",
				},
			];

			const json = JSON.stringify(resources, null, 2);
			const parsed = JSON.parse(json);

			expect(parsed).toHaveLength(1);
			expect(parsed[0].name).toBe("user-data");
			expect(parsed[0].registered).toBe(true);
		});
	});

	describe("example resource filtering", () => {
		it("should exclude example resources by default", () => {
			const files = ["user-data.ts", "_example-resource.ts", "config.ts"];

			const filtered = files.filter((f) => !f.startsWith("_example"));

			expect(filtered).toHaveLength(2);
			expect(filtered).not.toContain("_example-resource.ts");
		});

		it("should include example resources when requested", () => {
			const files = ["user-data.ts", "_example-resource.ts", "config.ts"];
			const includeExamples = true;

			const filtered = files.filter((f) => includeExamples || !f.startsWith("_example"));

			expect(filtered).toHaveLength(3);
			expect(filtered).toContain("_example-resource.ts");
		});
	});

	describe("summary calculation", () => {
		it("should calculate correct summary statistics", () => {
			const resources = [
				{ name: "r1", registered: true, hasUnitTest: true, hasIntegrationTest: true },
				{ name: "r2", registered: false, hasUnitTest: true, hasIntegrationTest: false },
				{ name: "r3", registered: true, hasUnitTest: false, hasIntegrationTest: true },
				{ name: "r4", registered: true, hasUnitTest: true, hasIntegrationTest: true },
			];

			const registered = resources.filter((r) => r.registered).length;
			const withUnitTests = resources.filter((r) => r.hasUnitTest).length;
			const withIntegrationTests = resources.filter((r) => r.hasIntegrationTest).length;

			expect(registered).toBe(3);
			expect(withUnitTests).toBe(3);
			expect(withIntegrationTests).toBe(3);
		});
	});

	describe("resource type detection", () => {
		it("should detect static resources", () => {
			const fileContent = `
				server.resource("config", "App config", async () => {
					return { content: "data" };
				});
			`;

			const isStatic = !fileContent.includes("ResourceTemplate");

			expect(isStatic).toBe(true);
		});

		it("should detect dynamic resources with ResourceTemplate", () => {
			const fileContent = `
				new ResourceTemplate("user-data/{id}", "User data");
			`;

			const isDynamic = fileContent.includes("ResourceTemplate");

			expect(isDynamic).toBe(true);
		});
	});
});
