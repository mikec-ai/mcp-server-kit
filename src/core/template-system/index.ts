/**
 * Template System - Public API
 *
 * Exports the template system for use in CLI and programmatic usage.
 */

// Core classes
export { TemplateRegistry } from "./registry.js";
export { TemplateProcessor } from "./processor.js";

// Types
export type {
	Template,
	TemplateConfig,
	TemplateCapabilities,
	TemplateVariable,
	TemplateFilter,
	TemplateValidationResult,
	ScaffoldOptions,
	ScaffoldResult,
	ScaffoldMetadata,
	TemplateRuntime,
	TemplateTransport,
	TemplateDeployment,
	PackageManager,
} from "./types.js";

// Validation
export {
	TemplateConfigSchema,
	ScaffoldOptionsSchema,
	TemplateFilterSchema,
	validateTemplateConfig,
	validateScaffoldOptions,
} from "./schemas.js";
