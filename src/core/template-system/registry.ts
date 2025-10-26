/**
 * Template Registry
 *
 * Discovers, validates, and manages templates.
 */

import { readdir, readFile, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type {
	Template,
	TemplateConfig,
	TemplateFilter,
	TemplateValidationResult,
} from "./types.js";
import { validateTemplateConfig } from "./schemas.js";

/**
 * Get the templates directory path
 * Works both in development and when installed as a package
 */
function getTemplatesDir(): string {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = dirname(__filename);

	// Check if we're running from src/ or dist/
	if (__dirname.includes("/src/")) {
		// Running from source (tests): src/core/template-system -> ../../../templates
		return join(__dirname, "../../../templates");
	} else {
		// Running from dist (CLI): dist/ -> ../templates
		return join(__dirname, "../templates");
	}
}

/**
 * Template Registry - discovers and validates templates
 */
export class TemplateRegistry {
	private templatesDir: string;
	private templatesCache: Map<string, Template> = new Map();

	constructor(templatesDir?: string) {
		// Default to templates directory in project root
		this.templatesDir = templatesDir || getTemplatesDir();
	}

	/**
	 * Discover all templates in the templates directory
	 */
	async discoverTemplates(): Promise<TemplateConfig[]> {
		try {
			const entries = await readdir(this.templatesDir, { withFileTypes: true });

			const templates: TemplateConfig[] = [];

			for (const entry of entries) {
				if (!entry.isDirectory()) continue;

				const templatePath = join(this.templatesDir, entry.name);
				const configPath = join(templatePath, "template.config.json");

				try {
					// Check if template.config.json exists
					await access(configPath);
				} catch {
					// Silently skip directories without template.config.json
					// (they're not project templates, e.g., scaffolding/, utilities/, etc.)
					continue;
				}

				try {
					// Load and parse config
					const configContent = await readFile(configPath, "utf-8");
					const config = JSON.parse(configContent);

					// Validate config
					const validation = validateTemplateConfig(config);

					if (validation.success && validation.data) {
						templates.push(validation.data);

						// Cache the template
						this.templatesCache.set(validation.data.id, {
							config: validation.data,
							path: templatePath,
							filesPath: join(templatePath, "files"),
							hooksPath: join(templatePath, "hooks"),
						});
					} else {
						// Warn about templates with invalid config format
						console.warn(
							`Skipping template ${entry.name}: Invalid config format`,
						);
					}
				} catch (error) {
					// Warn about templates with parse errors or other issues
					console.warn(
						`Skipping template ${entry.name}: ${error instanceof Error ? error.message : String(error)}`,
					);
					continue;
				}
			}

			return templates;
		} catch (error) {
			throw new Error(`Failed to discover templates: ${error}`);
		}
	}

	/**
	 * Get a specific template by ID
	 */
	async getTemplate(id: string): Promise<Template> {
		// Check cache first
		if (this.templatesCache.has(id)) {
			return this.templatesCache.get(id)!;
		}

		// Discover templates (which will populate cache)
		await this.discoverTemplates();

		// Check cache again
		if (this.templatesCache.has(id)) {
			return this.templatesCache.get(id)!;
		}

		throw new Error(`Template not found: ${id}`);
	}

	/**
	 * Validate a specific template
	 */
	async validateTemplate(id: string): Promise<TemplateValidationResult> {
		const errors: string[] = [];
		const warnings: string[] = [];

		try {
			const template = await this.getTemplate(id);

			// Validate config schema (already done in getTemplate)
			// Additional validations:

			// 1. Check if files directory exists
			try {
				await access(template.filesPath);
			} catch {
				errors.push(`Files directory not found: ${template.filesPath}`);
			}

			// 2. Check if required files exist
			const requiredFiles = ["package.json.hbs", "tsconfig.json", "README.md.hbs"];

			for (const file of requiredFiles) {
				try {
					await access(join(template.filesPath, file));
				} catch {
					warnings.push(`Recommended file missing: ${file}`);
				}
			}

			// 3. Validate variables
			for (const variable of template.config.scaffolding.variables) {
				if (variable.required && variable.default) {
					warnings.push(`Variable ${variable.name} is required but has a default value`);
				}
			}

			// 4. Check capabilities
			if (template.config.capabilities.transport.length === 0) {
				errors.push("Template must support at least one transport");
			}

			return {
				valid: errors.length === 0,
				errors,
				warnings,
			};
		} catch (error) {
			return {
				valid: false,
				errors: [`Failed to validate template: ${error}`],
				warnings: [],
			};
		}
	}

	/**
	 * List all templates with optional filtering
	 */
	async listTemplates(filter?: TemplateFilter): Promise<TemplateConfig[]> {
		const templates = await this.discoverTemplates();

		if (!filter) {
			return templates;
		}

		return templates.filter((template) => {
			// Filter by runtime
			if (filter.runtime && template.capabilities.runtime !== filter.runtime) {
				return false;
			}

			// Filter by transport
			if (filter.transport && !template.capabilities.transport.includes(filter.transport)) {
				return false;
			}

			// Filter by deployment
			if (filter.deployment && template.capabilities.deployment !== filter.deployment) {
				return false;
			}

			// Filter by language
			if (filter.language && template.capabilities.language !== filter.language) {
				return false;
			}

			return true;
		});
	}

	/**
	 * Check if a template exists
	 */
	async templateExists(id: string): Promise<boolean> {
		try {
			await this.getTemplate(id);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Get template capabilities (for filtering/discovery)
	 */
	async getCapabilities(): Promise<{
		runtimes: Set<string>;
		transports: Set<string>;
		deployments: Set<string>;
		languages: Set<string>;
	}> {
		const templates = await this.discoverTemplates();

		const runtimes = new Set<string>();
		const transports = new Set<string>();
		const deployments = new Set<string>();
		const languages = new Set<string>();

		for (const template of templates) {
			runtimes.add(template.capabilities.runtime);
			for (const transport of template.capabilities.transport) {
				transports.add(transport);
			}
			deployments.add(template.capabilities.deployment);
			languages.add(template.capabilities.language);
		}

		return { runtimes, transports, deployments, languages };
	}

	/**
	 * Clear templates cache
	 */
	clearCache(): void {
		this.templatesCache.clear();
	}
}
