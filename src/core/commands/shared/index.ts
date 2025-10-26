/**
 * Shared Services - Public API
 *
 * Exports scaffolding, validation, and entity management services
 * for programmatic usage.
 */

// Entity Scaffolding
export { EntityScaffolder } from "./entity-scaffolder.js";
export type { ScaffoldConfig, ScaffoldResult } from "./entity-scaffolder.js";

// Entity Listing & Discovery
export { EntityLister } from "./entity-lister.js";
export type { EntityInfo, EntityConfig } from "./entity-lister.js";

// Validation Service
export { ValidationService } from "./validation-service.js";
export type {
	ValidationConfig,
	ResourceOptions,
} from "./validation-service.js";

// Registration Service
export { RegistrationService } from "./registration-service.js";
export type { RegistrationConfig } from "./registration-service.js";

// Template Service
export { TemplateService } from "./template-service.js";
export type {
	TemplateConfig,
	ResourceTemplateOptions,
} from "./template-service.js";

// Schemas (Zod validation)
export {
	ResourceOptionsSchema,
	ScaffoldConfigSchema,
	RegistrationConfigSchema,
	ValidationConfigSchema,
	TemplateConfigSchema,
	ResourceTemplateOptionsSchema,
	EntityListerConfigSchema,
} from "./schemas.js";

export type {
	ResourceOptions as ResourceOptionsType,
	ScaffoldConfig as ScaffoldConfigType,
	ValidatedScaffoldConfig,
	RegistrationConfig as RegistrationConfigType,
	ValidationConfig as ValidationConfigType,
	TemplateConfig as TemplateConfigType,
	ResourceTemplateOptions as ResourceTemplateOptionsType,
	EntityListerConfig,
} from "./schemas.js";

// Metadata utilities
export { updateTemplateMetadata, readTemplateMetadata } from "./metadata.js";

// Utility functions
export {
	toPascalCase,
	toKebabCase,
	fileExists,
} from "./utils.js";
