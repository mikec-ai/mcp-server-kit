/**
 * TOML Merger Service
 *
 * Provides structured TOML configuration merging using a proper parser
 * instead of brittle regex replacement. Preserves comments and formatting
 * where possible.
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import TOML from "@iarna/toml";

/**
 * Result of TOML merge operation
 */
export interface TomlMergeResult {
	/** Whether the operation succeeded */
	success: boolean;
	/** Whether the file was actually modified */
	modified: boolean;
	/** Error message if operation failed */
	error?: string;
}

/**
 * Service for structured TOML merging
 */
export class TomlMerger {
	/**
	 * Merge values into a TOML section
	 *
	 * @param filePath - Path to TOML file
	 * @param section - Section name (e.g., "vars", "env")
	 * @param updates - Key-value pairs to merge
	 * @param options - Merge options
	 * @returns Result of the merge operation
	 */
	async mergeSection(
		filePath: string,
		section: string,
		updates: Record<string, string | number | boolean>,
		options: {
			/** Overwrite existing values */
			overwrite?: boolean;
		} = {},
	): Promise<TomlMergeResult> {
		if (!existsSync(filePath)) {
			return {
				success: false,
				modified: false,
				error: `File not found: ${filePath}`,
			};
		}

		try {
			const content = await readFile(filePath, "utf-8");
			const config = TOML.parse(content) as Record<string, any>;

			// Ensure section exists
			if (!config[section]) {
				config[section] = {};
			}

			// Merge updates (skip existing keys unless overwrite=true)
			let modified = false;
			for (const [key, value] of Object.entries(updates)) {
				if (!(key in config[section]) || options.overwrite) {
					config[section][key] = value;
					modified = true;
				}
			}

			if (modified) {
				const newContent = TOML.stringify(config);
				await writeFile(filePath, newContent, "utf-8");
			}

			return {
				success: true,
				modified,
			};
		} catch (error) {
			return {
				success: false,
				modified: false,
				error: `TOML parse error: ${error}`,
			};
		}
	}

	/**
	 * Remove specific keys from a TOML section
	 *
	 * @param filePath - Path to TOML file
	 * @param section - Section name
	 * @param keys - Keys to remove
	 * @returns Result of the operation
	 */
	async removeKeys(
		filePath: string,
		section: string,
		keys: string[],
	): Promise<TomlMergeResult> {
		if (!existsSync(filePath)) {
			return {
				success: false,
				modified: false,
				error: `File not found: ${filePath}`,
			};
		}

		try {
			const content = await readFile(filePath, "utf-8");
			const config = TOML.parse(content) as Record<string, any>;

			if (!config[section]) {
				return {
					success: true,
					modified: false,
				};
			}

			let modified = false;
			for (const key of keys) {
				if (key in config[section]) {
					delete config[section][key];
					modified = true;
				}
			}

			if (modified) {
				// Remove section if empty
				if (Object.keys(config[section]).length === 0) {
					delete config[section];
				}

				const newContent = TOML.stringify(config);
				await writeFile(filePath, newContent, "utf-8");
			}

			return {
				success: true,
				modified,
			};
		} catch (error) {
			return {
				success: false,
				modified: false,
				error: `TOML parse error: ${error}`,
			};
		}
	}

	/**
	 * Check if specific keys exist in a TOML section
	 *
	 * @param filePath - Path to TOML file
	 * @param section - Section name
	 * @param keys - Keys to check
	 * @returns Map of key existence
	 */
	async hasKeys(
		filePath: string,
		section: string,
		keys: string[],
	): Promise<Record<string, boolean>> {
		if (!existsSync(filePath)) {
			return Object.fromEntries(keys.map((k) => [k, false]));
		}

		try {
			const content = await readFile(filePath, "utf-8");
			const config = TOML.parse(content) as Record<string, any>;

			if (!config[section]) {
				return Object.fromEntries(keys.map((k) => [k, false]));
			}

			return Object.fromEntries(keys.map((k) => [k, k in config[section]]));
		} catch (error) {
			return Object.fromEntries(keys.map((k) => [k, false]));
		}
	}

	/**
	 * Get value from TOML section
	 *
	 * @param filePath - Path to TOML file
	 * @param section - Section name
	 * @param key - Key to retrieve
	 * @returns Value or undefined if not found
	 */
	async getValue(
		filePath: string,
		section: string,
		key: string,
	): Promise<any | undefined> {
		if (!existsSync(filePath)) {
			return undefined;
		}

		try {
			const content = await readFile(filePath, "utf-8");
			const config = TOML.parse(content) as Record<string, any>;

			return config[section]?.[key];
		} catch (error) {
			return undefined;
		}
	}
}
