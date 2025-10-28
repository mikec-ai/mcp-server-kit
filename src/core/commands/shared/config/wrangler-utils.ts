/**
 * Wrangler Configuration Utilities
 *
 * Shared utilities for reading and writing wrangler configuration files.
 * Supports both TOML and JSONC formats.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import stripJsonComments from "strip-json-comments";

/**
 * Detect which wrangler config file exists
 * Prioritizes: wrangler.jsonc > wrangler.json > wrangler.toml
 */
export function getWranglerConfigPath(cwd: string): string | null {
	const configFiles = ["wrangler.jsonc", "wrangler.json", "wrangler.toml"];
	for (const file of configFiles) {
		const path = join(cwd, file);
		if (existsSync(path)) {
			return path;
		}
	}
	return null;
}

/**
 * Parse JSONC (JSON with comments)
 */
export function parseJSONC(content: string): any {
	const stripped = stripJsonComments(content);
	return JSON.parse(stripped);
}

/**
 * Format JSON with proper indentation (tabs)
 */
export function formatJSON(obj: any): string {
	return JSON.stringify(obj, null, "\t");
}
