/**
 * Template Service
 *
 * Handles file content generation from templates
 * Shared logic for generating entity files, unit tests, and integration tests
 */

import Handlebars from "handlebars";
import { readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Binding context for template generation
 */
export interface BindingContext {
	/** Whether the project has any bindings configured */
	hasBindings: boolean;
	/** Compact binding summary (e.g., "KV: MY_CACHE | D1: USER_DB | AI: AI") */
	bindingSummary?: string;
	/** Array of binding examples with imports and usage */
	bindingExamples?: Array<{
		type: string;
		bindingName: string;
		helperClass?: string; // Optional for AI (no helper class)
		importStatement?: string; // Optional for AI (no import needed)
		usageExample: string;
	}>;
}

/**
 * Configuration for template generation
 */
export interface TemplateConfig {
	/** Entity type (tool, prompt, resource) */
	entityType: "tool" | "prompt" | "resource";
	/** Entity name in kebab-case */
	name: string;
	/** Entity name in PascalCase */
	capitalizedName: string;
	/** Description of the entity */
	description: string;
	/** Binding context (optional - only for tools that may use bindings) */
	bindingContext?: BindingContext;
}

/**
 * Resource-specific template options
 */
export interface ResourceTemplateOptions extends TemplateConfig {
	/** URI pattern for the resource */
	uriPattern: string;
}

/**
 * Service for generating entity file content from templates
 */
export class TemplateService {
	private templateCache = new Map<string, HandlebarsTemplateDelegate>();
	private templatesDir: string;

	constructor() {
		// Get the project root directory (where templates/ folder is)
		const __filename = fileURLToPath(import.meta.url);
		const __dirname = dirname(__filename);

		// Find templates directory by searching upward from current file
		// Works from both dist/cli.js and dist/core/commands/shared/
		let currentDir = __dirname;
		let templatesPath = "";

		// Search up to 5 levels for templates/scaffolding
		for (let i = 0; i < 5; i++) {
			const candidatePath = join(currentDir, "templates/scaffolding");
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
				`Could not locate templates/scaffolding directory. Searched from: ${__dirname}`,
			);
		}

		this.templatesDir = templatesPath;
	}

	/**
	 * Load and compile a Handlebars template
	 */
	private loadTemplate(templatePath: string): HandlebarsTemplateDelegate {
		// Check cache first
		if (this.templateCache.has(templatePath)) {
			return this.templateCache.get(templatePath)!;
		}

		// Load template from file
		const fullPath = join(this.templatesDir, templatePath);
		const templateContent = readFileSync(fullPath, "utf-8");

		// Compile template
		const compiled = Handlebars.compile(templateContent, { noEscape: true });

		// Cache it
		this.templateCache.set(templatePath, compiled);

		return compiled;
	}

	/**
	 * Generate tool file content
	 */
	generateToolFile(config: TemplateConfig): string {
		const template = this.loadTemplate("entities/tool.hbs");
		// Pass full config including bindingContext
		return template(config);
	}

	/**
	 * Generate prompt file content
	 */
	generatePromptFile(config: TemplateConfig): string {
		const template = this.loadTemplate("entities/prompt.hbs");
		return template(config);
	}

	/**
	 * Generate resource file content
	 */
	generateResourceFile(config: ResourceTemplateOptions): string {
		const { uriPattern } = config;

		// Check if URI pattern has variables
		const hasVariables = uriPattern.includes("{") && uriPattern.includes("}");

		// Extract variable names from pattern
		const variables = hasVariables
			? Array.from(uriPattern.matchAll(/\{(\w+)\}/g)).map((m) => m[1])
			: [];

		// Prepare template context
		const context = {
			...config,
			hasVariables,
			variables,
			variablesJoined: variables.join(", "),
		};

		const template = this.loadTemplate("entities/resource.hbs");
		return template(context);
	}

	/**
	 * Generate entity file content based on entity type
	 */
	generateEntityFile(
		config: TemplateConfig | ResourceTemplateOptions,
	): string {
		switch (config.entityType) {
			case "tool":
				return this.generateToolFile(config);
			case "prompt":
				return this.generatePromptFile(config);
			case "resource":
				if (!("uriPattern" in config)) {
					throw new Error("Resource template config must include uriPattern");
				}
				return this.generateResourceFile(config);
			default:
				throw new Error(`Unknown entity type: ${(config as TemplateConfig).entityType}`);
		}
	}

	/**
	 * Generate unit test file content
	 */
	generateUnitTestFile(config: TemplateConfig): string {
		const { entityType, name, capitalizedName } = config;
		const entityTypePlural = `${entityType}s`;
		const functionSuffix =
			entityType.charAt(0).toUpperCase() + entityType.slice(1);

		// Prepare template context
		const context = {
			...config,
			entityTypePlural,
			functionSuffix,
			isToolType: entityType === "tool",
			isPromptType: entityType === "prompt",
			isResourceType: entityType === "resource",
		};

		const template = this.loadTemplate("unit-tests/main.hbs");
		return template(context);
	}

	/**
	 * Generate integration test YAML content
	 */
	generateIntegrationTestYaml(config: TemplateConfig | ResourceTemplateOptions): string {
		const { entityType, name, description } = config;

		if (entityType === "tool") {
			return this.generateToolIntegrationYaml(name, description);
		} else if (entityType === "prompt") {
			return this.generatePromptIntegrationYaml(name, description);
		} else if (entityType === "resource") {
			const uriPattern = (config as ResourceTemplateOptions).uriPattern;
			return this.generateResourceIntegrationYaml(name, description, uriPattern);
		}

		throw new Error(`Unknown entity type: ${entityType}`);
	}

	/**
	 * Generate tool integration test YAML
	 */
	private generateToolIntegrationYaml(name: string, description: string): string {
		const context = {
			name,
			nameWithSpaces: name.replace(/_/g, " "),
			description: description || `Verify that ${name} tool works correctly`,
		};

		const template = this.loadTemplate("integration-tests/tool.yaml.hbs");
		return template(context);
	}

	/**
	 * Generate prompt integration test YAML
	 */
	private generatePromptIntegrationYaml(
		name: string,
		description: string,
	): string {
		const context = {
			name,
			nameWithSpaces: name.replace(/_/g, " "),
			description: description || `Verify that ${name} prompt works correctly`,
		};

		const template = this.loadTemplate("integration-tests/prompt.yaml.hbs");
		return template(context);
	}

	/**
	 * Generate resource integration test YAML
	 */
	private generateResourceIntegrationYaml(
		name: string,
		description: string,
		uriPattern: string,
	): string {
		const context = {
			name,
			nameWithSpaces: name.replace(/_/g, " "),
			description: description || "Test resource",
			uriPattern,
			uriPatternNoVars: uriPattern.replace(/\{[^}]+\}/g, ""),
		};

		const template = this.loadTemplate("integration-tests/resource.yaml.hbs");
		return template(context);
	}
}
