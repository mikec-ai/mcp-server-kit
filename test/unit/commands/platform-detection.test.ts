/**
 * Platform Detection Tests
 *
 * Tests for detecting deployment platform from project structure.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import {
	detectPlatform,
	getEntryPointPath,
	validateEntryPoint,
} from "../../../src/core/commands/shared/platform-detection.js";

describe("Platform Detection", () => {
	const testDir = "/tmp/platform-detection-test";

	beforeEach(async () => {
		await mkdir(testDir, { recursive: true });
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	describe("detectPlatform", () => {
		describe("Cloudflare Workers", () => {
			it("should detect via wrangler.toml", async () => {
				await writeFile(join(testDir, "wrangler.toml"), "");

				const platform = await detectPlatform(testDir);

				expect(platform).toBe("cloudflare");
			});

			it("should detect via wrangler.jsonc", async () => {
				await writeFile(join(testDir, "wrangler.jsonc"), "{}");

				const platform = await detectPlatform(testDir);

				expect(platform).toBe("cloudflare");
			});

			it("should detect via wrangler.json", async () => {
				await writeFile(join(testDir, "wrangler.json"), "{}");

				const platform = await detectPlatform(testDir);

				expect(platform).toBe("cloudflare");
			});

			it("should prioritize wrangler.jsonc over wrangler.toml", async () => {
				await writeFile(join(testDir, "wrangler.jsonc"), "{}");
				await writeFile(join(testDir, "wrangler.toml"), "");

				const platform = await detectPlatform(testDir);

				expect(platform).toBe("cloudflare");
			});

			it("should detect via agents dependency", async () => {
				const pkg = {
					dependencies: {
						agents: "^0.2.17",
					},
				};
				await writeFile(
					join(testDir, "package.json"),
					JSON.stringify(pkg),
				);

				const platform = await detectPlatform(testDir);

				expect(platform).toBe("cloudflare");
			});

			it("should detect via wrangler devDependency", async () => {
				const pkg = {
					devDependencies: {
						wrangler: "^4.44.0",
					},
				};
				await writeFile(
					join(testDir, "package.json"),
					JSON.stringify(pkg),
				);

				const platform = await detectPlatform(testDir);

				expect(platform).toBe("cloudflare");
			});

			it("should prioritize wrangler.toml over package.json", async () => {
				await writeFile(join(testDir, "wrangler.toml"), "");
				const pkg = {
					dependencies: {
						next: "14.0.0",
					},
				};
				await writeFile(
					join(testDir, "package.json"),
					JSON.stringify(pkg),
				);

				const platform = await detectPlatform(testDir);

				expect(platform).toBe("cloudflare");
			});
		});

		describe("Vercel/Next.js", () => {
			it("should detect via vercel.json", async () => {
				await writeFile(join(testDir, "vercel.json"), "{}");

				const platform = await detectPlatform(testDir);

				expect(platform).toBe("vercel");
			});

			it("should detect via next.config.js", async () => {
				await writeFile(join(testDir, "next.config.js"), "");

				const platform = await detectPlatform(testDir);

				expect(platform).toBe("vercel");
			});

			it("should detect via next.config.mjs", async () => {
				await writeFile(join(testDir, "next.config.mjs"), "");

				const platform = await detectPlatform(testDir);

				expect(platform).toBe("vercel");
			});

			it("should detect via next.config.ts", async () => {
				await writeFile(join(testDir, "next.config.ts"), "");

				const platform = await detectPlatform(testDir);

				expect(platform).toBe("vercel");
			});

			it("should detect via next dependency", async () => {
				const pkg = {
					dependencies: {
						next: "14.0.0",
					},
				};
				await writeFile(
					join(testDir, "package.json"),
					JSON.stringify(pkg),
				);

				const platform = await detectPlatform(testDir);

				expect(platform).toBe("vercel");
			});

			it("should detect via @vercel/mcp-adapter dependency", async () => {
				const pkg = {
					dependencies: {
						"@vercel/mcp-adapter": "^1.0.0",
					},
				};
				await writeFile(
					join(testDir, "package.json"),
					JSON.stringify(pkg),
				);

				const platform = await detectPlatform(testDir);

				expect(platform).toBe("vercel");
			});

			it("should detect via next devDependency", async () => {
				const pkg = {
					devDependencies: {
						next: "14.0.0",
					},
				};
				await writeFile(
					join(testDir, "package.json"),
					JSON.stringify(pkg),
				);

				const platform = await detectPlatform(testDir);

				expect(platform).toBe("vercel");
			});
		});

		describe("Unknown platform", () => {
			it("should return unknown for empty directory", async () => {
				const platform = await detectPlatform(testDir);

				expect(platform).toBe("unknown");
			});

			it("should return unknown for non-MCP project", async () => {
				const pkg = {
					dependencies: {
						express: "^4.18.0",
					},
				};
				await writeFile(
					join(testDir, "package.json"),
					JSON.stringify(pkg),
				);

				const platform = await detectPlatform(testDir);

				expect(platform).toBe("unknown");
			});

			it("should handle invalid package.json gracefully", async () => {
				await writeFile(join(testDir, "package.json"), "invalid json{");

				const platform = await detectPlatform(testDir);

				expect(platform).toBe("unknown");
			});

			it("should handle empty package.json", async () => {
				await writeFile(join(testDir, "package.json"), "{}");

				const platform = await detectPlatform(testDir);

				expect(platform).toBe("unknown");
			});
		});
	});

	describe("getEntryPointPath", () => {
		it("should return correct path for Cloudflare", () => {
			const path = getEntryPointPath(testDir, "cloudflare");

			expect(path).toBe(join(testDir, "src/index.ts"));
		});

		it("should return correct path for Vercel", () => {
			const path = getEntryPointPath(testDir, "vercel");

			expect(path).toBe(join(testDir, "app/api/mcp/route.ts"));
		});

		it("should throw for unknown platform", () => {
			expect(() => getEntryPointPath(testDir, "unknown" as any)).toThrow(
				"Unknown platform",
			);
		});
	});

	describe("validateEntryPoint", () => {
		it("should pass for Cloudflare project with src/index.ts", async () => {
			await mkdir(join(testDir, "src"), { recursive: true });
			await writeFile(join(testDir, "src/index.ts"), "");

			expect(() =>
				validateEntryPoint(testDir, "cloudflare"),
			).not.toThrow();
		});

		it("should pass for Vercel project with app/api/mcp/route.ts", async () => {
			await mkdir(join(testDir, "app/api/mcp"), { recursive: true });
			await writeFile(join(testDir, "app/api/mcp/route.ts"), "");

			expect(() => validateEntryPoint(testDir, "vercel")).not.toThrow();
		});

		it("should throw for Cloudflare project without entry point", () => {
			expect(() => validateEntryPoint(testDir, "cloudflare")).toThrow(
				"Entry point not found",
			);
		});

		it("should throw for Vercel project without entry point", () => {
			expect(() => validateEntryPoint(testDir, "vercel")).toThrow(
				"Entry point not found",
			);
		});

		it("should include platform name in error message", () => {
			expect(() => validateEntryPoint(testDir, "cloudflare")).toThrow(
				"cloudflare",
			);
		});
	});
});
