/**
 * Unit Tests for Template System Schemas
 *
 * Tests Zod validation schemas for runtime safety.
 */

import { describe, it, expect } from "vitest";
import { validateTemplateConfig } from "@/core/template-system/schemas";

describe("Template Schema Validation", () => {
	describe("validateTemplateConfig", () => {
		it("should validate a valid template config", () => {
			const validConfig = {
				id: "test-template",
				version: "1.0.0",
				name: "Test Template",
				description: "A test template",
				capabilities: {
					runtime: "cloudflare-workers",
					transport: ["sse", "http"],
					deployment: "remote",
					language: "typescript",
				},
				dependencies: {
					mcp_sdk: "1.19.1",
					agents: "0.2.8",
				},
				scaffolding: {
					variables: [
						{
							name: "PROJECT_NAME",
							required: true,
							prompt: "Project name",
						},
					],
					postScaffold: {
						install: true,
					},
				},
				cli: {
					dev: "npm run dev",
					test: "npm run test",
				},
				features: {
					unitTesting: true,
					integrationTesting: true,
					exampleTools: ["health"],
					documentation: true,
				},
				compatibility: {
					node: ">=18.0.0",
					npm: ">=9.0.0",
				},
			};

			const result = validateTemplateConfig(validConfig);

			expect(result.success).toBe(true);
			expect(result.data).toBeDefined();
		});

		it("should reject invalid template ID format", () => {
			const invalidConfig = {
				id: "Invalid_ID",  // Should be lowercase with hyphens
				version: "1.0.0",
				name: "Test",
				description: "Test",
				capabilities: {
					runtime: "cloudflare-workers",
					transport: ["sse"],
					deployment: "remote",
					language: "typescript",
				},
				dependencies: {},
				scaffolding: {
					variables: [],
				},
				cli: {
					dev: "npm run dev",
					test: "npm test",
				},
				features: {
					unitTesting: false,
					integrationTesting: false,
					exampleTools: [],
					documentation: false,
				},
				compatibility: {},
			};

			const result = validateTemplateConfig(invalidConfig);

			expect(result.success).toBe(false);
		});

		it("should reject invalid semver version", () => {
			const invalidConfig = {
				id: "test-template",
				version: "invalid-version",
				name: "Test",
				description: "Test",
				capabilities: {
					runtime: "cloudflare-workers",
					transport: ["sse"],
					deployment: "remote",
					language: "typescript",
				},
				dependencies: {},
				scaffolding: {
					variables: [],
				},
				cli: {
					dev: "npm run dev",
					test: "npm test",
				},
				features: {
					unitTesting: false,
					integrationTesting: false,
					exampleTools: [],
					documentation: false,
				},
				compatibility: {},
			};

			const result = validateTemplateConfig(invalidConfig);

			expect(result.success).toBe(false);
		});

		it("should require at least one transport", () => {
			const invalidConfig = {
				id: "test-template",
				version: "1.0.0",
				name: "Test",
				description: "Test",
				capabilities: {
					runtime: "cloudflare-workers",
					transport: [], // Empty array not allowed
					deployment: "remote",
					language: "typescript",
				},
				dependencies: {},
				scaffolding: {
					variables: [],
				},
				cli: {
					dev: "npm run dev",
					test: "npm test",
				},
				features: {
					unitTesting: false,
					integrationTesting: false,
					exampleTools: [],
					documentation: false,
				},
				compatibility: {},
			};

			const result = validateTemplateConfig(invalidConfig);

			expect(result.success).toBe(false);
		});

		it("should validate variable name format", () => {
			const invalidConfig = {
				id: "test-template",
				version: "1.0.0",
				name: "Test",
				description: "Test",
				capabilities: {
					runtime: "cloudflare-workers",
					transport: ["sse"],
					deployment: "remote",
					language: "typescript",
				},
				dependencies: {},
				scaffolding: {
					variables: [
						{
							name: "invalid-variable-name", // Should be uppercase
							required: true,
						},
					],
				},
				cli: {
					dev: "npm run dev",
					test: "npm test",
				},
				features: {
					unitTesting: false,
					integrationTesting: false,
					exampleTools: [],
					documentation: false,
				},
				compatibility: {},
			};

			const result = validateTemplateConfig(invalidConfig);

			expect(result.success).toBe(false);
		});

		it("should accept valid deployment types", () => {
			const remoteConfig = {
				id: "test-remote",
				version: "1.0.0",
				name: "Remote Test",
				description: "Test",
				capabilities: {
					runtime: "cloudflare-workers",
					transport: ["sse"],
					deployment: "remote",
					language: "typescript",
				},
				dependencies: {},
				scaffolding: {
					variables: [],
				},
				cli: {
					dev: "npm run dev",
					test: "npm test",
				},
				features: {
					unitTesting: false,
					integrationTesting: false,
					exampleTools: [],
					documentation: false,
				},
				compatibility: {},
			};

			const localConfig = {
				...remoteConfig,
				id: "test-local",
				capabilities: {
					...remoteConfig.capabilities,
					deployment: "local" as const,
				},
			};

			const remoteResult = validateTemplateConfig(remoteConfig);
			const localResult = validateTemplateConfig(localConfig);

			expect(remoteResult.success).toBe(true);
			expect(localResult.success).toBe(true);
		});

		it("should accept valid language types", () => {
			const typescriptConfig = {
				id: "test-ts",
				version: "1.0.0",
				name: "TypeScript Test",
				description: "Test",
				capabilities: {
					runtime: "node",
					transport: ["stdio"],
					deployment: "local",
					language: "typescript",
				},
				dependencies: {},
				scaffolding: {
					variables: [],
				},
				cli: {
					dev: "npm run dev",
					test: "npm test",
				},
				features: {
					unitTesting: false,
					integrationTesting: false,
					exampleTools: [],
					documentation: false,
				},
				compatibility: {},
			};

			const javascriptConfig = {
				...typescriptConfig,
				id: "test-js",
				capabilities: {
					...typescriptConfig.capabilities,
					language: "javascript" as const,
				},
			};

			const tsResult = validateTemplateConfig(typescriptConfig);
			const jsResult = validateTemplateConfig(javascriptConfig);

			expect(tsResult.success).toBe(true);
			expect(jsResult.success).toBe(true);
		});

		it("should validate optional fields", () => {
			const configWithOptionals = {
				id: "test-optionals",
				version: "1.0.0",
				name: "Test Optionals",
				description: "Test",
				capabilities: {
					runtime: "cloudflare-workers",
					transport: ["sse"],
					deployment: "remote",
					language: "typescript",
				},
				dependencies: {
					mcp_sdk: "1.19.1",
					agents: "0.2.8",
					runtime_specific: {
						wrangler: "^4.0.0",
					},
				},
				scaffolding: {
					variables: [
						{
							name: "PROJECT_NAME",
							required: true,
							default: "my-project",
							prompt: "Enter project name",
							pattern: "^[a-z-]+$",
						},
					],
					postScaffold: {
						install: true,
						installCommand: "pnpm install",
						smokeTest: "pnpm type-check",
					},
				},
				cli: {
					dev: "npm run dev",
					test: "npm test",
					deploy: "npm run deploy",
					typeCheck: "npm run type-check",
				},
				features: {
					unitTesting: true,
					integrationTesting: true,
					exampleTools: ["health", "echo"],
					documentation: true,
				},
				compatibility: {
					node: ">=18.0.0",
					npm: ">=9.0.0",
					pnpm: ">=8.0.0",
					yarn: ">=1.22.0",
				},
			};

			const result = validateTemplateConfig(configWithOptionals);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data!.dependencies.runtime_specific).toBeDefined();
				expect(result.data!.scaffolding.postScaffold?.smokeTest).toBe("pnpm type-check");
				expect(result.data!.cli.deploy).toBe("npm run deploy");
			}
		});

		it("should provide error details on validation failure", () => {
			const invalidConfig = {
				id: "test",
				// Missing required fields
			};

			const result = validateTemplateConfig(invalidConfig as any);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.errors).toBeDefined();
				expect(result.errors?.issues.length).toBeGreaterThan(0);
			}
		});
	});

	describe("postInstall configuration", () => {
		it("should accept postInstall commands array", () => {
			const configWithPostInstall = {
				id: "test-template",
				version: "1.0.0",
				name: "Test Template",
				description: "Test",
				capabilities: {
					runtime: "cloudflare-workers",
					transport: ["sse"],
					deployment: "remote",
					language: "typescript",
				},
				dependencies: {},
				scaffolding: {
					variables: [],
					postScaffold: {
						install: true,
						postInstall: ["npm run cf-typegen"],
					},
				},
				cli: {
					dev: "npm run dev",
					test: "npm test",
				},
				features: {
					unitTesting: false,
					integrationTesting: false,
					exampleTools: [],
					documentation: false,
				},
				compatibility: {},
			};

			const result = validateTemplateConfig(configWithPostInstall);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data!.scaffolding.postScaffold?.postInstall).toBeDefined();
				expect(result.data!.scaffolding.postScaffold?.postInstall).toEqual(["npm run cf-typegen"]);
			}
		});

		it("should accept multiple postInstall commands", () => {
			const config = {
				id: "test-template",
				version: "1.0.0",
				name: "Test Template",
				description: "Test",
				capabilities: {
					runtime: "cloudflare-workers",
					transport: ["sse"],
					deployment: "remote",
					language: "typescript",
				},
				dependencies: {},
				scaffolding: {
					variables: [],
					postScaffold: {
						install: true,
						postInstall: ["npm run build", "npm run cf-typegen", "npm run validate"],
					},
				},
				cli: {
					dev: "npm run dev",
					test: "npm test",
				},
				features: {
					unitTesting: false,
					integrationTesting: false,
					exampleTools: [],
					documentation: false,
				},
				compatibility: {},
			};

			const result = validateTemplateConfig(config);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data!.scaffolding.postScaffold?.postInstall).toHaveLength(3);
			}
		});

		it("should work without postInstall (optional field)", () => {
			const configWithoutPostInstall = {
				id: "test-template",
				version: "1.0.0",
				name: "Test Template",
				description: "Test",
				capabilities: {
					runtime: "cloudflare-workers",
					transport: ["sse"],
					deployment: "remote",
					language: "typescript",
				},
				dependencies: {},
				scaffolding: {
					variables: [],
					postScaffold: {
						install: true,
						// No postInstall field
					},
				},
				cli: {
					dev: "npm run dev",
					test: "npm test",
				},
				features: {
					unitTesting: false,
					integrationTesting: false,
					exampleTools: [],
					documentation: false,
				},
				compatibility: {},
			};

			const result = validateTemplateConfig(configWithoutPostInstall);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data!.scaffolding.postScaffold?.postInstall).toBeUndefined();
			}
		});

		it("should reject non-array postInstall values", () => {
			const invalidConfig = {
				id: "test-template",
				version: "1.0.0",
				name: "Test Template",
				description: "Test",
				capabilities: {
					runtime: "cloudflare-workers",
					transport: ["sse"],
					deployment: "remote",
					language: "typescript",
				},
				dependencies: {},
				scaffolding: {
					variables: [],
					postScaffold: {
						install: true,
						postInstall: "npm run cf-typegen", // Should be array, not string
					},
				},
				cli: {
					dev: "npm run dev",
					test: "npm test",
				},
				features: {
					unitTesting: false,
					integrationTesting: false,
					exampleTools: [],
					documentation: false,
				},
				compatibility: {},
			};

			const result = validateTemplateConfig(invalidConfig as any);

			expect(result.success).toBe(false);
		});
	});
});
