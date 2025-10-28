/**
 * Unit tests for BindingValidator service
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BindingValidator } from "@/core/commands/shared/binding-validator.js";
import type { BindingScaffoldConfig } from "@/types/binding-types.js";

describe("BindingValidator", () => {
	let validator: BindingValidator;
	let testDir: string;

	beforeEach(async () => {
		validator = new BindingValidator();
		testDir = await mkdtemp(join(tmpdir(), "binding-validator-test-"));

		// Create minimal project structure
		await mkdir(join(testDir, "src"));
		await writeFile(join(testDir, "package.json"), "{}");
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	describe("validateBindingName()", () => {
		it("should accept valid binding names", async () => {
			const validNames = [
				"MY_CACHE",
				"USER_DATA",
				"PRODUCT_DB",
				"API_KEY",
				"SESSION_STORE",
				"CACHE123",
				"MY_CACHE_V2",
			];

			for (const name of validNames) {
				const config: BindingScaffoldConfig = {
					bindingType: "kv",
					bindingName: name,
				};

				// Create wrangler.jsonc with anchors
				await createWranglerWithAnchors(testDir);
				await createIndexWithAnchors(testDir);

				await expect(
					validator.validateBindingConfig(testDir, config),
				).resolves.not.toThrow();
			}
		});

		it("should reject binding names not starting with uppercase", async () => {
			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "myCache",
			};

			await createWranglerWithAnchors(testDir);
			await createIndexWithAnchors(testDir);

			await expect(
				validator.validateBindingConfig(testDir, config),
			).rejects.toThrow(/must start with an uppercase letter/i);
		});

		it("should reject binding names with lowercase letters", async () => {
			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "My_Cache",
			};

			await createWranglerWithAnchors(testDir);
			await createIndexWithAnchors(testDir);

			await expect(
				validator.validateBindingConfig(testDir, config),
			).rejects.toThrow(/must only contain uppercase letters/i);
		});

		it("should reject binding names with special characters", async () => {
			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "MY-CACHE",
			};

			await createWranglerWithAnchors(testDir);
			await createIndexWithAnchors(testDir);

			await expect(
				validator.validateBindingConfig(testDir, config),
			).rejects.toThrow(/must only contain uppercase letters/i);
		});

		it("should reject binding names ending with underscore", async () => {
			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "MY_CACHE_",
			};

			await createWranglerWithAnchors(testDir);
			await createIndexWithAnchors(testDir);

			await expect(
				validator.validateBindingConfig(testDir, config),
			).rejects.toThrow(/cannot end with an underscore/i);
		});

		it("should reject binding names with consecutive underscores", async () => {
			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "MY__CACHE",
			};

			await createWranglerWithAnchors(testDir);
			await createIndexWithAnchors(testDir);

			await expect(
				validator.validateBindingConfig(testDir, config),
			).rejects.toThrow(/cannot have consecutive underscores/i);
		});

		it("should accept binding names with numbers", async () => {
			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "CACHE_V2",
			};

			await createWranglerWithAnchors(testDir);
			await createIndexWithAnchors(testDir);

			await expect(
				validator.validateBindingConfig(testDir, config),
			).resolves.not.toThrow();
		});

		it("should reject binding names starting with numbers", async () => {
			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "2CACHE",
			};

			await createWranglerWithAnchors(testDir);
			await createIndexWithAnchors(testDir);

			await expect(
				validator.validateBindingConfig(testDir, config),
			).rejects.toThrow(/must start with an uppercase letter/i);
		});
	});

	describe("validateBindingType()", () => {
		it("should accept Phase 1 binding types (kv, d1)", async () => {
			const kvConfig: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "MY_CACHE",
			};

			const d1Config: BindingScaffoldConfig = {
				bindingType: "d1",
				bindingName: "MY_DB",
			};

			await createWranglerWithAnchors(testDir);
			await createIndexWithAnchors(testDir);

			await expect(
				validator.validateBindingConfig(testDir, kvConfig),
			).resolves.not.toThrow();
			await expect(
				validator.validateBindingConfig(testDir, d1Config),
			).resolves.not.toThrow();
		});

		it("should reject unimplemented binding types", async () => {
			const config: BindingScaffoldConfig = {
				bindingType: "queues",
				bindingName: "MY_BUCKET",
			};

			await createWranglerWithAnchors(testDir);
			await createIndexWithAnchors(testDir);

			await expect(
				validator.validateBindingConfig(testDir, config),
			).rejects.toThrow(/not yet implemented/i);
		});

		it("should reject unsupported binding types", async () => {
			const config: BindingScaffoldConfig = {
				bindingType: "invalid" as any,
				bindingName: "MY_BINDING",
			};

			await createWranglerWithAnchors(testDir);
			await createIndexWithAnchors(testDir);

			await expect(
				validator.validateBindingConfig(testDir, config),
			).rejects.toThrow(/unsupported binding type/i);
		});
	});

	describe("validateProjectStructure()", () => {
		it("should pass validation for valid project structure", async () => {
			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "MY_CACHE",
			};

			await createWranglerWithAnchors(testDir);
			await createIndexWithAnchors(testDir);

			await expect(
				validator.validateBindingConfig(testDir, config),
			).resolves.not.toThrow();
		});

		it("should fail when wrangler.jsonc is missing", async () => {
			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "MY_CACHE",
			};

			// Don't create wrangler.jsonc
			await expect(
				validator.validateBindingConfig(testDir, config),
			).rejects.toThrow(/wrangler.jsonc not found/i);
		});

		it("should fail when package.json is missing", async () => {
			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "MY_CACHE",
			};

			// Remove package.json
			await rm(join(testDir, "package.json"));

			await expect(
				validator.validateBindingConfig(testDir, config),
			).rejects.toThrow(/package.json not found/i);
		});

		it("should fail when src directory is missing", async () => {
			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "MY_CACHE",
			};

			// Remove src directory
			await rm(join(testDir, "src"), { recursive: true });

			await expect(
				validator.validateBindingConfig(testDir, config),
			).rejects.toThrow(/src directory not found/i);
		});
	});

	describe("validateNoDuplicateBinding()", () => {
		it("should pass when binding doesn't exist", async () => {
			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "MY_CACHE",
			};

			await createWranglerWithAnchors(testDir);
			await createIndexWithAnchors(testDir);

			await expect(
				validator.validateBindingConfig(testDir, config),
			).resolves.not.toThrow();
		});

		it("should fail when KV binding already exists", async () => {
			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "MY_CACHE",
			};

			await createWranglerWithAnchors(testDir, {
				kv_namespaces: [{ binding: "MY_CACHE", id: "abc123" }],
			});
			await createIndexWithAnchors(testDir);

			await expect(
				validator.validateBindingConfig(testDir, config),
			).rejects.toThrow(/already exists/i);
		});

		it("should fail when D1 binding already exists", async () => {
			const config: BindingScaffoldConfig = {
				bindingType: "d1",
				bindingName: "MY_DB",
			};

			await createWranglerWithAnchors(testDir, {
				d1_databases: [
					{ binding: "MY_DB", database_name: "my-db", database_id: "def456" },
				],
			});
			await createIndexWithAnchors(testDir);

			await expect(
				validator.validateBindingConfig(testDir, config),
			).rejects.toThrow(/already exists/i);
		});

		it("should allow duplicate checking to be disabled", async () => {
			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "MY_CACHE",
			};

			await createWranglerWithAnchors(testDir, {
				kv_namespaces: [{ binding: "MY_CACHE", id: "abc123" }],
			});
			await createIndexWithAnchors(testDir);

			// Disable duplicate checking
			await expect(
				validator.validateBindingConfig(testDir, config, {
					checkDuplicates: false,
				}),
			).resolves.not.toThrow();
		});
	});

	describe("validateAnchorsExist()", () => {
		it("should pass when all required anchors exist", async () => {
			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "MY_CACHE",
			};

			await createWranglerWithAnchors(testDir);
			await createIndexWithAnchors(testDir);

			await expect(
				validator.validateBindingConfig(testDir, config),
			).resolves.not.toThrow();
		});

		it("should fail when wrangler.jsonc anchor is missing", async () => {
			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "MY_CACHE",
			};

			// Create wrangler without anchors
			await writeFile(
				join(testDir, "wrangler.jsonc"),
				JSON.stringify({ name: "test" }),
			);
			await createIndexWithAnchors(testDir);

			await expect(
				validator.validateBindingConfig(testDir, config),
			).rejects.toThrow(/missing anchor block/i);
		});

		it("should fail when index.ts anchor is missing", async () => {
			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "MY_CACHE",
			};

			await createWranglerWithAnchors(testDir);
			// Create index without anchors
			await writeFile(join(testDir, "src", "index.ts"), "export default {};");

			await expect(
				validator.validateBindingConfig(testDir, config),
			).rejects.toThrow(/missing anchor block/i);
		});

		it("should allow anchor checking to be disabled", async () => {
			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "MY_CACHE",
			};

			// Create files without anchors
			await writeFile(
				join(testDir, "wrangler.jsonc"),
				JSON.stringify({ name: "test" }),
			);
			await writeFile(join(testDir, "src", "index.ts"), "export default {};");

			// Disable anchor checking
			await expect(
				validator.validateBindingConfig(testDir, config, {
					checkAnchors: false,
				}),
			).resolves.not.toThrow();
		});
	});

	describe("validateBindingSpecific()", () => {
		it("should validate D1 database name format", async () => {
			const validConfig: BindingScaffoldConfig = {
				bindingType: "d1",
				bindingName: "MY_DB",
				databaseName: "my-database",
			};

			await createWranglerWithAnchors(testDir);
			await createIndexWithAnchors(testDir);

			await expect(
				validator.validateBindingConfig(testDir, validConfig),
			).resolves.not.toThrow();
		});

		it("should reject invalid D1 database names", async () => {
			const invalidConfig: BindingScaffoldConfig = {
				bindingType: "d1",
				bindingName: "MY_DB",
				databaseName: "My_Database", // Must be lowercase with hyphens
			};

			await createWranglerWithAnchors(testDir);
			await createIndexWithAnchors(testDir);

			await expect(
				validator.validateBindingConfig(testDir, invalidConfig),
			).rejects.toThrow(/must be lowercase with hyphens/i);
		});

		it("should allow D1 without database name", async () => {
			const config: BindingScaffoldConfig = {
				bindingType: "d1",
				bindingName: "MY_DB",
				// databaseName will be generated
			};

			await createWranglerWithAnchors(testDir);
			await createIndexWithAnchors(testDir);

			await expect(
				validator.validateBindingConfig(testDir, config),
			).resolves.not.toThrow();
		});
	});

	describe("Error messages and suggestions", () => {
		it("should include helpful suggestions for invalid binding names", async () => {
			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "my-cache",
			};

			await createWranglerWithAnchors(testDir);
			await createIndexWithAnchors(testDir);

			try {
				await validator.validateBindingConfig(testDir, config);
				expect.fail("Should have thrown error");
			} catch (error: any) {
				expect(error.message).toContain("UPPER_SNAKE_CASE");
				expect(error.message).toContain("bindingName");
			}
		});

		it("should include suggestions for missing project structure", async () => {
			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "MY_CACHE",
			};

			// Remove wrangler.jsonc
			await rm(join(testDir, "wrangler.jsonc"), { force: true });

			try {
				await validator.validateBindingConfig(testDir, config);
				expect.fail("Should have thrown error");
			} catch (error: any) {
				expect(error.message).toContain("MCP server project");
			}
		});

		it("should include suggestions for duplicate bindings", async () => {
			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "MY_CACHE",
			};

			await createWranglerWithAnchors(testDir, {
				kv_namespaces: [{ binding: "MY_CACHE" }],
			});
			await createIndexWithAnchors(testDir);

			try {
				await validator.validateBindingConfig(testDir, config);
				expect.fail("Should have thrown error");
			} catch (error: any) {
				expect(error.message).toContain("already exists");
				expect(error.message).toContain("different binding name");
			}
		});
	});

	describe("Options handling", () => {
		it("should respect checkDuplicates option", async () => {
			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "MY_CACHE",
			};

			await createWranglerWithAnchors(testDir, {
				kv_namespaces: [{ binding: "MY_CACHE" }],
			});
			await createIndexWithAnchors(testDir);

			await expect(
				validator.validateBindingConfig(testDir, config, {
					checkDuplicates: false,
				}),
			).resolves.not.toThrow();
		});

		it("should respect checkAnchors option", async () => {
			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "MY_CACHE",
			};

			await writeFile(
				join(testDir, "wrangler.jsonc"),
				JSON.stringify({ name: "test" }),
			);
			await writeFile(join(testDir, "src", "index.ts"), "export default {};");

			await expect(
				validator.validateBindingConfig(testDir, config, { checkAnchors: false }),
			).resolves.not.toThrow();
		});

		it("should respect checkProjectStructure option", async () => {
			const config: BindingScaffoldConfig = {
				bindingType: "kv",
				bindingName: "MY_CACHE",
			};

			// Remove src directory
			await rm(join(testDir, "src"), { recursive: true });

			await expect(
				validator.validateBindingConfig(testDir, config, {
					checkProjectStructure: false,
					checkAnchors: false,
				}),
			).resolves.not.toThrow();
		});
	});
});

/**
 * Helper: Create wrangler.jsonc with binding anchors
 */
