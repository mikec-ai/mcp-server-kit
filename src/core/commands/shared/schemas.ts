/**
 * Zod Schemas for Configuration Validation
 *
 * Provides runtime validation and type safety for all service configurations
 */

import { z } from "zod";

/**
 * Schema for resource-specific options
 */
export const ResourceOptionsSchema = z.object({
	/** URI pattern for the resource */
	uriPattern: z.string().optional(),
	/** Whether this is a static resource */
	static: z.boolean().optional(),
	/** Whether this is a dynamic resource with variables */
	dynamic: z.boolean().optional(),
});

export type ResourceOptions = z.infer<typeof ResourceOptionsSchema>;

/**
 * Schema for entity scaffolding configuration
 */
export const ScaffoldConfigSchema = z.object({
	/** Entity type (tool, prompt, resource) */
	entityType: z.enum(["tool", "prompt", "resource"]),
	/** Entity name in kebab-case */
	name: z.string().regex(/^[a-z][a-z0-9-]*$/, {
		message: "Entity name must be lowercase with hyphens (e.g., my-entity)",
	}),
	/** Description of the entity */
	description: z.string().optional(),
	/** Whether to generate test files (default: true) */
	generateTests: z.boolean().optional().default(true),
	/** Whether to auto-register in index.ts (default: true) */
	autoRegister: z.boolean().optional().default(true),
	/** Resource-specific options (required for resources) */
	resourceOptions: ResourceOptionsSchema.optional(),
}).refine(
	(data) => {
		// If entity type is resource, resourceOptions must be provided
		if (data.entityType === "resource" && !data.resourceOptions) {
			return false;
		}
		return true;
	},
	{
		message: "Resource options are required when entityType is 'resource'",
		path: ["resourceOptions"],
	}
).refine(
	(data) => {
		// Cannot have both static and dynamic flags set
		if (data.resourceOptions?.static && data.resourceOptions?.dynamic) {
			return false;
		}
		return true;
	},
	{
		message: "Cannot use both --static and --dynamic flags",
		path: ["resourceOptions"],
	}
);

// Input type (before validation/defaults applied)
export type ScaffoldConfig = z.input<typeof ScaffoldConfigSchema>;

// Output type (after validation/defaults applied)
export type ValidatedScaffoldConfig = z.output<typeof ScaffoldConfigSchema>;

/**
 * Schema for registration service configuration
 */
export const RegistrationConfigSchema = z.object({
	/** Entity type */
	entityType: z.enum(["tool", "prompt", "resource"]),
	/** Entity type plural form */
	entityTypePlural: z.enum(["tools", "prompts", "resources"]),
	/** Import directory path */
	directory: z.string(),
	/** Function name suffix */
	functionSuffix: z.string(),
});

export type RegistrationConfig = z.infer<typeof RegistrationConfigSchema>;

/**
 * Schema for validation service configuration
 */
export const ValidationConfigSchema = z.object({
	/** Entity type */
	entityType: z.enum(["tool", "prompt", "resource"]),
	/** Directory where entity file will be created */
	sourceDir: z.string(),
});

export type ValidationConfig = z.infer<typeof ValidationConfigSchema>;

/**
 * Schema for template configuration
 */
export const TemplateConfigSchema = z.object({
	/** Entity type */
	entityType: z.enum(["tool", "prompt", "resource"]),
	/** Entity name in kebab-case */
	name: z.string(),
	/** Capitalized name (PascalCase) */
	capitalizedName: z.string(),
	/** Entity description */
	description: z.string().optional(),
});

export type TemplateConfig = z.infer<typeof TemplateConfigSchema>;

/**
 * Schema for resource template options (extends TemplateConfig)
 */
export const ResourceTemplateOptionsSchema = TemplateConfigSchema.extend({
	/** Entity type must be resource */
	entityType: z.literal("resource"),
	/** URI pattern for the resource */
	uriPattern: z.string(),
});

export type ResourceTemplateOptions = z.infer<typeof ResourceTemplateOptionsSchema>;

/**
 * Schema for entity lister configuration
 */
export const EntityListerConfigSchema = z.object({
	/** Entity type */
	entityType: z.enum(["tool", "prompt", "resource"]),
	/** Entity type plural form */
	entityTypePlural: z.enum(["tools", "prompts", "resources"]),
	/** Directory where entities are stored */
	directory: z.string(),
	/** Function name suffix */
	functionSuffix: z.string(),
	/** Regex pattern to extract description from file */
	descriptionPattern: z.instanceof(RegExp),
	/** Command name for CLI */
	commandName: z.string(),
	/** Command description for CLI */
	commandDescription: z.string(),
});

export type EntityListerConfig = z.infer<typeof EntityListerConfigSchema>;
