/**
 * Binding Detection Service
 *
 * Detects Cloudflare bindings (KV, D1, R2) configured in wrangler.jsonc.
 * Used by tool scaffolding to generate context-aware templates with binding usage examples.
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import type { Phase1BindingType } from "@/types/binding-types.js";
import { getWranglerConfigPath, parseJSONC } from "./config/wrangler-utils.js";
import { toPascalCase } from "./utils.js";

/**
 * Detected bindings organized by type
 */
export interface DetectedBindings {
	kv: string[]; // e.g., ['MY_CACHE', 'SESSION_STORE']
	d1: string[]; // e.g., ['USER_DB', 'ANALYTICS_DB']
	r2: string[]; // e.g., ['MY_BUCKET', 'UPLOADS']
}

/**
 * Binding usage example with import and usage code
 */
export interface BindingExample {
	type: Phase1BindingType;
	bindingName: string;
	helperClass: string;
	importStatement: string;
	usageExample: string;
}

/**
 * Service for detecting configured Cloudflare bindings
 */
export class BindingDetectionService {
	/**
	 * Detect all bindings configured in wrangler.jsonc
	 *
	 * @param cwd - Project root directory
	 * @returns Detected bindings organized by type
	 */
	async detectBindings(cwd: string): Promise<DetectedBindings> {
		const bindings: DetectedBindings = {
			kv: [],
			d1: [],
			r2: [],
		};

		const wranglerPath = getWranglerConfigPath(cwd);
		if (!wranglerPath || !existsSync(wranglerPath)) {
			return bindings; // No wrangler config = no bindings
		}

		try {
			const content = await readFile(wranglerPath, "utf-8");
			const config = parseJSONC(content);

			// Detect KV namespaces
			if (Array.isArray(config.kv_namespaces)) {
				bindings.kv = config.kv_namespaces
					.map((ns: any) => ns.binding)
					.filter((b: any) => typeof b === "string" && b.length > 0);
			}

			// Detect D1 databases
			if (Array.isArray(config.d1_databases)) {
				bindings.d1 = config.d1_databases
					.map((db: any) => db.binding)
					.filter((b: any) => typeof b === "string" && b.length > 0);
			}

			// Detect R2 buckets
			if (Array.isArray(config.r2_buckets)) {
				bindings.r2 = config.r2_buckets
					.map((bucket: any) => bucket.binding)
					.filter((b: any) => typeof b === "string" && b.length > 0);
			}
		} catch (error) {
			// Graceful fallback: If parsing fails, return empty bindings
			// Don't throw - we don't want to break tool scaffolding
			console.warn(
				`Warning: Could not parse wrangler config: ${error instanceof Error ? error.message : String(error)}`,
			);
		}

		return bindings;
	}

	/**
	 * Check if project has any bindings configured
	 *
	 * @param cwd - Project root directory
	 * @returns True if at least one binding is configured
	 */
	async hasAnyBindings(cwd: string): Promise<boolean> {
		const bindings = await this.detectBindings(cwd);
		return (
			bindings.kv.length > 0 ||
			bindings.d1.length > 0 ||
			bindings.r2.length > 0
		);
	}

	/**
	 * Generate binding usage examples for template comments
	 *
	 * @param bindings - Detected bindings
	 * @returns Array of binding examples with imports and usage
	 */
	generateBindingExamples(bindings: DetectedBindings): BindingExample[] {
		const examples: BindingExample[] = [];

		// Generate KV examples
		for (const bindingName of bindings.kv) {
			const helperClass = this.getHelperClassName(bindingName, "kv");
			const helperFile = this.getHelperFileName(bindingName, "kv");

			examples.push({
				type: "kv",
				bindingName,
				helperClass,
				importStatement: `import { ${helperClass} } from "../utils/bindings/${helperFile}.js";`,
				usageExample: [
					`const cache = new ${helperClass}(env.${bindingName});`,
					`const data = await cache.get<MyType>('key');`,
					`await cache.set('key', { value: 'data' }, { expirationTtl: 3600 });`,
				].join("\n// "),
			});
		}

		// Generate D1 examples
		for (const bindingName of bindings.d1) {
			const helperClass = this.getHelperClassName(bindingName, "d1");
			const helperFile = this.getHelperFileName(bindingName, "d1");

			examples.push({
				type: "d1",
				bindingName,
				helperClass,
				importStatement: `import { ${helperClass} } from "../utils/bindings/${helperFile}.js";`,
				usageExample: [
					`const db = new ${helperClass}(env.${bindingName});`,
					`const users = await db.query<User>('SELECT * FROM users WHERE active = ?', [true]);`,
					`await db.execute('INSERT INTO logs (message) VALUES (?)', ['User logged in']);`,
				].join("\n// "),
			});
		}

		// Generate R2 examples
		for (const bindingName of bindings.r2) {
			const helperClass = this.getHelperClassName(bindingName, "r2");
			const helperFile = this.getHelperFileName(bindingName, "r2");

			examples.push({
				type: "r2",
				bindingName,
				helperClass,
				importStatement: `import { ${helperClass} } from "../utils/bindings/${helperFile}.js";`,
				usageExample: [
					`const bucket = new ${helperClass}(env.${bindingName});`,
					`await bucket.putText('files/readme.txt', 'Hello World');`,
					`const content = await bucket.getText('files/readme.txt');`,
				].join("\n// "),
			});
		}

		return examples;
	}

	/**
	 * Generate compact binding summary for template comments
	 * Format: "KV: MY_CACHE, SESSION_STORE | D1: USER_DB | R2: UPLOADS"
	 *
	 * @param bindings - Detected bindings
	 * @returns Compact summary string
	 */
	generateBindingSummary(bindings: DetectedBindings): string {
		const parts: string[] = [];

		if (bindings.kv.length > 0) {
			parts.push(`KV: ${bindings.kv.join(", ")}`);
		}
		if (bindings.d1.length > 0) {
			parts.push(`D1: ${bindings.d1.join(", ")}`);
		}
		if (bindings.r2.length > 0) {
			parts.push(`R2: ${bindings.r2.join(", ")}`);
		}

		return parts.join(" | ");
	}

	/**
	 * Get helper class name for a binding
	 * Example: MY_CACHE (kv) -> MyCacheKV
	 */
	private getHelperClassName(
		bindingName: string,
		bindingType: Phase1BindingType,
	): string {
		const baseName = toPascalCase(bindingName.toLowerCase().replace(/_/g, "-"));
		const suffix = bindingType.toUpperCase();
		return `${baseName}${suffix}`;
	}

	/**
	 * Get helper file name for a binding
	 * Example: MY_CACHE (kv) -> kv-my-cache
	 */
	private getHelperFileName(
		bindingName: string,
		bindingType: Phase1BindingType,
	): string {
		const fileName = bindingName.toLowerCase().replace(/_/g, "-");
		return `${bindingType}-${fileName}`;
	}
}
