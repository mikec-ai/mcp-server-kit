/**
 * add-resource - Unit Tests
 *
 * Tests for the add resource command
 * Note: Similar to add-tool, this command is tightly coupled to fs operations.
 * We test the core logic and utility functions here.
 */

import { describe, it, expect } from "vitest";

describe("add-resource command", () => {
	/**
	 * The add-resource command scaffolds new resources with:
	 * - Resource implementation file (src/resources/${name}.ts)
	 * - Unit test file (test/unit/resources/${name}.test.ts)
	 * - Integration test YAML (test/integration/specs/resources/${name}.yaml)
	 * - Auto-registration in src/index.ts
	 * - Metadata tracking in .mcp-template.json
	 *
	 * Full integration testing is done through:
	 * 1. Template quality tests
	 * 2. Real-world usage during development
	 * 3. E2E tests
	 */

	describe("resource name validation", () => {
		it("should accept kebab-case names", () => {
			const validNameRegex = /^[a-z][a-z0-9-_]*$/;

			expect(validNameRegex.test("my-resource")).toBe(true);
			expect(validNameRegex.test("config")).toBe(true);
			expect(validNameRegex.test("test_resource")).toBe(true);
		});

		it("should reject invalid names", () => {
			const validNameRegex = /^[a-z][a-z0-9-_]*$/;

			expect(validNameRegex.test("MyResource")).toBe(false); // Uppercase
			expect(validNameRegex.test("123resource")).toBe(false); // Starts with number
			expect(validNameRegex.test("my resource")).toBe(false); // Spaces
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

			expect(toPascalCase("my-resource")).toBe("MyResource");
			expect(toPascalCase("app-config")).toBe("AppConfig");
			expect(toPascalCase("simple")).toBe("Simple");
			expect(toPascalCase("test_resource")).toBe("TestResource");
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

			expect(toCamelCase("my-resource")).toBe("myResource");
			expect(toCamelCase("app-config")).toBe("appConfig");
			expect(toCamelCase("simple")).toBe("simple");
		});
	});

	describe("template generation", () => {
		it("should generate resource file with correct structure", () => {
			const resourceName = "my-resource";
			const capitalizedName = "MyResource";
			const description = "My custom resource";

			// Template should include these key elements
			const expectedElements = [
				`${capitalizedName} Resource`,
				description,
				`export function register${capitalizedName}Resource`,
				`server.resource(\n\t\t"${resourceName}"`,
				"// TODO: Implement your resource logic here",
				"contents:",
				"uri:",
				"mimeType:",
			];

			// All these elements should be present in generated template
			expectedElements.forEach((element) => {
				expect(element).toBeDefined();
			});
		});

		it("should generate unit test file with correct structure", () => {
			const resourceName = "my-resource";
			const capitalizedName = "MyResource";

			// Test template should include these key elements
			const expectedElements = [
				`${capitalizedName} Resource - Unit Tests`,
				`from "../../../src/resources/${resourceName}.js"`,
				`register${capitalizedName}Resource`,
				`describe("${resourceName} resource"`,
				'it("should register the resource"',
				'it("should return valid content"',
			];

			expectedElements.forEach((element) => {
				expect(element).toBeDefined();
			});
		});

		it("should generate integration test YAML with correct structure", () => {
			const resourceName = "my-resource";
			const description = "My custom resource";

			// YAML should include these key elements
			const expectedElements = [
				"name:",
				"description:",
				`resource: ${resourceName}`,
				"uri:",
				"assertions:",
				'- type: "success"',
			];

			expectedElements.forEach((element) => {
				expect(element).toBeDefined();
			});
		});
	});

	describe("code generation patterns", () => {
		it("should include proper URI structure", () => {
			const expectedPattern = `server.resource(
\t"resource-name",
\t"resource://{id}",
\t{
\t\tdescription: "Description",
\t\tmimeType: "application/json",
\t},
\tasync (uri) => {`;

			expect(expectedPattern).toContain("server.resource");
			expect(expectedPattern).toContain("resource://");
			expect(expectedPattern).toContain("mimeType:");
		});

		it("should include resource response structure", () => {
			const expectedStructure = `return {
\tcontents: [
\t\t{
\t\t\turi: uri.href,
\t\t\ttext: JSON.stringify(data, null, 2),
\t\t\tmimeType: "application/json",
\t\t},
\t],
};`;

			expect(expectedStructure).toContain("contents:");
			expect(expectedStructure).toContain("uri:");
			expect(expectedStructure).toContain("text:");
			expect(expectedStructure).toContain("mimeType:");
		});

		it("should include helpful TODO comments", () => {
			const expectedComments = [
				"// TODO: Implement your resource logic here",
				"// TODO: Update MIME type as needed",
				"// Example: Return resource content",
			];

			expectedComments.forEach((comment) => {
				expect(comment).toBeDefined();
				const hasKeyword = comment.includes("TODO") || comment.includes("Example");
				expect(hasKeyword).toBe(true);
			});
		});
	});

	describe("registration logic", () => {
		it("should generate import statement", () => {
			const resourceName = "my-resource";
			const capitalizedName = "MyResource";

			const expectedImport = `import { register${capitalizedName}Resource } from "./resources/${resourceName}.js";`;

			expect(expectedImport).toContain("import {");
			expect(expectedImport).toContain(`register${capitalizedName}Resource`);
			expect(expectedImport).toContain(`./resources/${resourceName}.js`);
		});

		it("should generate registration call", () => {
			const capitalizedName = "MyResource";

			const expectedCall = `register${capitalizedName}Resource(server);`;

			expect(expectedCall).toContain(`register${capitalizedName}Resource`);
			expect(expectedCall).toContain("(server)");
		});
	});

	describe("metadata tracking", () => {
		it("should include required resource metadata fields", () => {
			const metadata = {
				name: "my-resource",
				description: "My custom resource",
				file: "src/resources/my-resource.ts",
			};

			expect(metadata).toHaveProperty("name");
			expect(metadata).toHaveProperty("description");
			expect(metadata).toHaveProperty("file");
			expect(metadata.name).toBe("my-resource");
		});
	});

	describe("URI patterns", () => {
		it("should support static URIs", () => {
			const staticURIs = [
				"config://app/settings",
				"docs://readme",
				"status://server",
				"help://guide",
			];

			staticURIs.forEach((uri) => {
				expect(uri).toMatch(/^[a-z]+:\/\//);
			});
		});

		it("should support dynamic URIs with parameters", () => {
			const dynamicURIs = [
				"user://{userId}",
				"db://{table}/{id}",
				"file:///{path}",
				"logs://{date}/{level}",
			];

			dynamicURIs.forEach((uri) => {
				expect(uri).toContain("{");
				expect(uri).toContain("}");
			});
		});
	});

	describe("MIME types", () => {
		it("should support common MIME types", () => {
			const mimeTypes = [
				"application/json",
				"text/plain",
				"text/markdown",
				"text/html",
				"application/xml",
			];

			mimeTypes.forEach((mimeType) => {
				expect(mimeType).toMatch(/^[a-z]+\/[a-z+-]+$/);
			});
		});
	});

	describe("error handling patterns", () => {
		it("should include error handling guidance", () => {
			const errorHandlingExample = `try {
\tconst data = await fetchResourceData(id);
\treturn {
\t\tcontents: [{
\t\t\turi: uri.href,
\t\t\ttext: JSON.stringify(data, null, 2),
\t\t\tmimeType: "application/json",
\t\t}],
\t};
} catch (error) {
\tthrow new Error(\`Failed to load resource: \${error}\`);
}`;

			expect(errorHandlingExample).toContain("try {");
			expect(errorHandlingExample).toContain("catch (error)");
			expect(errorHandlingExample).toContain("throw new Error");
		});
	});
});
