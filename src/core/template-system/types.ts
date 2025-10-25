/**
 * Template System Type Definitions
 *
 * Defines the interfaces and types for the extensible template system.
 */

import type { z } from "zod";

/**
 * Template runtime environments
 */
export type TemplateRuntime = "cloudflare-workers" | "vercel-edge" | "node" | "deno" | string;

/**
 * MCP transport protocols
 */
export type TemplateTransport = "sse" | "http" | "stdio" | "websocket" | string;

/**
 * Deployment target
 */
export type TemplateDeployment = "remote" | "local";

/**
 * Programming language
 */
export type TemplateLanguage = "typescript" | "javascript";

/**
 * Package manager types
 */
export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

/**
 * Template capabilities - describes what the template supports
 */
export interface TemplateCapabilities {
	/** Runtime environment (e.g., cloudflare-workers, vercel-edge, node) */
	runtime: TemplateRuntime;

	/** Supported transport protocols */
	transport: TemplateTransport[];

	/** Deployment target (remote or local) */
	deployment: TemplateDeployment;

	/** Programming language */
	language: TemplateLanguage;
}

/**
 * Variable definition for template scaffolding
 */
export interface TemplateVariable {
	/** Variable name (uppercase with underscores, e.g., PROJECT_NAME) */
	name: string;

	/** Is this variable required? */
	required: boolean;

	/** Default value (if not required) */
	default?: string;

	/** Prompt text to show user */
	prompt?: string;

	/** Validation pattern (regex) */
	pattern?: string;
}

/**
 * Post-scaffolding configuration
 */
export interface PostScaffoldConfig {
	/** Should dependencies be installed automatically? */
	install: boolean;

	/** Custom install command (default: npm install) */
	installCommand?: string;

	/** Smoke test command to run after install */
	smokeTest?: string;
}

/**
 * CLI commands configuration
 */
export interface TemplateCLICommands {
	/** Development server command */
	dev: string;

	/** Test command */
	test: string;

	/** Deployment command */
	deploy?: string;

	/** Type check command */
	typeCheck?: string;
}

/**
 * Template features
 */
export interface TemplateFeatures {
	/** Includes unit testing setup */
	unitTesting: boolean;

	/** Includes integration testing setup */
	integrationTesting: boolean;

	/** List of example tools included */
	exampleTools: string[];

	/** Includes documentation */
	documentation: boolean;
}

/**
 * Compatibility requirements
 */
export interface TemplateCompatibility {
	/** Minimum Node.js version (e.g., ">=18.0.0") */
	node?: string;

	/** Minimum npm version */
	npm?: string;

	/** Minimum pnpm version */
	pnpm?: string;

	/** Minimum yarn version */
	yarn?: string;
}

/**
 * Template dependency versions
 */
export interface TemplateDependencies {
	/** MCP SDK version */
	mcp_sdk?: string;

	/** Agents package version (for Cloudflare) */
	agents?: string;

	/** Runtime-specific dependencies */
	runtime_specific?: Record<string, string>;
}

/**
 * Complete template configuration
 */
export interface TemplateConfig {
	/** Unique template ID (e.g., "cloudflare-remote") */
	id: string;

	/** Template version (semver) */
	version: string;

	/** Human-readable name */
	name: string;

	/** Template description */
	description: string;

	/** Template capabilities */
	capabilities: TemplateCapabilities;

	/** Dependency versions */
	dependencies: TemplateDependencies;

	/** Scaffolding configuration */
	scaffolding: {
		/** Variable definitions */
		variables: TemplateVariable[];

		/** Post-scaffold actions */
		postScaffold?: PostScaffoldConfig;
	};

	/** CLI commands */
	cli: TemplateCLICommands;

	/** Template features */
	features: TemplateFeatures;

	/** Compatibility requirements */
	compatibility: TemplateCompatibility;
}

/**
 * Template instance (config + file paths)
 */
export interface Template {
	/** Template configuration */
	config: TemplateConfig;

	/** Absolute path to template directory */
	path: string;

	/** Absolute path to files directory */
	filesPath: string;

	/** Absolute path to hooks directory (optional) */
	hooksPath?: string;
}

/**
 * Scaffolding options
 */
export interface ScaffoldOptions {
	/** Template ID to use */
	template: string;

	/** Target directory for scaffolding */
	targetDir: string;

	/** Variable values (key-value pairs) */
	variables: Record<string, string>;

	/** Skip dependency installation */
	noInstall?: boolean;

	/** Package manager to use */
	packageManager?: PackageManager;

	/** Run smoke test after install */
	smokeTest?: boolean;
}

/**
 * Scaffolding result
 */
export interface ScaffoldResult {
	/** Was scaffolding successful? */
	success: boolean;

	/** Template ID that was used */
	template: string;

	/** Path where project was scaffolded */
	path: string;

	/** Error message (if failed) */
	error?: string;
}

/**
 * Scaffold metadata (written to .mcp-template.json)
 */
export interface ScaffoldMetadata {
	/** Template ID */
	id: string;

	/** Template version */
	version: string;

	/** Template name */
	name: string;

	/** MCP SDK version */
	mcp_sdk_version?: string;

	/** Agents version (Cloudflare) */
	agents_version?: string;

	/** Timestamp when scaffolded */
	scaffolded_at: string;

	/** Variables used during scaffolding */
	variables: Record<string, string>;
}

/**
 * Template validation result
 */
export interface TemplateValidationResult {
	/** Is template valid? */
	valid: boolean;

	/** Validation errors */
	errors: string[];

	/** Validation warnings */
	warnings: string[];
}

/**
 * Template filter criteria
 */
export interface TemplateFilter {
	/** Filter by runtime */
	runtime?: TemplateRuntime;

	/** Filter by transport */
	transport?: TemplateTransport;

	/** Filter by deployment target */
	deployment?: TemplateDeployment;

	/** Filter by language */
	language?: TemplateLanguage;
}

/**
 * Template hook context
 */
export interface TemplateHookContext {
	/** Template configuration */
	template: TemplateConfig;

	/** Target directory */
	targetDir: string;

	/** Variables */
	variables: Record<string, string>;

	/** Package manager */
	packageManager?: PackageManager;
}

/**
 * Template hook result
 */
export interface TemplateHookResult {
	/** Was hook successful? */
	success: boolean;

	/** Error message (if failed) */
	error?: string;

	/** Modified variables (hooks can modify variables) */
	modifiedVariables?: Record<string, string>;
}
