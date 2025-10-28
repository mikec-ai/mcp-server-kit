/**
 * Binding Template Service
 *
 * Handles generation of Cloudflare binding helper files from Handlebars templates.
 * Generates type-safe wrapper classes for KV, D1, and other Cloudflare primitives.
 */

import Handlebars from "handlebars";
import { readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import type {
	BindingTemplateVars,
	BindingType,
} from "@/types/binding-types.js";

/**
 * Service for generating binding helper files from templates
 */
export class BindingTemplateService {
	private templateCache = new Map<string, HandlebarsTemplateDelegate>();
	private templatesDir: string;

	constructor() {
		// Get the project root directory (where templates/ folder is)
		const __filename = fileURLToPath(import.meta.url);
		const __dirname = dirname(__filename);

		// Find templates directory by searching upward from current file
		let currentDir = __dirname;
		let templatesPath = "";

		// Search up to 5 levels for templates/scaffolding/bindings
		for (let i = 0; i < 5; i++) {
			const candidatePath = join(currentDir, "templates/scaffolding/bindings");
			try {
				// Check if directory exists (sync is ok in constructor)
				if (statSync(candidatePath).isDirectory()) {
					templatesPath = candidatePath;
					break;
				}
			} catch {
				// Directory doesn't exist, try parent
			}
			currentDir = dirname(currentDir);
		}

		if (!templatesPath) {
			throw new Error(
				`Could not locate templates/scaffolding/bindings directory. Searched from: ${__dirname}`,
			);
		}

		this.templatesDir = templatesPath;
	}

	/**
	 * Load and compile a Handlebars template
	 *
	 * @param templatePath - Path to template file relative to templates/scaffolding/bindings/
	 * @returns Compiled Handlebars template
	 */
	private loadTemplate(templatePath: string): HandlebarsTemplateDelegate {
		// Check cache first
		if (this.templateCache.has(templatePath)) {
			return this.templateCache.get(templatePath)!;
		}

		// Load template from file
		const fullPath = join(this.templatesDir, templatePath);
		const templateContent = readFileSync(fullPath, "utf-8");

		// Compile template with noEscape to preserve code formatting
		const compiled = Handlebars.compile(templateContent, { noEscape: true });

		// Cache it
		this.templateCache.set(templatePath, compiled);

		return compiled;
	}

	/**
	 * Generate KV helper file content
	 *
	 * @param vars - Template variables
	 * @returns Generated TypeScript code
	 */
	generateKVHelper(vars: BindingTemplateVars): string {
		const template = this.loadTemplate("kv-helper.hbs");
		return template(vars);
	}

	/**
	 * Generate D1 helper file content
	 *
	 * @param vars - Template variables
	 * @returns Generated TypeScript code
	 */
	generateD1Helper(vars: BindingTemplateVars): string {
		const template = this.loadTemplate("d1-helper.hbs");
		return template(vars);
	}

	/**
	 * Generate R2 helper file content
	 *
	 * @param vars - Template variables
	 * @returns Generated TypeScript code
	 */
	generateR2Helper(vars: BindingTemplateVars): string {
		const template = this.loadTemplate("r2-helper.hbs");
		return template(vars);
	}

	/**
	 * Generate helper file content based on binding type
	 *
	 * @param bindingType - Type of binding (kv, d1)
	 * @param vars - Template variables
	 * @returns Generated TypeScript code
	 */
	generateHelper(
		bindingType: BindingType,
		vars: BindingTemplateVars,
	): string {
		switch (bindingType) {
			case "kv":
				return this.generateKVHelper(vars);
			case "d1":
				return this.generateD1Helper(vars);
			case "r2":
				return this.generateR2Helper(vars);
			case "queues":
			case "ai":
			case "vectorize":
			case "hyperdrive":
				throw new Error(
					`Binding type '${bindingType}' is not yet implemented (Phase 2+)`,
				);
			default:
				throw new Error(`Unknown binding type: ${bindingType}`);
		}
	}

	/**
	 * Generate and write helper file to disk
	 *
	 * @param cwd - Project root directory
	 * @param bindingType - Type of binding (kv, d1)
	 * @param vars - Template variables
	 * @returns Path to the created file
	 */
	async createHelperFile(
		cwd: string,
		bindingType: BindingType,
		vars: BindingTemplateVars,
	): Promise<string> {
		// Generate content
		const content = this.generateHelper(bindingType, vars);

		// Determine output path
		const bindingsDir = join(cwd, "src", "utils", "bindings");
		const fileName = `${bindingType}-${vars.KEBAB_NAME}.ts`;
		const outputPath = join(bindingsDir, fileName);

		// Create directory if it doesn't exist
		if (!existsSync(bindingsDir)) {
			await mkdir(bindingsDir, { recursive: true });
		}

		// Write file
		await writeFile(outputPath, content, "utf-8");

		return outputPath;
	}

	/**
	 * Get the expected helper file path without creating it
	 *
	 * @param cwd - Project root directory
	 * @param bindingType - Type of binding (kv, d1)
	 * @param kebabName - Binding name in kebab-case
	 * @returns Expected path to the helper file
	 */
	getHelperPath(
		cwd: string,
		bindingType: BindingType,
		kebabName: string,
	): string {
		return join(cwd, "src", "utils", "bindings", `${bindingType}-${kebabName}.ts`);
	}

	/**
	 * Generate import statement for a helper class
	 *
	 * @param helperClassName - Name of the helper class (e.g., MyCacheKV)
	 * @param bindingType - Type of binding (kv, d1)
	 * @param kebabName - Binding name in kebab-case
	 * @returns Import statement
	 */
	generateImportStatement(
		helperClassName: string,
		bindingType: BindingType,
		kebabName: string,
	): string {
		return `import { ${helperClassName} } from "./utils/bindings/${bindingType}-${kebabName}.js";`;
	}

	/**
	 * Clear template cache (useful for testing)
	 */
	clearCache(): void {
		this.templateCache.clear();
	}

	/**
	 * Get templates directory path (useful for testing)
	 */
	getTemplatesDir(): string {
		return this.templatesDir;
	}
}