async function createWranglerWithAnchors(
	dir: string,
	existingBindings: any = {},
): Promise<void> {
	const wranglerContent = `{
	"name": "test-project",
	"main": "src/index.ts",
	"compatibility_date": "2025-03-10",
	${existingBindings.kv_namespaces ? `"kv_namespaces": ${JSON.stringify(existingBindings.kv_namespaces)},` : ""}
	${existingBindings.d1_databases ? `"d1_databases": ${JSON.stringify(existingBindings.d1_databases)},` : ""}
	// <mcp-bindings:kv>
	// KV namespace bindings managed by mcp-server-kit
	// </mcp-bindings:kv>
	// <mcp-bindings:d1>
	// D1 database bindings managed by mcp-server-kit
	// </mcp-bindings:d1>
	// <mcp-bindings:r2>
	// R2 bucket bindings managed by mcp-server-kit
	// </mcp-bindings:r2>
	"observability": {
		"enabled": true
	}
}`;

	await writeFile(join(dir, "wrangler.jsonc"), wranglerContent);
}

/**
 * Helper: Create index.ts with binding anchors
 */
async function createIndexWithAnchors(dir: string): Promise<void> {
	const indexContent = `/**
 * Test MCP Server
 */

import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// <mcp-bindings:imports>
// Binding helper imports will be added here by add binding command
// </mcp-bindings:imports>

export class MCPServerAgent extends McpAgent<Env> {
	server = new McpServer({
		name: "Test Server",
		version: "1.0.0",
	});

	async init() {}
}

export default {};
`;

	await writeFile(join(dir, "src", "index.ts"), indexContent);
}
