/**
 * Dependency Manager
 *
 * Safely adds authentication dependencies to package.json based on
 * provider and platform selection.
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

export type AuthProvider = "stytch" | "auth0" | "workos";
export type Platform = "cloudflare" | "vercel" | "unknown";

export interface DependencyUpdate {
	dependencies: Record<string, string>;
	devDependencies: Record<string, string>;
}

/**
 * Get required dependencies for auth provider and platform
 *
 * @param provider - Auth provider (stytch, auth0, workos)
 * @param platform - Deployment platform (cloudflare, vercel)
 * @returns Dependencies to add
 */
export function getAuthDependencies(
	provider: AuthProvider,
	platform: Platform,
): DependencyUpdate {
	const deps: DependencyUpdate = {
		dependencies: {},
		devDependencies: {},
	};

	// Cloudflare Workers OAuth Provider (for all Cloudflare auth)
	if (platform === "cloudflare") {
		deps.dependencies["@cloudflare/workers-oauth-provider"] = "^0.0.12";
	}

	// Provider-specific dependencies
	switch (provider) {
		case "stytch":
			// Stytch SDK for token validation (optional, could use fetch directly)
			// deps.dependencies["stytch"] = "^10.0.0";
			break;

		case "auth0":
			deps.dependencies["auth0"] = "^4.0.0";
			break;

		case "workos":
			deps.dependencies["@workos-inc/node"] = "^7.0.0";
			break;
	}

	return deps;
}

/**
 * Add dependencies to package.json
 *
 * @param cwd - Project root directory
 * @param update - Dependencies to add
 * @returns True if package.json was modified
 */
export async function addDependenciesToPackageJson(
	cwd: string,
	update: DependencyUpdate,
): Promise<boolean> {
	const packageJsonPath = join(cwd, "package.json");

	if (!existsSync(packageJsonPath)) {
		throw new Error(`package.json not found at ${packageJsonPath}`);
	}

	// Read and parse
	const content = await readFile(packageJsonPath, "utf-8");
	const pkg = JSON.parse(content);

	// Track if we made changes
	let modified = false;

	// Add dependencies
	if (Object.keys(update.dependencies).length > 0) {
		pkg.dependencies = pkg.dependencies || {};

		for (const [name, version] of Object.entries(update.dependencies)) {
			if (!pkg.dependencies[name]) {
				pkg.dependencies[name] = version;
				modified = true;
			}
		}

		// Sort dependencies alphabetically
		pkg.dependencies = sortObject(pkg.dependencies);
	}

	// Add devDependencies
	if (Object.keys(update.devDependencies).length > 0) {
		pkg.devDependencies = pkg.devDependencies || {};

		for (const [name, version] of Object.entries(update.devDependencies)) {
			if (!pkg.devDependencies[name]) {
				pkg.devDependencies[name] = version;
				modified = true;
			}
		}

		// Sort devDependencies alphabetically
		pkg.devDependencies = sortObject(pkg.devDependencies);
	}

	// Write back if modified
	if (modified) {
		await writeFile(
			packageJsonPath,
			JSON.stringify(pkg, null, 2) + "\n",
			"utf-8",
		);
	}

	return modified;
}

/**
 * List dependencies that would be added
 *
 * @param cwd - Project root directory
 * @param update - Dependencies to check
 * @returns List of new dependencies
 */
export async function listNewDependencies(
	cwd: string,
	update: DependencyUpdate,
): Promise<string[]> {
	const packageJsonPath = join(cwd, "package.json");

	if (!existsSync(packageJsonPath)) {
		// All dependencies are new if package.json doesn't exist
		return [
			...Object.keys(update.dependencies),
			...Object.keys(update.devDependencies),
		];
	}

	const content = await readFile(packageJsonPath, "utf-8");
	const pkg = JSON.parse(content);

	const newDeps: string[] = [];

	// Check dependencies
	for (const name of Object.keys(update.dependencies)) {
		if (!pkg.dependencies?.[name]) {
			newDeps.push(name);
		}
	}

	// Check devDependencies
	for (const name of Object.keys(update.devDependencies)) {
		if (!pkg.devDependencies?.[name]) {
			newDeps.push(name);
		}
	}

	return newDeps;
}

/**
 * Remove auth dependencies from package.json
 *
 * @param cwd - Project root directory
 * @param provider - Auth provider to remove
 * @param platform - Platform to remove dependencies for
 * @returns True if package.json was modified
 */
export async function removeAuthDependencies(
	cwd: string,
	provider: AuthProvider,
	platform: Platform,
): Promise<boolean> {
	const packageJsonPath = join(cwd, "package.json");

	if (!existsSync(packageJsonPath)) {
		return false;
	}

	const content = await readFile(packageJsonPath, "utf-8");
	const pkg = JSON.parse(content);

	const depsToRemove = getAuthDependencies(provider, platform);
	let modified = false;

	// Remove dependencies
	for (const name of Object.keys(depsToRemove.dependencies)) {
		if (pkg.dependencies?.[name]) {
			delete pkg.dependencies[name];
			modified = true;
		}
	}

	// Remove devDependencies
	for (const name of Object.keys(depsToRemove.devDependencies)) {
		if (pkg.devDependencies?.[name]) {
			delete pkg.devDependencies[name];
			modified = true;
		}
	}

	if (modified) {
		await writeFile(
			packageJsonPath,
			JSON.stringify(pkg, null, 2) + "\n",
			"utf-8",
		);
	}

	return modified;
}

/**
 * Sort object keys alphabetically
 */
function sortObject(obj: Record<string, string>): Record<string, string> {
	return Object.keys(obj)
		.sort()
		.reduce(
			(sorted, key) => {
				sorted[key] = obj[key];
				return sorted;
			},
			{} as Record<string, string>,
		);
}
