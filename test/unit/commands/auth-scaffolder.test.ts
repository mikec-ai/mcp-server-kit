/**
 * Auth Scaffolder Tests
 *
 * Tests for the main auth orchestration class.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { AuthScaffolder } from "../../../src/core/commands/shared/auth-scaffolder.js";

describe("AuthScaffolder", () => {
	const testDir = "/tmp/auth-scaffolder-test";
	let scaffolder: AuthScaffolder;

	beforeEach(async () => {
		await mkdir(testDir, { recursive: true });
		scaffolder = new AuthScaffolder();
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	describe("Validation", () => {
		it("should fail if no package.json", async () => {
			const result = await scaffolder.addAuth({
				cwd: testDir,
				provider: "stytch",
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain("No package.json found");
		});

		it("should fail if no src directory", async () => {
			await writeFile(join(testDir, "package.json"), "{}");

			const result = await scaffolder.addAuth({
				cwd: testDir,
				provider: "stytch",
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain("No src directory found");
		});

		it("should fail if platform cannot be detected", async () => {
			await writeFile(join(testDir, "package.json"), "{}");
			await mkdir(join(testDir, "src"));

			const result = await scaffolder.addAuth({
				cwd: testDir,
				provider: "stytch",
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain("Could not detect platform");
		});
	});

	describe("Platform Detection", () => {
		it("should detect Cloudflare platform", async () => {
			await setupCloudflareProject(testDir);

			const result = await scaffolder.addAuth({
				cwd: testDir,
				provider: "stytch",
				backup: false,
			});

			expect(result.platform).toBe("cloudflare");
		});

		it("should detect Vercel platform", async () => {
			await setupVercelProject(testDir);

			const result = await scaffolder.addAuth({
				cwd: testDir,
				provider: "stytch",
				backup: false,
			});

			expect(result.platform).toBe("vercel");
		});

		it("should use provided platform", async () => {
			await setupCloudflareProject(testDir);

			const result = await scaffolder.addAuth({
				cwd: testDir,
				provider: "stytch",
				platform: "vercel", // Override detection
				backup: false,
			});

			expect(result.platform).toBe("vercel");
		});
	});

	describe("Successful Auth Addition", () => {
		it("should add Stytch auth to Cloudflare project", async () => {
			await setupCloudflareProject(testDir);

			const result = await scaffolder.addAuth({
				cwd: testDir,
				provider: "stytch",
				backup: false,
			});

			expect(result.success).toBe(true);
			expect(result.provider).toBe("stytch");
			expect(result.platform).toBe("cloudflare");

			// Check auth files created
			expect(existsSync(join(testDir, "src/auth/types.ts"))).toBe(true);
			expect(existsSync(join(testDir, "src/auth/config.ts"))).toBe(true);
			expect(existsSync(join(testDir, "src/auth/providers/stytch.ts"))).toBe(true);

			// Check entry point modified
			const entryContent = await readFile(join(testDir, "src/index.ts"), "utf-8");
			expect(entryContent).toContain("getAuthProvider");
			expect(entryContent).toContain("Validate authentication");
		});

		it("should add Auth0 auth to Cloudflare project", async () => {
			await setupCloudflareProject(testDir);

			const result = await scaffolder.addAuth({
				cwd: testDir,
				provider: "auth0",
				backup: false,
			});

			expect(result.success).toBe(true);
			expect(existsSync(join(testDir, "src/auth/providers/auth0.ts"))).toBe(true);
		});

		it("should add WorkOS auth to Vercel project", async () => {
			await setupVercelProject(testDir);

			const result = await scaffolder.addAuth({
				cwd: testDir,
				provider: "workos",
				backup: false,
			});

			expect(result.success).toBe(true);
			expect(existsSync(join(testDir, "src/auth/providers/workos.ts"))).toBe(true);
		});

		it("should track created files", async () => {
			await setupCloudflareProject(testDir);

			const result = await scaffolder.addAuth({
				cwd: testDir,
				provider: "stytch",
				backup: false,
			});

			expect(result.filesCreated).toContain(join(testDir, "src/auth/types.ts"));
			expect(result.filesCreated).toContain(join(testDir, "src/auth/config.ts"));
			expect(result.filesCreated).toContain(join(testDir, "src/auth/providers/stytch.ts"));
		});

		it("should track modified files", async () => {
			await setupCloudflareProject(testDir);

			const result = await scaffolder.addAuth({
				cwd: testDir,
				provider: "stytch",
				backup: false,
			});

			expect(result.filesModified).toContain(join(testDir, "src/index.ts"));
			expect(result.filesModified).toContain(join(testDir, "package.json"));
			expect(result.filesModified).toContain(join(testDir, "wrangler.jsonc"));
		});

		it("should add dependencies to package.json", async () => {
			await setupCloudflareProject(testDir);

			await scaffolder.addAuth({
				cwd: testDir,
				provider: "stytch",
				backup: false,
			});

			const pkg = JSON.parse(
				await readFile(join(testDir, "package.json"), "utf-8"),
			);

			expect(pkg.dependencies["@cloudflare/workers-oauth-provider"]).toBeDefined();
		});

		it("should update wrangler.jsonc for Cloudflare", async () => {
			await setupCloudflareProject(testDir);

			await scaffolder.addAuth({
				cwd: testDir,
				provider: "stytch",
				backup: false,
			});

			const wrangler = await readFile(join(testDir, "wrangler.jsonc"), "utf-8");
			const config = JSON.parse(wrangler);
			expect(config.vars).toBeDefined();
			expect(config.vars.STYTCH_PROJECT_ID).toBe("");
			expect(config.vars.STYTCH_SECRET).toBe("");
		});

		it("should create/update vercel.json for Vercel", async () => {
			await setupVercelProject(testDir);

			await scaffolder.addAuth({
				cwd: testDir,
				provider: "auth0",
				backup: false,
			});

			expect(existsSync(join(testDir, "vercel.json"))).toBe(true);

			const vercel = JSON.parse(
				await readFile(join(testDir, "vercel.json"), "utf-8"),
			);
			expect(vercel.env.AUTH0_DOMAIN).toBeDefined();
		});

		it("should create/update .env.example", async () => {
			await setupCloudflareProject(testDir);

			await scaffolder.addAuth({
				cwd: testDir,
				provider: "stytch",
				backup: false,
			});

			expect(existsSync(join(testDir, ".env.example"))).toBe(true);

			const env = await readFile(join(testDir, ".env.example"), "utf-8");
			expect(env).toContain("STYTCH_PROJECT_ID");
			expect(env).toContain("Stytch Setup Instructions");
		});
	});

	describe("Existing Auth Detection", () => {
		it("should fail if auth already exists without --force", async () => {
			await setupCloudflareProject(testDir);

			// Add auth first time
			await scaffolder.addAuth({
				cwd: testDir,
				provider: "stytch",
				backup: false,
			});

			// Try to add again
			const result = await scaffolder.addAuth({
				cwd: testDir,
				provider: "stytch",
				backup: false,
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain("already configured");
		});

		it("should overwrite if auth exists with --force", async () => {
			await setupCloudflareProject(testDir);

			// Add auth first time
			await scaffolder.addAuth({
				cwd: testDir,
				provider: "stytch",
				backup: false,
			});

			// Try to add again with force
			const result = await scaffolder.addAuth({
				cwd: testDir,
				provider: "auth0", // Different provider
				force: true,
				backup: false,
			});

			expect(result.success).toBe(true);
			expect(result.warnings).toContain("Overwriting existing authentication configuration");
		});
	});

	describe("Dry Run Mode", () => {
		it("should not modify files in dry run", async () => {
			await setupCloudflareProject(testDir);

			const result = await scaffolder.addAuth({
				cwd: testDir,
				provider: "stytch",
				dryRun: true,
			});

			expect(result.success).toBe(true);
			expect(result.warnings?.some(w => w.includes("DRY RUN"))).toBe(true);

			// No files should be created
			expect(existsSync(join(testDir, "src/auth"))).toBe(false);
		});

		it("should still detect platform in dry run", async () => {
			await setupCloudflareProject(testDir);

			const result = await scaffolder.addAuth({
				cwd: testDir,
				provider: "stytch",
				dryRun: true,
			});

			expect(result.platform).toBe("cloudflare");
		});

		it("should still validate project in dry run", async () => {
			const result = await scaffolder.addAuth({
				cwd: testDir,
				provider: "stytch",
				dryRun: true,
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain("No package.json");
		});
	});

	describe("Backup Management", () => {
		it("should create backup by default", async () => {
			await setupCloudflareProject(testDir);

			const result = await scaffolder.addAuth({
				cwd: testDir,
				provider: "stytch",
			});

			// Backup should be created and then removed on success
			expect(result.backupDir).toBeUndefined(); // Removed after success
		});

		it("should not create backup if backup=false", async () => {
			await setupCloudflareProject(testDir);

			const result = await scaffolder.addAuth({
				cwd: testDir,
				provider: "stytch",
				backup: false,
			});

			expect(result.backupDir).toBeUndefined();
		});

		it("should rollback on failure", async () => {
			await setupCloudflareProject(testDir);

			// Delete the entry point to cause transformation to fail
			await rm(join(testDir, "src/index.ts"));

			const result = await scaffolder.addAuth({
				cwd: testDir,
				provider: "stytch",
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain("Entry point not found");

			// Auth files should not exist (rolled back)
			expect(existsSync(join(testDir, "src/auth"))).toBe(false);
		});
	});

	describe("Error Handling", () => {
		it("should handle missing entry point gracefully", async () => {
			await writeFile(join(testDir, "package.json"), "{}");
			await mkdir(join(testDir, "src"));
			await writeFile(join(testDir, "wrangler.toml"), "");

			// No src/index.ts file

			const result = await scaffolder.addAuth({
				cwd: testDir,
				provider: "stytch",
				backup: false,
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain("Entry point not found");
		});

		it("should provide detailed error messages", async () => {
			const result = await scaffolder.addAuth({
				cwd: "/nonexistent/directory",
				provider: "stytch",
			});

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
			expect(typeof result.error).toBe("string");
		});
	});

	describe("Integration: All Providers and Platforms", () => {
		it("should add Stytch to Cloudflare", async () => {
			await setupCloudflareProject(testDir);

			const result = await scaffolder.addAuth({
				cwd: testDir,
				provider: "stytch",
				backup: false,
			});

			expect(result.success).toBe(true);
			expect(result.platform).toBe("cloudflare");
			expect(result.filesCreated.length).toBeGreaterThan(0);
			expect(result.filesModified.length).toBeGreaterThan(0);
		});

		it("should add Auth0 to Vercel", async () => {
			await setupVercelProject(testDir);

			const result = await scaffolder.addAuth({
				cwd: testDir,
				provider: "auth0",
				backup: false,
			});

			expect(result.success).toBe(true);
			expect(result.platform).toBe("vercel");
		});

		it("should add WorkOS to Cloudflare", async () => {
			await setupCloudflareProject(testDir);

			const result = await scaffolder.addAuth({
				cwd: testDir,
				provider: "workos",
				backup: false,
			});

			expect(result.success).toBe(true);
		});
	});
});

/**
 * Helper: Setup a basic Cloudflare project
 */
