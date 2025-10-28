/**
 * Auth Configuration Updater
 *
 * Updates platform-specific config files to add authentication environment
 * variables. Handles wrangler.toml/wrangler.jsonc (Cloudflare) and vercel.json (Vercel).
 *
 * Uses TomlMerger for structured TOML operations (no regex).
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { TomlMerger } from "../toml-merger.js";
import { AnchorService, AUTH_ANCHORS } from "../anchor-service.js";
import {
	getWranglerConfigPath,
	parseJSONC,
	formatJSON,
} from "./wrangler-utils.js";

export type AuthProvider = "stytch" | "auth0" | "workos";
export type Platform = "cloudflare" | "vercel";

/**
 * Get required environment variables for a provider
 */
export function getRequiredEnvVars(provider: AuthProvider): string[] {
	switch (provider) {
		case "stytch":
			return ["STYTCH_PROJECT_ID", "STYTCH_SECRET", "STYTCH_ENV"];
		case "auth0":
			return [
				"AUTH0_DOMAIN",
				"AUTH0_CLIENT_ID",
				"AUTH0_CLIENT_SECRET",
				"AUTH0_AUDIENCE",
			];
		case "workos":
			return ["WORKOS_API_KEY", "WORKOS_CLIENT_ID"];
	}
}

/**
 * Update wrangler.toml to add auth environment variables (TOML format)
 * Uses TomlMerger for structured parsing (no regex)
 *
 * @param wranglerPath - Path to wrangler.toml file
 * @param provider - Auth provider
 * @returns True if file was modified
 */
async function updateWranglerToml(
	wranglerPath: string,
	provider: AuthProvider,
): Promise<boolean> {
	if (!existsSync(wranglerPath)) {
		return false;
	}

	const tomlMerger = new TomlMerger();
	const requiredVars = getRequiredEnvVars(provider);

	// Check if auth vars already present
	const existingKeys = await tomlMerger.hasKeys(
		wranglerPath,
		"vars",
		requiredVars,
	);

	if (Object.values(existingKeys).some((exists) => exists)) {
		return false; // Already has auth config
	}

	// Merge auth environment variables into [vars] section
	const updates: Record<string, string> = {};
	for (const varName of requiredVars) {
		updates[varName] = "";
	}

	const result = await tomlMerger.mergeSection(wranglerPath, "vars", updates);

	return result.modified;
}

/**
 * Update wrangler.jsonc/json to add auth environment variables (JSON format)
 * Uses anchor-based insertion to preserve comments and structure
 *
 * @param wranglerPath - Path to wrangler.jsonc or wrangler.json file
 * @param provider - Auth provider
 * @returns True if file was modified
 */
async function updateWranglerJsonc(
	wranglerPath: string,
	provider: AuthProvider,
): Promise<boolean> {
	if (!existsSync(wranglerPath)) {
		return false;
	}

	const content = await readFile(wranglerPath, "utf-8");

	// Parse JSONC to check if vars already exist
	const config = parseJSONC(content);

	// Check if auth vars already present
	const requiredVars = getRequiredEnvVars(provider);
	if (config.vars && requiredVars.some((v) => config.vars[v] !== undefined)) {
		return false; // Already has auth config
	}

	// Use anchor service to insert vars at the auth:vars anchor
	const anchorService = new AnchorService();

	// Check if anchor exists
	const hasAnchor = await anchorService.hasAnchor(
		wranglerPath,
		AUTH_ANCHORS.CONFIG_VARS,
	);

	if (!hasAnchor) {
		// Fallback to old method if no anchor (for backwards compatibility)
		// Add auth environment variables to vars section
		if (!config.vars) {
			config.vars = {};
		}

		for (const varName of requiredVars) {
			config.vars[varName] = "";
		}

		// Write back with proper formatting
		await writeFile(wranglerPath, formatJSON(config) + "\n", "utf-8");
		return true;
	}

	// Build vars JSON snippet
	const varsEntries = requiredVars
		.map((varName) => `\t\t"${varName}": ""`)
		.join(",\n");

	const varsJson = `"vars": {\n${varsEntries}\n\t},`;

	// Insert at auth vars anchor
	const result = await anchorService.insertAtAnchor(
		wranglerPath,
		AUTH_ANCHORS.CONFIG_VARS,
		varsJson,
		{ indent: "\t" },
	);

	return result.modified;
}

