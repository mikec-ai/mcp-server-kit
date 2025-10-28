/**
 * Unit tests for BindingTemplateService
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { BindingTemplateService } from "@/core/commands/shared/binding-template-service.js";
import type { BindingTemplateVars } from "@/types/binding-types.js";

describe("BindingTemplateService", () => {
	let service: BindingTemplateService;
	let testDir: string;

	beforeEach(async () => {
		service = new BindingTemplateService();
		testDir = await mkdtemp(join(tmpdir(), "binding-template-test-"));
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	describe("constructor", () => {
		it("should locate templates directory", () => {
			const templatesDir = service.getTemplatesDir();

			expect(templatesDir).toBeDefined();
			expect(templatesDir).toContain("templates/scaffolding/bindings");
			expect(existsSync(templatesDir)).toBe(true);
		});

		it("should find kv-helper.hbs template", () => {
			const templatesDir = service.getTemplatesDir();
			const kvTemplatePath = join(templatesDir, "kv-helper.hbs");

			expect(existsSync(kvTemplatePath)).toBe(true);
		});

		it("should find d1-helper.hbs template", () => {
			const templatesDir = service.getTemplatesDir();
			const d1TemplatePath = join(templatesDir, "d1-helper.hbs");

			expect(existsSync(d1TemplatePath)).toBe(true);
		});
	});

	describe("generateKVHelper()", () => {
		it("should generate KV helper with correct class name", () => {
			const vars: BindingTemplateVars = {
				BINDING_NAME: "MY_CACHE",
				HELPER_CLASS_NAME: "MyCacheKV",
				KEBAB_NAME: "my-cache",
				CAMEL_NAME: "myCache",
				TYPE_SUFFIX: "KV",
			};

			const content = service.generateKVHelper(vars);

			expect(content).toContain("export class MyCacheKV");
			expect(content).toContain("MY_CACHE KV namespace");
		});

		it("should include all KV helper methods", () => {
			const vars: BindingTemplateVars = {
				BINDING_NAME: "MY_CACHE",
				HELPER_CLASS_NAME: "MyCacheKV",
				KEBAB_NAME: "my-cache",
				CAMEL_NAME: "myCache",
				TYPE_SUFFIX: "KV",
			};

			const content = service.generateKVHelper(vars);

			// Check for essential methods
			expect(content).toContain("async get<T = any>");
			expect(content).toContain("async getText(");
			expect(content).toContain("async set<T = any>");
			expect(content).toContain("async setText(");
			expect(content).toContain("async delete(");
			expect(content).toContain("async list(");
			expect(content).toContain("async has(");
		});

		it("should include type definitions", () => {
			const vars: BindingTemplateVars = {
				BINDING_NAME: "MY_CACHE",
				HELPER_CLASS_NAME: "MyCacheKV",
				KEBAB_NAME: "my-cache",
				CAMEL_NAME: "myCache",
				TYPE_SUFFIX: "KV",
			};

			const content = service.generateKVHelper(vars);

			expect(content).toContain("export interface KVPutOptions");
			expect(content).toContain("export interface KVListOptions");
			expect(content).toContain("export interface KVListResult");
		});

		it("should include usage examples in JSDoc", () => {
			const vars: BindingTemplateVars = {
				BINDING_NAME: "MY_CACHE",
				HELPER_CLASS_NAME: "MyCacheKV",
				KEBAB_NAME: "my-cache",
				CAMEL_NAME: "myCache",
				TYPE_SUFFIX: "KV",
			};

			const content = service.generateKVHelper(vars);

			expect(content).toContain("@example");
			expect(content).toContain("myCache");
		});

		it("should handle different binding names", () => {
			const testCases = [
				{
					BINDING_NAME: "USER_DATA",
					HELPER_CLASS_NAME: "UserDataKV",
					CAMEL_NAME: "userData",
				},
				{
					BINDING_NAME: "SESSION_STORE",
					HELPER_CLASS_NAME: "SessionStoreKV",
					CAMEL_NAME: "sessionStore",
				},
			];

			for (const testCase of testCases) {
				const vars: BindingTemplateVars = {
					...testCase,
					KEBAB_NAME: "test",
					TYPE_SUFFIX: "KV",
				};

				const content = service.generateKVHelper(vars);

				expect(content).toContain(`export class ${testCase.HELPER_CLASS_NAME}`);
				expect(content).toContain(testCase.CAMEL_NAME);
			}
		});
	});

	describe("generateD1Helper()", () => {
		it("should generate D1 helper with correct class name", () => {
			const vars: BindingTemplateVars = {
				BINDING_NAME: "MY_DB",
				HELPER_CLASS_NAME: "MyDbD1",
				KEBAB_NAME: "my-db",
				CAMEL_NAME: "myDb",
				TYPE_SUFFIX: "D1",
				DATABASE_NAME: "my-database",
			};

			const content = service.generateD1Helper(vars);

			expect(content).toContain("export class MyDbD1");
			expect(content).toContain("MY_DB D1 database");
			expect(content).toContain("my-database");
		});

		it("should include all D1 helper methods", () => {
			const vars: BindingTemplateVars = {
				BINDING_NAME: "MY_DB",
				HELPER_CLASS_NAME: "MyDbD1",
				KEBAB_NAME: "my-db",
				CAMEL_NAME: "myDb",
				TYPE_SUFFIX: "D1",
				DATABASE_NAME: "my-database",
			};

			const content = service.generateD1Helper(vars);

			// Check for essential methods
			expect(content).toContain("async query<T = any>");
			expect(content).toContain("async queryFirst<T = any>");
			expect(content).toContain("async execute(");
			expect(content).toContain("async batch(");
			expect(content).toContain("async exec(");
			expect(content).toContain("async count(");
			expect(content).toContain("async insert(");
			expect(content).toContain("async update(");
		});

		it("should include type definitions", () => {
			const vars: BindingTemplateVars = {
				BINDING_NAME: "MY_DB",
				HELPER_CLASS_NAME: "MyDbD1",
				KEBAB_NAME: "my-db",
				CAMEL_NAME: "myDb",
				TYPE_SUFFIX: "D1",
				DATABASE_NAME: "my-database",
			};

			const content = service.generateD1Helper(vars);

			expect(content).toContain("export interface D1QueryResult");
			expect(content).toContain("export interface D1Statement");
		});

		it("should include usage examples in JSDoc", () => {
			const vars: BindingTemplateVars = {
				BINDING_NAME: "MY_DB",
				HELPER_CLASS_NAME: "MyDbD1",
				KEBAB_NAME: "my-db",
				CAMEL_NAME: "myDb",
				TYPE_SUFFIX: "D1",
				DATABASE_NAME: "my-database",
			};

			const content = service.generateD1Helper(vars);

			expect(content).toContain("@example");
			expect(content).toContain("myDb");
		});
	});

	describe("generateHelper()", () => {
		it("should route to KV helper for kv binding type", () => {
			const vars: BindingTemplateVars = {
				BINDING_NAME: "MY_CACHE",
				HELPER_CLASS_NAME: "MyCacheKV",
				KEBAB_NAME: "my-cache",
				CAMEL_NAME: "myCache",
				TYPE_SUFFIX: "KV",
			};

			const content = service.generateHelper("kv", vars);

			expect(content).toContain("export class MyCacheKV");
		});

		it("should route to D1 helper for d1 binding type", () => {
			const vars: BindingTemplateVars = {
				BINDING_NAME: "MY_DB",
				HELPER_CLASS_NAME: "MyDbD1",
				KEBAB_NAME: "my-db",
				CAMEL_NAME: "myDb",
				TYPE_SUFFIX: "D1",
				DATABASE_NAME: "my-database",
			};

			const content = service.generateHelper("d1", vars);

			expect(content).toContain("export class MyDbD1");
		});

		it("should generate R2 helper", () => {
			const vars: BindingTemplateVars = {
				BINDING_NAME: "MY_BUCKET",
				HELPER_CLASS_NAME: "MyBucketR2",
				KEBAB_NAME: "my-bucket",
				CAMEL_NAME: "myBucket",
				TYPE_SUFFIX: "R2",
			};

			const result = service.generateHelper("r2", vars);
			expect(result).toContain("export class MyBucketR2");
			expect(result).toContain("MY_BUCKET");
		});

		it("should throw error for unknown binding types", () => {
			const vars: BindingTemplateVars = {
				BINDING_NAME: "TEST",
				HELPER_CLASS_NAME: "TestUnknown",
				KEBAB_NAME: "test",
				CAMEL_NAME: "test",
				TYPE_SUFFIX: "UNKNOWN",
			};

			expect(() =>
				service.generateHelper("unknown" as any, vars),
			).toThrow(/unknown binding type/i);
		});
	});

	describe("createHelperFile()", () => {
		it("should create KV helper file in correct location", async () => {
			// Create src directory
			await mkdir(join(testDir, "src"), { recursive: true });

			const vars: BindingTemplateVars = {
				BINDING_NAME: "MY_CACHE",
				HELPER_CLASS_NAME: "MyCacheKV",
				KEBAB_NAME: "my-cache",
				CAMEL_NAME: "myCache",
				TYPE_SUFFIX: "KV",
			};

			const filePath = await service.createHelperFile(testDir, "kv", vars);

			expect(filePath).toBe(
				join(testDir, "src", "utils", "bindings", "kv-my-cache.ts"),
			);
			expect(existsSync(filePath)).toBe(true);
		});

		it("should create D1 helper file in correct location", async () => {
			await mkdir(join(testDir, "src"), { recursive: true });

			const vars: BindingTemplateVars = {
				BINDING_NAME: "MY_DB",
				HELPER_CLASS_NAME: "MyDbD1",
				KEBAB_NAME: "my-db",
				CAMEL_NAME: "myDb",
				TYPE_SUFFIX: "D1",
				DATABASE_NAME: "my-database",
			};

			const filePath = await service.createHelperFile(testDir, "d1", vars);

			expect(filePath).toBe(
				join(testDir, "src", "utils", "bindings", "d1-my-db.ts"),
			);
			expect(existsSync(filePath)).toBe(true);
		});

		it("should create bindings directory if it doesn't exist", async () => {
			await mkdir(join(testDir, "src"), { recursive: true });

			const vars: BindingTemplateVars = {
				BINDING_NAME: "MY_CACHE",
				HELPER_CLASS_NAME: "MyCacheKV",
				KEBAB_NAME: "my-cache",
				CAMEL_NAME: "myCache",
				TYPE_SUFFIX: "KV",
			};

			const bindingsDir = join(testDir, "src", "utils", "bindings");
			expect(existsSync(bindingsDir)).toBe(false);

			await service.createHelperFile(testDir, "kv", vars);

			expect(existsSync(bindingsDir)).toBe(true);
		});

		it("should write valid TypeScript content", async () => {
			await mkdir(join(testDir, "src"), { recursive: true });

			const vars: BindingTemplateVars = {
				BINDING_NAME: "MY_CACHE",
				HELPER_CLASS_NAME: "MyCacheKV",
				KEBAB_NAME: "my-cache",
				CAMEL_NAME: "myCache",
				TYPE_SUFFIX: "KV",
			};

			const filePath = await service.createHelperFile(testDir, "kv", vars);

			const content = readFileSync(filePath, "utf-8");

			expect(content).toContain("export class MyCacheKV");
			expect(content).toContain("constructor(private kv: KVNamespace)");
		});

		it("should overwrite existing file", async () => {
			await mkdir(join(testDir, "src", "utils", "bindings"), {
				recursive: true,
			});

			const vars: BindingTemplateVars = {
				BINDING_NAME: "MY_CACHE",
				HELPER_CLASS_NAME: "MyCacheKV",
				KEBAB_NAME: "my-cache",
				CAMEL_NAME: "myCache",
				TYPE_SUFFIX: "KV",
			};

			// Create file first time
			const filePath1 = await service.createHelperFile(testDir, "kv", vars);
			const content1 = readFileSync(filePath1, "utf-8");

			// Create file second time
			const filePath2 = await service.createHelperFile(testDir, "kv", vars);
			const content2 = readFileSync(filePath2, "utf-8");

			expect(filePath1).toBe(filePath2);
			expect(content1).toBe(content2);
		});
	});

	describe("getHelperPath()", () => {
		it("should return correct path for KV binding", () => {
			const path = service.getHelperPath(testDir, "kv", "my-cache");

			expect(path).toBe(
				join(testDir, "src", "utils", "bindings", "kv-my-cache.ts"),
			);
		});

		it("should return correct path for D1 binding", () => {
			const path = service.getHelperPath(testDir, "d1", "my-db");

			expect(path).toBe(
				join(testDir, "src", "utils", "bindings", "d1-my-db.ts"),
			);
		});

		it("should handle different kebab names", () => {
			const testCases = ["user-data", "session-store", "product-cache"];

			for (const kebabName of testCases) {
				const path = service.getHelperPath(testDir, "kv", kebabName);

				expect(path).toContain(`kv-${kebabName}.ts`);
			}
		});
	});

	describe("generateImportStatement()", () => {
		it("should generate correct import for KV binding", () => {
			const importStmt = service.generateImportStatement(
				"MyCacheKV",
				"kv",
				"my-cache",
			);

			expect(importStmt).toBe(
				'import { MyCacheKV } from "./utils/bindings/kv-my-cache.js";',
			);
		});

		it("should generate correct import for D1 binding", () => {
			const importStmt = service.generateImportStatement(
				"MyDbD1",
				"d1",
				"my-db",
			);

			expect(importStmt).toBe(
				'import { MyDbD1 } from "./utils/bindings/d1-my-db.js";',
			);
		});

		it("should use .js extension for ES modules", () => {
			const importStmt = service.generateImportStatement(
				"TestKV",
				"kv",
				"test",
			);

			expect(importStmt).toContain(".js");
			expect(importStmt).not.toContain(".ts");
		});
	});

	describe("clearCache()", () => {
		it("should clear template cache", () => {
			// Generate content to populate cache
			const vars: BindingTemplateVars = {
				BINDING_NAME: "MY_CACHE",
				HELPER_CLASS_NAME: "MyCacheKV",
				KEBAB_NAME: "my-cache",
				CAMEL_NAME: "myCache",
				TYPE_SUFFIX: "KV",
			};

			service.generateKVHelper(vars);

			// Clear cache
			service.clearCache();

			// Should still work after cache clear
			const content = service.generateKVHelper(vars);

			expect(content).toContain("export class MyCacheKV");
		});
	});

	describe("template caching", () => {
		it("should cache templates after first load", () => {
			const vars: BindingTemplateVars = {
				BINDING_NAME: "MY_CACHE",
				HELPER_CLASS_NAME: "MyCacheKV",
				KEBAB_NAME: "my-cache",
				CAMEL_NAME: "myCache",
				TYPE_SUFFIX: "KV",
			};

			// Generate twice - second should use cache
			const content1 = service.generateKVHelper(vars);
			const content2 = service.generateKVHelper(vars);

			expect(content1).toBe(content2);
		});

		it("should cache different templates independently", () => {
			const kvVars: BindingTemplateVars = {
				BINDING_NAME: "MY_CACHE",
				HELPER_CLASS_NAME: "MyCacheKV",
				KEBAB_NAME: "my-cache",
				CAMEL_NAME: "myCache",
				TYPE_SUFFIX: "KV",
			};

			const d1Vars: BindingTemplateVars = {
				BINDING_NAME: "MY_DB",
				HELPER_CLASS_NAME: "MyDbD1",
				KEBAB_NAME: "my-db",
				CAMEL_NAME: "myDb",
				TYPE_SUFFIX: "D1",
				DATABASE_NAME: "my-database",
			};

			const kvContent = service.generateKVHelper(kvVars);
			const d1Content = service.generateD1Helper(d1Vars);

			expect(kvContent).toContain("KVNamespace");
			expect(d1Content).toContain("D1Database");
			expect(kvContent).not.toContain("D1Database");
			expect(d1Content).not.toContain("KVNamespace");
		});
	});
});
