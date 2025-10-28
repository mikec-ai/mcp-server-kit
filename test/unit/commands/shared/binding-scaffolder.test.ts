/**
 * Unit tests for BindingScaffolder
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { BindingScaffolder } from "@/core/commands/shared/binding-scaffolder.js";
import type { BindingScaffoldConfig } from "@/types/binding-types.js";

describe("BindingScaffolder", () => {
	let scaffolder: BindingScaffolder;
	let testDir: string;

	beforeEach(async () => {
		scaffolder = new BindingScaffolder();
		testDir = await mkdtemp(join(tmpdir(), "binding-scaffolder-test-"));

		// Create minimal project structure
		await mkdir(join(testDir, "src"), { recursive: true });
		await writeFile(join(testDir, "package.json"), JSON.stringify({
			name: "test-project",
			scripts: {
				"cf-typegen": "echo 'typegen skipped in test'"
			}
		}));
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
		vi.restoreAllMocks();
	});

	describe("scaffold() - KV binding", () => {
		it("should successfully scaffold KV binding", async () => {
			// Setup
			await createValidProject(testDir);

			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "MY_CACHE",
			};

			// Execute
			const result = await scaffolder.scaffold(testDir, config);

			// Assert
			expect(result.success).toBe(true);
			expect(result.bindingType).toBe("kv");
			expect(result.bindingName).toBe("MY_CACHE");
			expect(result.error).toBeUndefined();
		});

		it("should create helper file", async () => {
			await createValidProject(testDir);

			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "MY_CACHE",
			};

			const result = await scaffolder.scaffold(testDir, config);

			expect(result.helperPath).toBeDefined();
			expect(result.helperPath).toContain("kv-my-cache.ts");
			expect(existsSync(result.helperPath!)).toBe(true);

			const content = readFileSync(result.helperPath!, "utf-8");
			expect(content).toContain("export class MyCacheKV");
		});

		it("should update wrangler.jsonc", async () => {
			await createValidProject(testDir);

			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "MY_CACHE",
			};

			const result = await scaffolder.scaffold(testDir, config);

			const wranglerPath = join(testDir, "wrangler.jsonc");
			const content = readFileSync(wranglerPath, "utf-8");

			expect(content).toContain("kv_namespaces");
			expect(content).toContain('"binding": "MY_CACHE"');
		});

		it("should add import to index.ts", async () => {
			await createValidProject(testDir);

			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "MY_CACHE",
			};

			const result = await scaffolder.scaffold(testDir, config);

			const indexPath = join(testDir, "src", "index.ts");
			const content = readFileSync(indexPath, "utf-8");

			expect(content).toContain("import { MyCacheKV }");
			expect(content).toContain('from "./utils/bindings/kv-my-cache.js"');
		});

		it("should generate correct next steps", async () => {
			await createValidProject(testDir);

			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "MY_CACHE",
			};

			const result = await scaffolder.scaffold(testDir, config);

			expect(result.nextSteps).toBeDefined();
			expect(result.nextSteps.length).toBeGreaterThan(0);
			expect(result.nextSteps.some(s => s.includes("wrangler kv namespace create"))).toBe(true);
			expect(result.nextSteps.some(s => s.includes("MyCacheKV"))).toBe(true);
		});

		it("should track files created and modified", async () => {
			await createValidProject(testDir);

			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "MY_CACHE",
			};

			const result = await scaffolder.scaffold(testDir, config);

			expect(result.filesCreated.length).toBeGreaterThan(0);
			expect(result.filesModified.length).toBeGreaterThan(0);
			expect(result.filesCreated.some(f => f.includes("kv-my-cache.ts"))).toBe(true);
			expect(result.filesModified.some(f => f.includes("wrangler.jsonc"))).toBe(true);
		});
	});

	describe("scaffold() - D1 binding", () => {
		it("should successfully scaffold D1 binding", async () => {
			await createValidProject(testDir);

			const config: BindingScaffoldConfig = {
				bindingType: "d1",
				bindingName: "MY_DB",
				databaseName: "my-database",
			};

			const result = await scaffolder.scaffold(testDir, config);

			expect(result.success).toBe(true);
			expect(result.bindingType).toBe("d1");
			expect(result.bindingName).toBe("MY_DB");
		});

		it("should create D1 helper file", async () => {
			await createValidProject(testDir);

			const config: BindingScaffoldConfig = {
				bindingType: "d1",
				bindingName: "MY_DB",
				databaseName: "my-database",
			};

			const result = await scaffolder.scaffold(testDir, config);

			expect(result.helperPath).toBeDefined();
			expect(result.helperPath).toContain("d1-my-db.ts");
			expect(existsSync(result.helperPath!)).toBe(true);

			const content = readFileSync(result.helperPath!, "utf-8");
			expect(content).toContain("export class MyDbD1");
			expect(content).toContain("my-database");
		});

		it("should generate database name from binding name if not provided", async () => {
			await createValidProject(testDir);

			const config: BindingScaffoldConfig = {
				bindingType: "d1",
				bindingName: "USER_DATA",
				// databaseName not provided
			};

			const result = await scaffolder.scaffold(testDir, config);

			const wranglerPath = join(testDir, "wrangler.jsonc");
			const content = readFileSync(wranglerPath, "utf-8");

			expect(content).toContain('"database_name": "user-data"');
		});

		it("should generate correct D1 next steps", async () => {
			await createValidProject(testDir);

			const config: BindingScaffoldConfig = {
				bindingType: "d1",
				bindingName: "MY_DB",
				databaseName: "my-database",
			};

			const result = await scaffolder.scaffold(testDir, config);

			expect(result.nextSteps.some(s => s.includes("wrangler d1 create"))).toBe(true);
			expect(result.nextSteps.some(s => s.includes("schema.sql"))).toBe(true);
			expect(result.nextSteps.some(s => s.includes("MyDbD1"))).toBe(true);
		});
	});

	describe("scaffold() - validation", () => {
		it("should fail if project structure is invalid", async () => {
			// Don't create wrangler.jsonc

			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "MY_CACHE",
			};

			const result = await scaffolder.scaffold(testDir, config);

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
			expect(result.error).toContain("wrangler.jsonc");
		});

		it("should fail if binding name is invalid", async () => {
			await createValidProject(testDir);

			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "my-cache", // Invalid: should be UPPER_SNAKE_CASE
			};

			const result = await scaffolder.scaffold(testDir, config);

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it("should fail if anchors are missing", async () => {
			// Create project without anchors (src/ already exists from beforeEach)
			await writeFile(join(testDir, "wrangler.jsonc"), JSON.stringify({ name: "test" }));
			await writeFile(join(testDir, "src", "index.ts"), "export default {};");

			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "MY_CACHE",
			};

			const result = await scaffolder.scaffold(testDir, config);

			expect(result.success).toBe(false);
			expect(result.error).toContain("anchor");
		});
	});

	describe("scaffold() - options", () => {
		it("should skip helper generation when skipHelper is true", async () => {
			await createValidProject(testDir);

			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "MY_CACHE",
				skipHelper: true,
			};

			const result = await scaffolder.scaffold(testDir, config);

			expect(result.success).toBe(true);
			expect(result.helperPath).toBeUndefined();
			expect(result.filesCreated.length).toBe(0);
		});

		it("should still update wrangler.jsonc when skipHelper is true", async () => {
			await createValidProject(testDir);

			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "MY_CACHE",
				skipHelper: true,
			};

			const result = await scaffolder.scaffold(testDir, config);

			const wranglerPath = join(testDir, "wrangler.jsonc");
			const content = readFileSync(wranglerPath, "utf-8");

			expect(content).toContain('"binding": "MY_CACHE"');
		});

		it("should skip cf-typegen when skipTypegen is true", async () => {
			await createValidProject(testDir);

			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "MY_CACHE",
				skipTypegen: true,
			};

			const result = await scaffolder.scaffold(testDir, config);

			expect(result.success).toBe(true);
			// Should not have worker-configuration.d.ts in modified files
			expect(result.filesModified.some(f => f.includes("worker-configuration.d.ts"))).toBe(false);
		});
	});

	describe("scaffold() - error handling", () => {
		it("should rollback on failure", async () => {
			await createValidProject(testDir);

			// Create a scenario that will fail mid-way
			// (e.g., by making wrangler.jsonc read-only after validation)
			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "MY_CACHE",
			};

			// Mock the config updater to throw an error
			vi.spyOn(await import("@/core/commands/shared/config/binding-config-updater.js"), "addKVBinding")
				.mockRejectedValueOnce(new Error("Simulated failure"));

			const result = await scaffolder.scaffold(testDir, config);

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it("should include rollback warning in result", async () => {
			await createValidProject(testDir);

			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "MY_CACHE",
			};

			// Mock failure
			vi.spyOn(await import("@/core/commands/shared/config/binding-config-updater.js"), "addKVBinding")
				.mockRejectedValueOnce(new Error("Simulated failure"));

			const result = await scaffolder.scaffold(testDir, config);

			expect(result.warnings).toBeDefined();
			expect(result.warnings!.some(w => w.includes("rolled back"))).toBe(true);
		});
	});

	describe("template variable generation", () => {
		it("should generate correct variables for KV binding", async () => {
			await createValidProject(testDir);

			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "USER_CACHE",
			};

			const result = await scaffolder.scaffold(testDir, config);

			// Check generated file contains correct names
			const helperContent = readFileSync(result.helperPath!, "utf-8");
			expect(helperContent).toContain("UserCacheKV");
			expect(helperContent).toContain("userCache");
			expect(helperContent).toContain("USER_CACHE");
		});

		it("should handle multi-word binding names", async () => {
			await createValidProject(testDir);

			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "PRODUCT_CATALOG_CACHE",
			};

			const result = await scaffolder.scaffold(testDir, config);

			const helperContent = readFileSync(result.helperPath!, "utf-8");
			expect(helperContent).toContain("ProductCatalogCacheKV");
			expect(helperContent).toContain("productCatalogCache");
		});
	});

	describe("cf-typegen execution", () => {
		it("should execute cf-typegen when not skipped", async () => {
			await createValidProject(testDir);

			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "MY_CACHE",
				skipTypegen: false, // Explicitly not skipping
			};

			const result = await scaffolder.scaffold(testDir, config);

			expect(result.success).toBe(true);
			// cf-typegen runs but we mock it in package.json to just echo,
			// so it should succeed without adding worker-configuration.d.ts
		});
	});
});

/**
 * Helper: Create a valid project structure for testing
 */
async function createValidProject(dir: string): Promise<void> {
	// Create directories
	await mkdir(join(dir, "src"), { recursive: true });

	// Create wrangler.jsonc with anchors
	await writeFile(
		join(dir, "wrangler.jsonc"),
		`{
	"name": "test-project",
	"main": "src/index.ts",
	// <mcp-bindings:kv>
	// KV namespace bindings managed by mcp-server-kit
	// </mcp-bindings:kv>
	// <mcp-bindings:d1>
	// D1 database bindings managed by mcp-server-kit
	// </mcp-bindings:d1>
	"observability": {
		"enabled": true
	}
}`,
	);

	// Create index.ts with anchor
	await writeFile(
		join(dir, "src", "index.ts"),
		`import { McpAgent } from "agents/mcp";
// <mcp-bindings:imports>
// Binding helper imports will be added here by add binding command
// </mcp-bindings:imports>

export class MCPServerAgent extends McpAgent<Env> {}
export default {};
`,
	);

	// Create package.json
	await writeFile(
		join(dir, "package.json"),
		JSON.stringify({
			name: "test-project",
			scripts: {
				"cf-typegen": "echo 'typegen skipped in test'",
			},
		}),
	);
}