/**
 * Update wrangler config to add auth environment variables
 * Detects format (TOML vs JSON/JSONC) and routes to appropriate handler
 *
 * @param cwd - Project root directory
 * @param provider - Auth provider
 * @returns True if file was modified
 */
export async function updateWranglerConfig(
	cwd: string,
	provider: AuthProvider,
): Promise<boolean> {
	const wranglerPath = getWranglerConfigPath(cwd);

	if (!wranglerPath) {
		return false; // No wrangler config found
	}

	// Route to appropriate handler based on file extension
	if (wranglerPath.endsWith(".toml")) {
		return updateWranglerToml(wranglerPath, provider);
	} else {
		// .jsonc or .json
		return updateWranglerJsonc(wranglerPath, provider);
	}
}

/**
 * Update vercel.json to add auth environment variables
 *
 * @param cwd - Project root directory
 * @param provider - Auth provider
 * @returns True if file was created or modified
 */
export async function updateVercelConfig(
	cwd: string,
	provider: AuthProvider,
): Promise<boolean> {
	const vercelPath = join(cwd, "vercel.json");

	const requiredVars = getRequiredEnvVars(provider);

	let config: any = {};

	if (existsSync(vercelPath)) {
		const content = await readFile(vercelPath, "utf-8");
		config = JSON.parse(content);

		// Check if auth vars already present
		if (
			config.env &&
			requiredVars.some((v: string) => config.env[v] !== undefined)
		) {
			return false;
		}
	}

	// Add environment variables
	config.env = config.env || {};

	for (const varName of requiredVars) {
		config.env[varName] = `@${varName.toLowerCase()}`;
	}

	await writeFile(vercelPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
	return true;
}

/**
 * Create or update .env.example file
 *
 * @param cwd - Project root directory
 * @param provider - Auth provider
 * @param content - Environment variable template content
 * @returns True if file was created or modified
 */
export async function updateEnvExample(
	cwd: string,
	provider: AuthProvider,
	content: string,
): Promise<boolean> {
	const envPath = join(cwd, ".env.example");

	if (existsSync(envPath)) {
		const existing = await readFile(envPath, "utf-8");

		// Check if auth vars already present
		const requiredVars = getRequiredEnvVars(provider);
		if (requiredVars.some((v) => existing.includes(v))) {
			return false;
		}

		// Append to existing file
		await writeFile(envPath, existing + "\n" + content, "utf-8");
	} else {
		// Create new file
		await writeFile(envPath, content, "utf-8");
	}

	return true;
}

/**
 * Remove auth configuration from wrangler.toml (TOML format)
 * Uses TomlMerger for structured removal (no regex)
 *
 * @param wranglerPath - Path to wrangler.toml file
 * @param provider - Auth provider
 * @returns True if file was modified
 */
async function removeWranglerTomlAuthConfig(
	wranglerPath: string,
	provider: AuthProvider,
): Promise<boolean> {
	if (!existsSync(wranglerPath)) {
		return false;
	}

	const tomlMerger = new TomlMerger();
	const requiredVars = getRequiredEnvVars(provider);

	// Remove auth environment variables from [vars] section
	const result = await tomlMerger.removeKeys(
		wranglerPath,
		"vars",
		requiredVars,
	);

	return result.modified;
}

/**
 * Remove auth configuration from wrangler.jsonc/json (JSON format)
 *
 * @param wranglerPath - Path to wrangler.jsonc or wrangler.json file
 * @param provider - Auth provider
 * @returns True if file was modified
 */
async function removeWranglerJsoncAuthConfig(
	wranglerPath: string,
	provider: AuthProvider,
): Promise<boolean> {
	if (!existsSync(wranglerPath)) {
		return false;
	}

	const content = await readFile(wranglerPath, "utf-8");
	const config = parseJSONC(content);

	if (!config.vars) {
		return false; // No vars section
	}

	const requiredVars = getRequiredEnvVars(provider);
	let modified = false;

	for (const varName of requiredVars) {
		if (config.vars[varName] !== undefined) {
			delete config.vars[varName];
			modified = true;
		}
	}

	if (modified) {
		// Remove vars section if empty
		if (Object.keys(config.vars).length === 0) {
			delete config.vars;
		}

		await writeFile(wranglerPath, formatJSON(config) + "\n", "utf-8");
	}

	return modified;
}

/**
 * Remove auth configuration from wrangler config
 * Detects format (TOML vs JSON/JSONC) and routes to appropriate handler
 *
 * @param cwd - Project root directory
 * @param provider - Auth provider
 * @returns True if file was modified
 */
export async function removeWranglerAuthConfig(
	cwd: string,
	provider: AuthProvider,
): Promise<boolean> {
	const wranglerPath = getWranglerConfigPath(cwd);

	if (!wranglerPath) {
		return false; // No wrangler config found
	}

	// Route to appropriate handler based on file extension
	if (wranglerPath.endsWith(".toml")) {
		return removeWranglerTomlAuthConfig(wranglerPath, provider);
	} else {
		// .jsonc or .json
		return removeWranglerJsoncAuthConfig(wranglerPath, provider);
	}
}

/**
 * Remove auth configuration from vercel.json
 *
 * @param cwd - Project root directory
 * @param provider - Auth provider
 * @returns True if file was modified
 */
export async function removeVercelAuthConfig(
	cwd: string,
	provider: AuthProvider,
): Promise<boolean> {
	const vercelPath = join(cwd, "vercel.json");

	if (!existsSync(vercelPath)) {
		return false;
	}

	const content = await readFile(vercelPath, "utf-8");
	const config = JSON.parse(content);

	if (!config.env) {
		return false;
	}

	const requiredVars = getRequiredEnvVars(provider);
	let modified = false;

	for (const varName of requiredVars) {
		if (config.env[varName] !== undefined) {
			delete config.env[varName];
			modified = true;
		}
	}

	if (modified) {
		// Remove env section if empty
		if (Object.keys(config.env).length === 0) {
			delete config.env;
		}

		await writeFile(vercelPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
	}

	return modified;
}

/**
 * Remove auth variables from .env.example
 *
 * @param cwd - Project root directory
 * @param provider - Auth provider
 * @returns True if file was modified
 */
export async function removeEnvExampleAuthVars(
	cwd: string,
	provider: AuthProvider,
): Promise<boolean> {
	const envPath = join(cwd, ".env.example");

	if (!existsSync(envPath)) {
		return false;
	}

	const content = await readFile(envPath, "utf-8");
	let result = content;

	// Remove auth variable lines
	const requiredVars = getRequiredEnvVars(provider);
	for (const varName of requiredVars) {
		result = result.replace(new RegExp(`${varName}=.*\n?`, "g"), "");
	}

	// Remove provider-specific comment sections
	result = result.replace(
		new RegExp(`# ${provider}[\\s\\S]*?(?=\\n#|\\n\\n|$)`, "gi"),
		"",
	);

	// Remove setup instructions (including the numbered list items)
	result = result.replace(
		/# [A-Z][a-z]+ Setup Instructions:[\s\S]*?(?=\n(?:[A-Z]|$))/g,
		"",
	);

	// Remove standalone numbered instruction lines
	result = result.replace(/# \d+\. .*\n/g, "");

	// Clean up extra blank lines
	result = result.replace(/\n{3,}/g, "\n\n");

	if (result !== content) {
		await writeFile(envPath, result.trim() + "\n", "utf-8");
		return true;
	}

	return false;
}