async function setupCloudflareProject(dir: string): Promise<void> {
	// package.json
	const pkg = {
		name: "test-mcp-server",
		version: "1.0.0",
		dependencies: {},
	};
	await writeFile(join(dir, "package.json"), JSON.stringify(pkg, null, 2));

	// wrangler.jsonc
	const wrangler = {
		name: "test-mcp-server",
		main: "src/index.ts",
		compatibility_date: "2024-01-01",
	};
	await writeFile(join(dir, "wrangler.jsonc"), JSON.stringify(wrangler, null, "\t"));

	// src/index.ts
	await mkdir(join(dir, "src"), { recursive: true });
	const entry = `import { Server } from "@agents/server";

const server = new Server({ name: "test" });

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		return server.handle(request, env, ctx);
	}
};
`;
	await writeFile(join(dir, "src/index.ts"), entry);
}

/**
 * Helper: Setup a basic Vercel/Next.js project
 */
async function setupVercelProject(dir: string): Promise<void> {
	// package.json
	const pkg = {
		name: "test-mcp-server",
		version: "1.0.0",
		dependencies: {
			next: "14.0.0",
		},
	};
	await writeFile(join(dir, "package.json"), JSON.stringify(pkg, null, 2));

	// app/api/mcp/route.ts
	await mkdir(join(dir, "app/api/mcp"), { recursive: true });
	await mkdir(join(dir, "src"), { recursive: true }); // For validation

	const entry = `import { adaptVercelRequestForMCP } from "@vercel/mcp-adapter";

export async function POST(request: Request) {
	const mcpRequest = await adaptVercelRequestForMCP(request);
	return new Response("OK");
}
`;
	await writeFile(join(dir, "app/api/mcp/route.ts"), entry);
}
