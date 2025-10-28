/**
 * add-binding - Unit Tests
 *
 * Real executable tests for the add binding command that verify actual behavior
 * using temporary file system operations.
 */

import { describe, it, expect, afterEach } from "vitest";
import { rm, readFile, access } from "node:fs/promises";
import { join } from "node:path";
import { createTestProject, getTempDir } from "../../helpers/project-setup.js";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

describe("add-binding command", () => {
	let projectDir: string;

	afterEach(async () => {
		if (projectDir) {
			await rm(getTempDir(projectDir), { recursive: true, force: true });
		}
	});

	/**
	 * Helper to run add-binding command
	 */
	async function runAddBinding(
		cwd: string,
		bindingType: string,
		options: {
			name: string;
			database?: string;
			skipHelper?: boolean;
			skipTypegen?: boolean;
			json?: boolean;
		},
	): Promise<{ success: boolean; stdout: string; stderr: string }> {
		const cliPath = join(process.cwd(), "bin", "mcp-server-kit.js");

		const args = ["add", "binding", bindingType, "--name", options.name];

		if (options.database) {
			args.push("--database", options.database);
		}
		if (options.skipHelper) {
			args.push("--skip-helper");
		}
		if (options.skipTypegen) {
			args.push("--skip-typegen");
		}
		if (options.json) {
			args.push("--json");
		}

		try {
			const { stdout, stderr } = await execAsync(
				`node "${cliPath}" ${args.join(" ")}`,
				{
					cwd,
				},
			);
			return { success: true, stdout, stderr };
		} catch (error: any) {
			return {
				success: false,
				stdout: error.stdout || "",
				stderr: error.stderr || "",
			};
		}
	}

	describe("KV binding", () => {
		it("should add KV binding successfully", async () => {
			projectDir = await createTestProject();

			const result = await runAddBinding(projectDir, "kv", {
				name: "MY_CACHE",
			});

			expect(result.success).toBe(true);
			expect(result.stdout).toContain("KV binding added successfully");

			// Verify helper file was created
			const helperPath = join(
				projectDir,
				"src",
				"utils",
				"bindings",
				"kv-my-cache.ts",
			);
			await expect(access(helperPath)).resolves.toBeUndefined();

			// Verify helper contains correct class name
			const helperContent = await readFile(helperPath, "utf-8");
			expect(helperContent).toContain("export class MyCacheKV");
		});

		it("should update wrangler.jsonc with KV binding", async () => {
			projectDir = await createTestProject();

			await runAddBinding(projectDir, "kv", { name: "USER_DATA" });

			const wranglerPath = join(projectDir, "wrangler.jsonc");
			const wranglerContent = await readFile(wranglerPath, "utf-8");

			expect(wranglerContent).toContain('"kv_namespaces"');
			expect(wranglerContent).toContain('"binding": "USER_DATA"');
		});

		it("should add import to index.ts", async () => {
			projectDir = await createTestProject();

			await runAddBinding(projectDir, "kv", { name: "SESSION_STORE" });

			const indexPath = join(projectDir, "src", "index.ts");
			const indexContent = await readFile(indexPath, "utf-8");

			expect(indexContent).toContain("import { SessionStoreKV }");
			expect(indexContent).toContain(
				'from "./utils/bindings/kv-session-store.js"',
			);
		});

		it("should skip helper generation when --skip-helper is used", async () => {
			projectDir = await createTestProject();

			const result = await runAddBinding(projectDir, "kv", {
				name: "TEMP_CACHE",
				skipHelper: true,
			});

			expect(result.success).toBe(true);

			// Verify helper file was NOT created
			const helperPath = join(
				projectDir,
				"src",
				"utils",
				"bindings",
				"kv-temp-cache.ts",
			);
			await expect(access(helperPath)).rejects.toThrow();

			// But wrangler.jsonc should still be updated
			const wranglerContent = await readFile(
				join(projectDir, "wrangler.jsonc"),
				"utf-8",
			);
			expect(wranglerContent).toContain('"binding": "TEMP_CACHE"');
		});
	});

	describe("D1 binding", () => {
		it("should add D1 binding successfully", async () => {
			projectDir = await createTestProject();

			const result = await runAddBinding(projectDir, "d1", {
				name: "MY_DB",
				database: "my-database",
			});

			expect(result.success).toBe(true);
			expect(result.stdout).toContain("D1 binding added successfully");

			// Verify helper file was created
			const helperPath = join(
				projectDir,
				"src",
				"utils",
				"bindings",
				"d1-my-db.ts",
			);
			await expect(access(helperPath)).resolves.toBeUndefined();

			// Verify helper contains correct class name
			const helperContent = await readFile(helperPath, "utf-8");
			expect(helperContent).toContain("export class MyDbD1");
		});

		it("should update wrangler.jsonc with D1 binding", async () => {
			projectDir = await createTestProject();

			await runAddBinding(projectDir, "d1", {
				name: "USER_DB",
				database: "users",
			});

			const wranglerPath = join(projectDir, "wrangler.jsonc");
			const wranglerContent = await readFile(wranglerPath, "utf-8");

			expect(wranglerContent).toContain('"d1_databases"');
			expect(wranglerContent).toContain('"binding": "USER_DB"');
			expect(wranglerContent).toContain('"database_name": "users"');
		});

		it("should generate database name from binding name if not provided", async () => {
			projectDir = await createTestProject();

			await runAddBinding(projectDir, "d1", {
				name: "PRODUCT_DATA",
			});

			const wranglerPath = join(projectDir, "wrangler.jsonc");
			const wranglerContent = await readFile(wranglerPath, "utf-8");

			expect(wranglerContent).toContain('"database_name": "product-data"');
		});
	});

	describe("validation", () => {
		it("should reject invalid binding type", async () => {
			projectDir = await createTestProject();

			const result = await runAddBinding(projectDir, "invalid-type", {
				name: "TEST",
			});

			expect(result.success).toBe(false);
			expect(result.stderr).toContain("Invalid binding type");
		});

		it("should reject Phase 2+ binding types", async () => {
			projectDir = await createTestProject();

			const result = await runAddBinding(projectDir, "queues", {
				name: "MY_BUCKET",
			});

			expect(result.success).toBe(false);
			expect(result.stderr).toContain("not yet supported");
			expect(result.stderr).toContain("Phase 1");
		});

		it("should reject invalid binding names (lowercase)", async () => {
			projectDir = await createTestProject();

			const result = await runAddBinding(projectDir, "kv", {
				name: "my-cache",
			});

			expect(result.success).toBe(false);
			expect(result.stderr).toContain("UPPER_SNAKE_CASE");
		});

		it("should reject invalid binding names (with hyphens)", async () => {
			projectDir = await createTestProject();

			const result = await runAddBinding(projectDir, "kv", {
				name: "MY-CACHE",
			});

			expect(result.success).toBe(false);
			expect(result.stderr).toContain("UPPER_SNAKE_CASE");
		});

		it("should accept valid UPPER_SNAKE_CASE names", async () => {
			projectDir = await createTestProject();

			const result = await runAddBinding(projectDir, "kv", {
				name: "MY_SUPER_LONG_CACHE_NAME",
			});

			expect(result.success).toBe(true);
		});

		it("should reject duplicate binding names", async () => {
			projectDir = await createTestProject();

			// Add first binding
			const first = await runAddBinding(projectDir, "kv", {
				name: "MY_CACHE",
			});
			expect(first.success).toBe(true);

			// Try to add duplicate
			const duplicate = await runAddBinding(projectDir, "kv", {
				name: "MY_CACHE",
			});
			expect(duplicate.success).toBe(false);
			expect(duplicate.stderr).toContain("already exists");
		});
	});

	describe("options", () => {
		it("should skip cf-typegen when --skip-typegen is used", async () => {
			projectDir = await createTestProject();

			const result = await runAddBinding(projectDir, "kv", {
				name: "FAST_CACHE",
				skipTypegen: true,
			});

			expect(result.success).toBe(true);

			// Should not mention typegen in output
			expect(result.stdout).not.toContain("cf-typegen");
		});

		it("should output JSON when --json is used", async () => {
			projectDir = await createTestProject();

			const result = await runAddBinding(projectDir, "kv", {
				name: "JSON_CACHE",
				json: true,
			});

			expect(result.success).toBe(true);

			// Parse JSON output
			const output = JSON.parse(result.stdout);
			expect(output.success).toBe(true);
			expect(output.bindingType).toBe("kv");
			expect(output.bindingName).toBe("JSON_CACHE");
			expect(output.filesCreated).toBeDefined();
			expect(output.filesModified).toBeDefined();
			expect(output.nextSteps).toBeDefined();
		});
	});

	describe("next steps", () => {
		it("should provide next steps for KV binding", async () => {
			projectDir = await createTestProject();

			const result = await runAddBinding(projectDir, "kv", {
				name: "MY_CACHE",
			});

			expect(result.stdout).toContain("Next steps:");
			expect(result.stdout).toContain("wrangler kv namespace create");
			expect(result.stdout).toContain("wrangler.jsonc");
			expect(result.stdout).toContain("MyCacheKV");
		});

		it("should provide next steps for D1 binding", async () => {
			projectDir = await createTestProject();

			const result = await runAddBinding(projectDir, "d1", {
				name: "MY_DB",
			});

			expect(result.stdout).toContain("Next steps:");
			expect(result.stdout).toContain("wrangler d1 create");
			expect(result.stdout).toContain("schema.sql");
			expect(result.stdout).toContain("MyDbD1");
		});
	});

	describe("multi-word binding names", () => {
		it("should handle multi-word KV binding names", async () => {
			projectDir = await createTestProject();

			const result = await runAddBinding(projectDir, "kv", {
				name: "PRODUCT_CATALOG_CACHE",
			});

			expect(result.success).toBe(true);

			const helperPath = join(
				projectDir,
				"src",
				"utils",
				"bindings",
				"kv-product-catalog-cache.ts",
			);
			const helperContent = await readFile(helperPath, "utf-8");

			expect(helperContent).toContain("export class ProductCatalogCacheKV");
			expect(helperContent).toContain("productCatalogCache");
		});

		it("should handle multi-word D1 binding names", async () => {
			projectDir = await createTestProject();

			const result = await runAddBinding(projectDir, "d1", {
				name: "USER_ANALYTICS_DATA",
			});

			expect(result.success).toBe(true);

			const helperPath = join(
				projectDir,
				"src",
				"utils",
				"bindings",
				"d1-user-analytics-data.ts",
			);
			const helperContent = await readFile(helperPath, "utf-8");

			expect(helperContent).toContain("export class UserAnalyticsDataD1");
			expect(helperContent).toContain("userAnalyticsData");
		});
	});
});
