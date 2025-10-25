/**
 * Zod Validation Schemas for Template System
 *
 * Runtime validation for template configurations.
 */

import { z } from "zod";

/**
 * Template variable schema
 */
export const TemplateVariableSchema = z.object({
	name: z
		.string()
		.min(1)
		.regex(/^[A-Z][A-Z0-9_]*$/, "Variable name must be uppercase with underscores"),
	required: z.boolean(),
	default: z.string().optional(),
	prompt: z.string().optional(),
	pattern: z.string().optional(),
});

/**
 * Post-scaffold configuration schema
 */
export const PostScaffoldConfigSchema = z.object({
	install: z.boolean(),
	installCommand: z.string().optional(),
	smokeTest: z.string().optional(),
});

/**
 * Template capabilities schema
 */
export const TemplateCapabilitiesSchema = z.object({
	runtime: z.string().min(1),
	transport: z.array(z.string().min(1)).min(1),
	deployment: z.enum(["remote", "local"]),
	language: z.enum(["typescript", "javascript"]),
});

/**
 * Template dependencies schema
 */
export const TemplateDependenciesSchema = z.object({
	mcp_sdk: z.string().optional(),
	agents: z.string().optional(),
	runtime_specific: z.record(z.string()).optional(),
});

/**
 * CLI commands schema
 */
export const TemplateCLICommandsSchema = z.object({
	dev: z.string().min(1),
	test: z.string().min(1),
	deploy: z.string().optional(),
	typeCheck: z.string().optional(),
});

/**
 * Template features schema
 */
export const TemplateFeaturesSchema = z.object({
	unitTesting: z.boolean(),
	integrationTesting: z.boolean(),
	exampleTools: z.array(z.string()),
	documentation: z.boolean(),
});

/**
 * Compatibility requirements schema
 */
export const TemplateCompatibilitySchema = z.object({
	node: z.string().optional(),
	npm: z.string().optional(),
	pnpm: z.string().optional(),
	yarn: z.string().optional(),
});

/**
 * Complete template configuration schema
 */
export const TemplateConfigSchema = z.object({
	id: z
		.string()
		.min(1)
		.regex(/^[a-z0-9-]+$/, "Template ID must be lowercase with hyphens"),
	version: z.string().regex(/^\d+\.\d+\.\d+$/, "Version must be semver (e.g., 1.0.0)"),
	name: z.string().min(1),
	description: z.string().min(1),
	capabilities: TemplateCapabilitiesSchema,
	dependencies: TemplateDependenciesSchema,
	scaffolding: z.object({
		variables: z.array(TemplateVariableSchema),
		postScaffold: PostScaffoldConfigSchema.optional(),
	}),
	cli: TemplateCLICommandsSchema,
	features: TemplateFeaturesSchema,
	compatibility: TemplateCompatibilitySchema,
});

/**
 * Scaffold metadata schema
 */
export const ScaffoldMetadataSchema = z.object({
	id: z.string(),
	version: z.string(),
	name: z.string(),
	mcp_sdk_version: z.string().optional(),
	agents_version: z.string().optional(),
	scaffolded_at: z.string(),
	variables: z.record(z.string()),
});

/**
 * Scaffold options schema
 */
export const ScaffoldOptionsSchema = z.object({
	template: z.string().min(1),
	targetDir: z.string().min(1),
	variables: z.record(z.string()),
	noInstall: z.boolean().optional(),
	packageManager: z.enum(["npm", "pnpm", "yarn", "bun"]).optional(),
	smokeTest: z.boolean().optional(),
});

/**
 * Template filter schema
 */
export const TemplateFilterSchema = z.object({
	runtime: z.string().optional(),
	transport: z.string().optional(),
	deployment: z.enum(["remote", "local"]).optional(),
	language: z.enum(["typescript", "javascript"]).optional(),
});

/**
 * Validation helper: Parse and validate template config
 */
export function validateTemplateConfig(config: unknown): {
	success: boolean;
	data?: z.infer<typeof TemplateConfigSchema>;
	errors?: z.ZodError;
} {
	const result = TemplateConfigSchema.safeParse(config);

	if (result.success) {
		return { success: true, data: result.data };
	}

	return { success: false, errors: result.error };
}

/**
 * Validation helper: Parse and validate scaffold options
 */
export function validateScaffoldOptions(options: unknown): {
	success: boolean;
	data?: z.infer<typeof ScaffoldOptionsSchema>;
	errors?: z.ZodError;
} {
	const result = ScaffoldOptionsSchema.safeParse(options);

	if (result.success) {
		return { success: true, data: result.data };
	}

	return { success: false, errors: result.error };
}
