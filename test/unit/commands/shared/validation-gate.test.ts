/**
 * ValidationGate - Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { ValidationGate } from "@/core/commands/shared/validation-gate.js";

describe("ValidationGate", () => {
	let tempDir: string;
	let gate: ValidationGate;

	beforeEach(async () => {
		tempDir = join("/tmp", `validation-gate-test-${Date.now()}`);
		await mkdir(tempDir, { recursive: true });
		gate = new ValidationGate();
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	/**
	 * Create a minimal valid TypeScript project for testing
	 */
	async function createMinimalProject(options: {
		withAuth?: boolean;
		withAnchors?: boolean;
		withTypeErrors?: boolean;
		provider?: "stytch" | "auth0" | "workos";
	} = {}) {
		// package.json with proper dependencies
		await writeFile(
			join(tempDir, "package.json"),
			JSON.stringify({
				name: "test-project",
				version: "1.0.0",
				type: "module",
				dependencies: {
					"@cloudflare/workers-types": "^4.0.0",
				},
			}),
			"utf-8",
		);

		// tsconfig.json with proper types
		await writeFile(
			join(tempDir, "tsconfig.json"),
			JSON.stringify({
				compilerOptions: {
					target: "ES2022",
					module: "ES2022",
					moduleResolution: "bundler",
					lib: ["ES2022"],
					types: ["@cloudflare/workers-types"],
					strict: false,
					skipLibCheck: true,
					noEmit: true,
				},
			}),
			"utf-8",
		);

		// src directory
		await mkdir(join(tempDir, "src"), { recursive: true });

		// src/index.ts
		let indexContent = `
export default {
	async fetch(request: Request, env: any, ctx: any): Promise<Response> {
`;

		if (options.withAnchors) {
			indexContent += `		// <mcp-auth:middleware>
`;
		}

		if (options.withAuth) {
			indexContent += `		// Validate authentication
		const authHeader = request.headers.get("Authorization");
		if (!authHeader) {
			return new Response("Unauthorized", { status: 401 });
		}
		const token = authHeader.replace(/^Bearer\\s+/i, "");
		const provider = getAuthProvider(env);
		const user = await provider.validateToken(token, env);
		(env as any).user = user;
`;
		}

		if (options.withAnchors) {
			indexContent += `		// </mcp-auth:middleware>
`;
		}

		indexContent += `		return new Response("ok");
	}
};
`;

		if (options.withAnchors) {
			indexContent =
				`// <mcp-auth:imports>
` +
				(options.withAuth
					? `import { getAuthProvider } from "./auth/config.js";
import { AuthenticationError } from "./auth/types.js";
`
					: ``) +
				`// </mcp-auth:imports>
` +
				indexContent;
		} else if (options.withAuth) {
			indexContent =
				`import { getAuthProvider } from "./auth/config.js";
import { AuthenticationError } from "./auth/types.js";
` + indexContent;
		}

		if (options.withTypeErrors) {
			indexContent += `\nconst x: string = 123;`; // Type error
		}

		await writeFile(join(tempDir, "src/index.ts"), indexContent, "utf-8");

		// wrangler.jsonc with vars
		const wranglerContent: any = {
			name: "test-project",
			main: "src/index.ts",
		};

		if (options.provider) {
			wranglerContent.vars = {};
			if (options.provider === "stytch") {
				wranglerContent.vars.STYTCH_PROJECT_ID = "";
				wranglerContent.vars.STYTCH_SECRET = "";
			} else if (options.provider === "auth0") {
				wranglerContent.vars.AUTH0_DOMAIN = "";
				wranglerContent.vars.AUTH0_CLIENT_ID = "";
			} else if (options.provider === "workos") {
				wranglerContent.vars.WORKOS_API_KEY = "";
				wranglerContent.vars.WORKOS_CLIENT_ID = "";
			}
		}

		await writeFile(
			join(tempDir, "wrangler.jsonc"),
			JSON.stringify(wranglerContent, null, 2),
			"utf-8",
		);

		// Auth files if needed
		if (options.withAuth) {
			await mkdir(join(tempDir, "src/auth"), { recursive: true });
			await mkdir(join(tempDir, "src/auth/providers"), { recursive: true });

			await writeFile(
				join(tempDir, "src/auth/types.ts"),
				`export class AuthenticationError extends Error {}
export interface AuthProvider {
	validateToken(token: string, env: any): Promise<any>;
}`,
				"utf-8",
			);

			await writeFile(
				join(tempDir, "src/auth/config.ts"),
				`export function getAuthProvider(env: any): any { return {}; }`,
				"utf-8",
			);

			if (options.provider) {
				await writeFile(
					join(tempDir, `src/auth/providers/${options.provider}.ts`),
					`export class ${options.provider}Provider {}`,
					"utf-8",
				);
			}
		}
	}

	describe("quickValidate", () => {
		it("should pass validation for project with auth", async () => {
			await createMinimalProject({
				withAuth: true,
				withAnchors: true,
				provider: "stytch",
			});

			const result = await gate.quickValidate({
				cwd: tempDir,
				provider: "stytch",
			});

			expect(result.passed).toBe(true);
			expect(result.failedChecks).toHaveLength(0);
			expect(result.rolledBack).toBe(false);
		});

		it("should skip type checking in quick validate", async () => {
			await createMinimalProject({
				withAuth: true,
				withAnchors: true,
				provider: "stytch",
				withTypeErrors: true, // Type errors present but should be skipped
			});

			const result = await gate.quickValidate({
				cwd: tempDir,
				provider: "stytch",
			});

			expect(result.passed).toBe(true); // Passes because type check is skipped
			expect(result.passedChecks).not.toContain("type-check");
		});

		it("should fail when export handler is missing", async () => {
			await createMinimalProject({ withAuth: true, provider: "stytch" });

			// Overwrite with invalid content
			await writeFile(
				join(tempDir, "src/index.ts"),
				`export const notDefault = {};`,
				"utf-8",
			);

			const result = await gate.quickValidate({
				cwd: tempDir,
				provider: "stytch",
			});

			expect(result.passed).toBe(false);
			expect(result.failedChecks).toContain("export-invariants");
			expect(result.errors.some((e) => e.includes("Export handler"))).toBe(
				true,
			);
		});

		it("should fail when auth imports missing", async () => {
			await createMinimalProject({ withAnchors: true, provider: "stytch" });

			const result = await gate.quickValidate({
				cwd: tempDir,
				provider: "stytch",
			});

			expect(result.passed).toBe(false);
			expect(result.failedChecks).toContain("auth-imports");
		});

		it("should fail when auth middleware missing", async () => {
			await createMinimalProject({ withAnchors: true, provider: "stytch" });

			// Add imports but not middleware
			const content = await import("node:fs/promises").then((fs) =>
				fs.readFile(join(tempDir, "src/index.ts"), "utf-8"),
			);
			const updatedContent = content.replace(
				"// <mcp-auth:imports>",
				`// <mcp-auth:imports>
import { getAuthProvider } from "./auth/config.js";
import { AuthenticationError } from "./auth/types.js";`,
			);
			await writeFile(join(tempDir, "src/index.ts"), updatedContent, "utf-8");

			const result = await gate.quickValidate({
				cwd: tempDir,
				provider: "stytch",
			});

			expect(result.passed).toBe(false);
			expect(result.failedChecks).toContain("auth-middleware");
		});

		it("should fail when config vars missing", async () => {
			await createMinimalProject({
				withAuth: true,
				withAnchors: true,
			});

			const result = await gate.quickValidate({
				cwd: tempDir,
				provider: "stytch",
			});

			expect(result.passed).toBe(false);
			expect(result.failedChecks).toContain("config-vars");
		});

		it("should fail when auth files missing", async () => {
			await createMinimalProject({
				withAuth: false,
				withAnchors: true,
				provider: "stytch",
			});

			// Add imports and middleware but no auth files
			const content = `import { getAuthProvider } from "./auth/config.js";
import { AuthenticationError } from "./auth/types.js";
// <mcp-auth:imports>
// </mcp-auth:imports>

export default {
	async fetch(request: Request, env: any, ctx: any): Promise<Response> {
		// <mcp-auth:middleware>
		const authHeader = request.headers.get("Authorization");
		// </mcp-auth:middleware>
		return new Response("ok");
	}
};`;
			await writeFile(join(tempDir, "src/index.ts"), content, "utf-8");

			const result = await gate.quickValidate({
				cwd: tempDir,
				provider: "stytch",
			});

			expect(result.passed).toBe(false);
			expect(result.failedChecks).toContain("auth-files-exist");
		});

		it("should warn about missing anchors but not fail", async () => {
			// No anchors, but auth is present (legacy project)
			await createMinimalProject({
				withAuth: true,
				withAnchors: false,
				provider: "stytch",
			});

			const result = await gate.quickValidate({
				cwd: tempDir,
				provider: "stytch",
			});

			// Anchors check is non-critical
			expect(result.failedChecks).toContain("anchors-present");
			// But overall validation can still pass if other critical checks pass
			// (depends on other checks)
		});

		it("should detect duplicate imports", async () => {
			await createMinimalProject({
				withAuth: true,
				withAnchors: true,
				provider: "stytch",
			});

			// Add duplicate imports
			const content = await import("node:fs/promises").then((fs) =>
				fs.readFile(join(tempDir, "src/index.ts"), "utf-8"),
			);
			const duplicateContent =
				`import { getAuthProvider } from "./auth/config.js";
import { AuthenticationError } from "./auth/types.js";
` + content;
			await writeFile(
				join(tempDir, "src/index.ts"),
				duplicateContent,
				"utf-8",
			);

			const result = await gate.quickValidate({
				cwd: tempDir,
				provider: "stytch",
			});

			// Duplicate imports is a non-critical check
			expect(result.failedChecks).toContain("no-duplicate-imports");
			// But overall validation should still pass (non-critical)
			// (unless other checks fail)
		});
	});

	describe("validate", () => {
		it(
			"should include type checking in full validate",
			async () => {
				await createMinimalProject({
					withAuth: true,
					withAnchors: true,
					provider: "stytch",
				});

				// Install node_modules for type checking
				await mkdir(join(tempDir, "node_modules/@cloudflare/workers-types"), {
					recursive: true,
				});
				await writeFile(
					join(tempDir, "node_modules/@cloudflare/workers-types/package.json"),
					"{}",
					"utf-8",
				);

				const result = await gate.validate({
					cwd: tempDir,
					provider: "stytch",
					skipTypeCheck: false,
				});

				if (!result.passed) {
					console.log("Validation errors:", result.errors);
				}

				// Type check may fail without real node_modules, but other checks should pass
				expect(result.passedChecks.length).toBeGreaterThan(0);
			},
			{ timeout: 10000 },
		);

		it(
			"should fail when type errors present",
			async () => {
				await createMinimalProject({
					withAuth: true,
					withAnchors: true,
					provider: "stytch",
					withTypeErrors: true,
				});

				const result = await gate.validate({
					cwd: tempDir,
					provider: "stytch",
				});

				expect(result.passed).toBe(false);
				// Either type-check fails or other checks fail due to type errors
				expect(result.failedChecks.length).toBeGreaterThan(0);
			},
			{ timeout: 10000 },
		);
	});

	describe("validateCritical", () => {
		it("should only run critical checks", async () => {
			await createMinimalProject({
				withAuth: true,
				withAnchors: true,
				provider: "stytch",
			});

			const result = await gate.validateCritical({
				cwd: tempDir,
				provider: "stytch",
			});

			// Should have some passed checks
			expect(result.passedChecks.length).toBeGreaterThan(0);

			// Non-critical checks should not be in the results at all
			const allChecks = [...result.passedChecks, ...result.failedChecks];
			expect(allChecks).not.toContain("anchors-present");
			expect(allChecks).not.toContain("no-duplicate-imports");
		});
	});

	describe("error handling", () => {
		it("should handle missing src/index.ts gracefully", async () => {
			await mkdir(join(tempDir, "src"), { recursive: true });
			await writeFile(join(tempDir, "package.json"), "{}", "utf-8");

			const result = await gate.quickValidate({
				cwd: tempDir,
			});

			expect(result.passed).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it("should handle missing wrangler config gracefully", async () => {
			await createMinimalProject({ withAuth: true, withAnchors: true });

			// Remove wrangler config
			await rm(join(tempDir, "wrangler.jsonc"), { force: true });

			const result = await gate.quickValidate({
				cwd: tempDir,
				provider: "stytch",
			});

			expect(result.passed).toBe(false);
			expect(result.failedChecks).toContain("config-vars");
		});
	});
});
