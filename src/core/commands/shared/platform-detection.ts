/**
 * Platform Detection Utilities
 *
 * Detects the deployment platform (Cloudflare Workers, Vercel, etc.)
 * based on project structure and configuration files.
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

export type Platform = "cloudflare" | "vercel" | "unknown";

/**
 * Detect the platform for a given project directory
 *
 * @param cwd - Project root directory
 * @returns Detected platform
 */
export async function detectPlatform(cwd: string): Promise<Platform> {
	// Check for Cloudflare Workers indicators
	if (await isCloudflareProject(cwd)) {
		return "cloudflare";
	}

	// Check for Vercel/Next.js indicators
	if (await isVercelProject(cwd)) {
		return "vercel";
	}

	return "unknown";
}

/**
 * Check if project is a Cloudflare Workers project
 */
async function isCloudflareProject(cwd: string): Promise<boolean> {
	// Primary indicator: wrangler config file (toml, jsonc, or json)
	const wranglerFiles = ["wrangler.jsonc", "wrangler.json", "wrangler.toml"];
	for (const file of wranglerFiles) {
		if (existsSync(join(cwd, file))) {
			return true;
		}
	}

	// Secondary indicator: package.json with 'agents' dependency
	const pkgPath = join(cwd, "package.json");
	if (existsSync(pkgPath)) {
		try {
			const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
			if (pkg.dependencies?.["agents"] || pkg.devDependencies?.["wrangler"]) {
				return true;
			}
		} catch {
			// Invalid package.json, continue checking
		}
	}

	return false;
}

/**
 * Check if project is a Vercel/Next.js project
 */
async function isVercelProject(cwd: string): Promise<boolean> {
	// Primary indicators: Vercel or Next.js config files
	const vercelFiles = [
		"vercel.json",
		"next.config.js",
		"next.config.mjs",
		"next.config.ts",
	];

	for (const file of vercelFiles) {
		if (existsSync(join(cwd, file))) {
			return true;
		}
	}

	// Secondary indicator: package.json with Next.js or @vercel/mcp-adapter
	const pkgPath = join(cwd, "package.json");
	if (existsSync(pkgPath)) {
		try {
			const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
			if (
				pkg.dependencies?.["next"] ||
				pkg.dependencies?.["@vercel/mcp-adapter"] ||
				pkg.devDependencies?.["next"]
			) {
				return true;
			}
		} catch {
			// Invalid package.json, continue
		}
	}

	return false;
}

/**
 * Get the expected entry point path for a platform
 */
export function getEntryPointPath(cwd: string, platform: Platform): string {
	switch (platform) {
		case "cloudflare":
			return join(cwd, "src/index.ts");
		case "vercel":
			return join(cwd, "app/api/mcp/route.ts");
		default:
			throw new Error(`Unknown platform: ${platform}`);
	}
}

/**
 * Validate that the project has the expected entry point
 */
export function validateEntryPoint(cwd: string, platform: Platform): void {
	const entryPoint = getEntryPointPath(cwd, platform);

	if (!existsSync(entryPoint)) {
		throw new Error(
			`Entry point not found: ${entryPoint}. ` +
				`This doesn't appear to be a valid ${platform} MCP server project.`,
		);
	}
}
