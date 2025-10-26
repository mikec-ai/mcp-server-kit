/**
 * Resource Template Validator Tests
 *
 * Tests for detecting common ResourceTemplate mistakes
 */

import { describe, it, expect } from "vitest";
import {
	validateResourceTemplate,
	validateAllResources,
} from "../../../../src/harness/validation/resource-template-validator.js";

describe("validateResourceTemplate", () => {
	describe("detects missing ResourceTemplate", () => {
		it("should detect plain string URI with variables", () => {
			const code = `
				server.resource(
					"user-profile",
					"user://{userId}",
					{ description: "User profile" },
					async (uri) => { return {}; }
				);
			`;

			const errors = validateResourceTemplate(code, "user-profile.ts");

			expect(errors).toHaveLength(1);
			expect(errors[0]).toContain("user://{userId}");
			expect(errors[0]).toContain("doesn't use ResourceTemplate");
			expect(errors[0]).toContain("new ResourceTemplate");
		});

		it("should detect multiple variables in plain string", () => {
			const code = `
				server.resource(
					"database",
					"db://{table}/{id}",
					{ description: "Database record" },
					async (uri) => { return {}; }
				);
			`;

			const errors = validateResourceTemplate(code, "database.ts");

			expect(errors).toHaveLength(1);
			expect(errors[0]).toContain("db://{table}/{id}");
		});

		it("should handle single quotes in URI pattern", () => {
			const code = `
				server.resource(
					"config",
					'config://{environment}',
					{ description: "Config" },
					async (uri) => { return {}; }
				);
			`;

			const errors = validateResourceTemplate(code, "config.ts");

			expect(errors).toHaveLength(1);
			expect(errors[0]).toContain("config://{environment}");
		});
	});

	describe("accepts valid patterns", () => {
		it("should accept ResourceTemplate for dynamic resources", () => {
			const code = `
				import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

				server.resource(
					"user-profile",
					new ResourceTemplate("user://{userId}", {
						list: async () => ({ resources: [] }),
						complete: { userId: async (val) => [] }
					}),
					{ description: "User profile" },
					async (uri, variables) => { return {}; }
				);
			`;

			const errors = validateResourceTemplate(code, "user-profile.ts");

			expect(errors).toHaveLength(0);
		});

		it("should accept plain string for static resources", () => {
			const code = `
				server.resource(
					"app-config",
					"config://app/settings",
					{ description: "App config" },
					async (uri) => { return {}; }
				);
			`;

			const errors = validateResourceTemplate(code, "app-config.ts");

			expect(errors).toHaveLength(0);
		});

		it("should accept static URI with slashes but no variables", () => {
			const code = `
				server.resource(
					"docs",
					"docs://api/reference",
					{ description: "API docs" },
					async (uri) => { return {}; }
				);
			`;

			const errors = validateResourceTemplate(code, "docs.ts");

			expect(errors).toHaveLength(0);
		});
	});

	describe("edge cases", () => {
		it("should handle files with no resources", () => {
			const code = `
				import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

				export function registerTool(server: McpServer) {
					// This is a tool, not a resource
				}
			`;

			const errors = validateResourceTemplate(code, "tool.ts");

			expect(errors).toHaveLength(0);
		});

		it("should detect multiple resources in one file", () => {
			const code = `
				server.resource("first", "first://{id}", {}, async (uri) => {});
				server.resource("second", "second://{name}", {}, async (uri) => {});
			`;

			const errors = validateResourceTemplate(code, "multi.ts");

			expect(errors).toHaveLength(2);
		});

		it("should handle multiline resource definitions", () => {
			const code = `
				server.resource(
					"user",
					"user://{userId}",
					{
						description: "User data",
						mimeType: "application/json"
					},
					async (uri) => {
						return { contents: [] };
					}
				);
			`;

			const errors = validateResourceTemplate(code, "user.ts");

			expect(errors).toHaveLength(1);
		});
	});

	describe("provides helpful error messages", () => {
		it("should include the URI pattern in error", () => {
			const code = `server.resource("test", "test://{id}", {}, async (uri) => {});`;

			const errors = validateResourceTemplate(code, "test.ts");

			expect(errors[0]).toContain("test://{id}");
		});

		it("should suggest the correct fix", () => {
			const code = `server.resource("test", "test://{id}", {}, async (uri) => {});`;

			const errors = validateResourceTemplate(code, "test.ts");

			expect(errors[0]).toContain("new ResourceTemplate");
			expect(errors[0]).toContain("list:");
			expect(errors[0]).toContain("complete:");
		});

		it("should include file name in error", () => {
			const code = `server.resource("test", "test://{id}", {}, async (uri) => {});`;

			const errors = validateResourceTemplate(code, "my-resource.ts");

			expect(errors[0]).toContain("my-resource.ts");
		});
	});
});

describe("validateAllResources", () => {
	it("should validate multiple files", () => {
		const files = new Map<string, string>([
			["user.ts", 'server.resource("user", "user://{id}", {}, async (uri) => {})'],
			["config.ts", 'server.resource("config", "config://app", {}, async (uri) => {})'],
		]);

		const errors = validateAllResources(files);

		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("user.ts");
	});

	it("should return empty array for valid files", () => {
		const files = new Map<string, string>([
			["static.ts", 'server.resource("config", "config://app", {}, async (uri) => {})'],
		]);

		const errors = validateAllResources(files);

		expect(errors).toHaveLength(0);
	});

	it("should handle empty file map", () => {
		const files = new Map<string, string>();

		const errors = validateAllResources(files);

		expect(errors).toHaveLength(0);
	});

	it("should collect errors from all files", () => {
		const files = new Map<string, string>([
			["file1.ts", 'server.resource("a", "a://{x}", {}, async (uri) => {})'],
			["file2.ts", 'server.resource("b", "b://{y}", {}, async (uri) => {})'],
			["file3.ts", 'server.resource("c", "c://{z}", {}, async (uri) => {})'],
		]);

		const errors = validateAllResources(files);

		expect(errors).toHaveLength(3);
		expect(errors.some((e) => e.includes("file1.ts"))).toBe(true);
		expect(errors.some((e) => e.includes("file2.ts"))).toBe(true);
		expect(errors.some((e) => e.includes("file3.ts"))).toBe(true);
	});
});
