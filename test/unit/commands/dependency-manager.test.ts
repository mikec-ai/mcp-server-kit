/**
 * Dependency Manager Tests
 *
 * Tests for safely managing authentication dependencies in package.json.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
	getAuthDependencies,
	addDependenciesToPackageJson,
	listNewDependencies,
	removeAuthDependencies,
} from "../../../src/core/commands/shared/dependency-manager.js";

describe("Dependency Manager", () => {
	const testDir = "/tmp/dependency-manager-test";

	beforeEach(async () => {
		await mkdir(testDir, { recursive: true });
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	describe("getAuthDependencies", () => {
		describe("Cloudflare Platform", () => {
			it("should include OAuth provider for Stytch", () => {
				const deps = getAuthDependencies("stytch", "cloudflare");

				expect(deps.dependencies["@cloudflare/workers-oauth-provider"]).toBe(
					"^0.0.12",
				);
			});

			it("should include OAuth provider and Auth0 SDK for Auth0", () => {
				const deps = getAuthDependencies("auth0", "cloudflare");

				expect(deps.dependencies["@cloudflare/workers-oauth-provider"]).toBe(
					"^0.0.12",
				);
				expect(deps.dependencies["auth0"]).toBe("^4.0.0");
			});

			it("should include OAuth provider and WorkOS SDK for WorkOS", () => {
				const deps = getAuthDependencies("workos", "cloudflare");

				expect(deps.dependencies["@cloudflare/workers-oauth-provider"]).toBe(
					"^0.0.12",
				);
				expect(deps.dependencies["@workos-inc/node"]).toBe("^7.0.0");
			});
		});

		describe("Vercel Platform", () => {
			it("should not include OAuth provider for Stytch", () => {
				const deps = getAuthDependencies("stytch", "vercel");

				expect(deps.dependencies["@cloudflare/workers-oauth-provider"]).toBeUndefined();
			});

			it("should include Auth0 SDK for Auth0", () => {
				const deps = getAuthDependencies("auth0", "vercel");

				expect(deps.dependencies["auth0"]).toBe("^4.0.0");
				expect(deps.dependencies["@cloudflare/workers-oauth-provider"]).toBeUndefined();
			});

			it("should include WorkOS SDK for WorkOS", () => {
				const deps = getAuthDependencies("workos", "vercel");

				expect(deps.dependencies["@workos-inc/node"]).toBe("^7.0.0");
				expect(deps.dependencies["@cloudflare/workers-oauth-provider"]).toBeUndefined();
			});
		});

		describe("Unknown Platform", () => {
			it("should not include platform-specific dependencies", () => {
				const deps = getAuthDependencies("stytch", "unknown");

				expect(deps.dependencies["@cloudflare/workers-oauth-provider"]).toBeUndefined();
			});
		});
	});

	describe("addDependenciesToPackageJson", () => {
		it("should add new dependencies to empty package.json", async () => {
			const pkg = { name: "test", version: "1.0.0" };
			await writeFile(join(testDir, "package.json"), JSON.stringify(pkg));

			const update = {
				dependencies: { "auth0": "^4.0.0" },
				devDependencies: {},
			};

			const modified = await addDependenciesToPackageJson(testDir, update);

			expect(modified).toBe(true);

			const updatedPkg = JSON.parse(
				await readFile(join(testDir, "package.json"), "utf-8"),
			);
			expect(updatedPkg.dependencies["auth0"]).toBe("^4.0.0");
		});

		it("should add multiple dependencies", async () => {
			const pkg = { name: "test", version: "1.0.0" };
			await writeFile(join(testDir, "package.json"), JSON.stringify(pkg));

			const update = {
				dependencies: {
					"@cloudflare/workers-oauth-provider": "^0.0.12",
					"auth0": "^4.0.0",
				},
				devDependencies: {},
			};

			await addDependenciesToPackageJson(testDir, update);

			const updatedPkg = JSON.parse(
				await readFile(join(testDir, "package.json"), "utf-8"),
			);
			expect(updatedPkg.dependencies["@cloudflare/workers-oauth-provider"]).toBe("^0.0.12");
			expect(updatedPkg.dependencies["auth0"]).toBe("^4.0.0");
		});

		it("should sort dependencies alphabetically", async () => {
			const pkg = {
				name: "test",
				version: "1.0.0",
				dependencies: {
					"zod": "^3.0.0",
					"axios": "^1.0.0",
				},
			};
			await writeFile(join(testDir, "package.json"), JSON.stringify(pkg));

			const update = {
				dependencies: { "auth0": "^4.0.0" },
				devDependencies: {},
			};

			await addDependenciesToPackageJson(testDir, update);

			const updatedPkg = JSON.parse(
				await readFile(join(testDir, "package.json"), "utf-8"),
			);

			const keys = Object.keys(updatedPkg.dependencies);
			expect(keys).toEqual(["auth0", "axios", "zod"]);
		});

		it("should not modify if dependency already exists", async () => {
			const pkg = {
				name: "test",
				version: "1.0.0",
				dependencies: {
					"auth0": "^3.0.0",
				},
			};
			await writeFile(join(testDir, "package.json"), JSON.stringify(pkg));

			const update = {
				dependencies: { "auth0": "^4.0.0" },
				devDependencies: {},
			};

			const modified = await addDependenciesToPackageJson(testDir, update);

			expect(modified).toBe(false);

			const updatedPkg = JSON.parse(
				await readFile(join(testDir, "package.json"), "utf-8"),
			);
			// Should keep existing version
			expect(updatedPkg.dependencies["auth0"]).toBe("^3.0.0");
		});

		it("should add devDependencies", async () => {
			const pkg = { name: "test", version: "1.0.0" };
			await writeFile(join(testDir, "package.json"), JSON.stringify(pkg));

			const update = {
				dependencies: {},
				devDependencies: { "@types/auth0": "^4.0.0" },
			};

			await addDependenciesToPackageJson(testDir, update);

			const updatedPkg = JSON.parse(
				await readFile(join(testDir, "package.json"), "utf-8"),
			);
			expect(updatedPkg.devDependencies["@types/auth0"]).toBe("^4.0.0");
		});

		it("should sort devDependencies alphabetically", async () => {
			const pkg = {
				name: "test",
				version: "1.0.0",
				devDependencies: {
					"vitest": "^1.0.0",
					"eslint": "^8.0.0",
				},
			};
			await writeFile(join(testDir, "package.json"), JSON.stringify(pkg));

			const update = {
				dependencies: {},
				devDependencies: { "prettier": "^3.0.0" },
			};

			await addDependenciesToPackageJson(testDir, update);

			const updatedPkg = JSON.parse(
				await readFile(join(testDir, "package.json"), "utf-8"),
			);

			const keys = Object.keys(updatedPkg.devDependencies);
			expect(keys).toEqual(["eslint", "prettier", "vitest"]);
		});

		it("should preserve other package.json fields", async () => {
			const pkg = {
				name: "test-project",
				version: "2.0.0",
				description: "Test description",
				scripts: {
					test: "vitest",
				},
			};
			await writeFile(join(testDir, "package.json"), JSON.stringify(pkg));

			const update = {
				dependencies: { "auth0": "^4.0.0" },
				devDependencies: {},
			};

			await addDependenciesToPackageJson(testDir, update);

			const updatedPkg = JSON.parse(
				await readFile(join(testDir, "package.json"), "utf-8"),
			);

			expect(updatedPkg.name).toBe("test-project");
			expect(updatedPkg.version).toBe("2.0.0");
			expect(updatedPkg.description).toBe("Test description");
			expect(updatedPkg.scripts.test).toBe("vitest");
		});

		it("should throw error if package.json not found", async () => {
			const update = {
				dependencies: { "auth0": "^4.0.0" },
				devDependencies: {},
			};

			await expect(
				addDependenciesToPackageJson(testDir, update),
			).rejects.toThrow("package.json not found");
		});

		it("should handle empty update", async () => {
			const pkg = { name: "test", version: "1.0.0" };
			await writeFile(join(testDir, "package.json"), JSON.stringify(pkg));

			const update = {
				dependencies: {},
				devDependencies: {},
			};

			const modified = await addDependenciesToPackageJson(testDir, update);

			expect(modified).toBe(false);
		});
	});

	describe("listNewDependencies", () => {
		it("should list all dependencies if package.json missing", async () => {
			const update = {
				dependencies: { "auth0": "^4.0.0", "@workos-inc/node": "^7.0.0" },
				devDependencies: { "@types/auth0": "^4.0.0" },
			};

			const newDeps = await listNewDependencies(testDir, update);

			expect(newDeps).toContain("auth0");
			expect(newDeps).toContain("@workos-inc/node");
			expect(newDeps).toContain("@types/auth0");
			expect(newDeps).toHaveLength(3);
		});

		it("should list only new dependencies", async () => {
			const pkg = {
				name: "test",
				version: "1.0.0",
				dependencies: {
					"auth0": "^3.0.0",
				},
			};
			await writeFile(join(testDir, "package.json"), JSON.stringify(pkg));

			const update = {
				dependencies: {
					"auth0": "^4.0.0",
					"@workos-inc/node": "^7.0.0",
				},
				devDependencies: {},
			};

			const newDeps = await listNewDependencies(testDir, update);

			expect(newDeps).toContain("@workos-inc/node");
			expect(newDeps).not.toContain("auth0");
			expect(newDeps).toHaveLength(1);
		});

		it("should return empty array if all dependencies exist", async () => {
			const pkg = {
				name: "test",
				version: "1.0.0",
				dependencies: {
					"auth0": "^3.0.0",
				},
			};
			await writeFile(join(testDir, "package.json"), JSON.stringify(pkg));

			const update = {
				dependencies: { "auth0": "^4.0.0" },
				devDependencies: {},
			};

			const newDeps = await listNewDependencies(testDir, update);

			expect(newDeps).toEqual([]);
		});

		it("should check both dependencies and devDependencies", async () => {
			const pkg = {
				name: "test",
				version: "1.0.0",
				dependencies: {
					"auth0": "^3.0.0",
				},
				devDependencies: {
					"@types/auth0": "^3.0.0",
				},
			};
			await writeFile(join(testDir, "package.json"), JSON.stringify(pkg));

			const update = {
				dependencies: {
					"auth0": "^4.0.0",
					"@workos-inc/node": "^7.0.0",
				},
				devDependencies: {
					"@types/auth0": "^4.0.0",
					"@types/workos": "^7.0.0",
				},
			};

			const newDeps = await listNewDependencies(testDir, update);

			expect(newDeps).toContain("@workos-inc/node");
			expect(newDeps).toContain("@types/workos");
			expect(newDeps).not.toContain("auth0");
			expect(newDeps).not.toContain("@types/auth0");
			expect(newDeps).toHaveLength(2);
		});
	});

	describe("removeAuthDependencies", () => {
		it("should remove auth dependencies", async () => {
			const pkg = {
				name: "test",
				version: "1.0.0",
				dependencies: {
					"auth0": "^4.0.0",
					"zod": "^3.0.0",
				},
			};
			await writeFile(join(testDir, "package.json"), JSON.stringify(pkg));

			const modified = await removeAuthDependencies(testDir, "auth0", "vercel");

			expect(modified).toBe(true);

			const updatedPkg = JSON.parse(
				await readFile(join(testDir, "package.json"), "utf-8"),
			);

			expect(updatedPkg.dependencies["auth0"]).toBeUndefined();
			expect(updatedPkg.dependencies["zod"]).toBe("^3.0.0");
		});

		it("should remove multiple auth dependencies", async () => {
			const pkg = {
				name: "test",
				version: "1.0.0",
				dependencies: {
					"@cloudflare/workers-oauth-provider": "^0.0.12",
					"auth0": "^4.0.0",
					"zod": "^3.0.0",
				},
			};
			await writeFile(join(testDir, "package.json"), JSON.stringify(pkg));

			const modified = await removeAuthDependencies(
				testDir,
				"auth0",
				"cloudflare",
			);

			expect(modified).toBe(true);

			const updatedPkg = JSON.parse(
				await readFile(join(testDir, "package.json"), "utf-8"),
			);

			expect(updatedPkg.dependencies["@cloudflare/workers-oauth-provider"]).toBeUndefined();
			expect(updatedPkg.dependencies["auth0"]).toBeUndefined();
			expect(updatedPkg.dependencies["zod"]).toBe("^3.0.0");
		});

		it("should return false if package.json not found", async () => {
			const modified = await removeAuthDependencies(testDir, "auth0", "vercel");

			expect(modified).toBe(false);
		});

		it("should return false if dependencies not present", async () => {
			const pkg = {
				name: "test",
				version: "1.0.0",
				dependencies: {
					"zod": "^3.0.0",
				},
			};
			await writeFile(join(testDir, "package.json"), JSON.stringify(pkg));

			const modified = await removeAuthDependencies(testDir, "auth0", "vercel");

			expect(modified).toBe(false);
		});

		it("should preserve non-auth dependencies", async () => {
			const pkg = {
				name: "test",
				version: "1.0.0",
				dependencies: {
					"auth0": "^4.0.0",
					"zod": "^3.0.0",
					"vitest": "^1.0.0",
				},
			};
			await writeFile(join(testDir, "package.json"), JSON.stringify(pkg));

			const modified = await removeAuthDependencies(testDir, "auth0", "vercel");

			expect(modified).toBe(true);

			const updatedPkg = JSON.parse(
				await readFile(join(testDir, "package.json"), "utf-8"),
			);

			// Auth0 removed
			expect(updatedPkg.dependencies["auth0"]).toBeUndefined();
			// Other deps preserved
			expect(updatedPkg.dependencies["zod"]).toBe("^3.0.0");
			expect(updatedPkg.dependencies["vitest"]).toBe("^1.0.0");
		});
	});

	describe("Integration: Full Dependency Cycle", () => {
		it("should add and remove Cloudflare auth dependencies", async () => {
			const pkg = {
				name: "test",
				version: "1.0.0",
				dependencies: {
					"zod": "^3.0.0",
				},
			};
			await writeFile(join(testDir, "package.json"), JSON.stringify(pkg));

			// Add Stytch auth deps
			const deps = getAuthDependencies("stytch", "cloudflare");
			await addDependenciesToPackageJson(testDir, deps);

			let updatedPkg = JSON.parse(
				await readFile(join(testDir, "package.json"), "utf-8"),
			);

			expect(updatedPkg.dependencies["@cloudflare/workers-oauth-provider"]).toBe("^0.0.12");

			// Remove auth deps
			await removeAuthDependencies(testDir, "stytch", "cloudflare");

			updatedPkg = JSON.parse(
				await readFile(join(testDir, "package.json"), "utf-8"),
			);

			expect(updatedPkg.dependencies["@cloudflare/workers-oauth-provider"]).toBeUndefined();
			expect(updatedPkg.dependencies["zod"]).toBe("^3.0.0");
		});

		it("should handle Auth0 on Cloudflare", async () => {
			const pkg = { name: "test", version: "1.0.0" };
			await writeFile(join(testDir, "package.json"), JSON.stringify(pkg));

			const deps = getAuthDependencies("auth0", "cloudflare");
			await addDependenciesToPackageJson(testDir, deps);

			const updatedPkg = JSON.parse(
				await readFile(join(testDir, "package.json"), "utf-8"),
			);

			expect(updatedPkg.dependencies["@cloudflare/workers-oauth-provider"]).toBe("^0.0.12");
			expect(updatedPkg.dependencies["auth0"]).toBe("^4.0.0");
		});

		it("should handle WorkOS on Vercel", async () => {
			const pkg = { name: "test", version: "1.0.0" };
			await writeFile(join(testDir, "package.json"), JSON.stringify(pkg));

			const deps = getAuthDependencies("workos", "vercel");
			await addDependenciesToPackageJson(testDir, deps);

			const updatedPkg = JSON.parse(
				await readFile(join(testDir, "package.json"), "utf-8"),
			);

			expect(updatedPkg.dependencies["@workos-inc/node"]).toBe("^7.0.0");
			expect(updatedPkg.dependencies["@cloudflare/workers-oauth-provider"]).toBeUndefined();
		});
	});
});
