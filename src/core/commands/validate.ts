/**
 * Validate Command
 *
 * Validates an MCP server project:
 * - Checks tool registration in index.ts
 * - Verifies test files exist
 * - Validates integration test YAMLs
 * - Checks .mcp-template.json metadata
 */

import { Command } from "commander";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Validation issue severity
 */
export type IssueSeverity = "error" | "warning" | "info";

/**
 * Validation issue
 */
export interface ValidationIssue {
	severity: IssueSeverity;
	category: string;
	message: string;
	file?: string;
	suggestion?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
	passed: boolean;
	issues: ValidationIssue[];
	summary: {
		errors: number;
		warnings: number;
		info: number;
	};
}

/**
 * Tool metadata
 */
interface ToolMetadata {
	name: string;
	file: string;
	registered: boolean;
	hasUnitTest: boolean;
	hasIntegrationTest: boolean;
}

/**
 * MCP Template metadata
 */
interface McpTemplateMetadata {
	id: string;
	version: string;
	name: string;
	scaffolded_at: string;
	tools: ToolMetadata[];
	[key: string]: unknown;
}

/**
 * Create validate command
 */
export function createValidateCommand(): Command {
	return new Command("validate")
		.description("Validate MCP server project structure and configuration")
		.option("--fix", "Automatically fix issues where possible")
		.option("--strict", "Fail on warnings (not just errors)")
		.action(async (options) => {
			const cwd = process.cwd();

			console.log("🔍 Validating MCP server project...\n");

			const result = await validateProject(cwd, options);

			// Print results
			printValidationResults(result);

			// Exit with appropriate code
			if (!result.passed) {
				process.exit(1);
			}
		});
}

/**
 * Validate entire project
 */
export async function validateProject(
	cwd: string,
	options: { fix?: boolean; strict?: boolean } = {},
): Promise<ValidationResult> {
	const issues: ValidationIssue[] = [];

	// 1. Check .mcp-template.json exists
	const metadataPath = path.join(cwd, ".mcp-template.json");
	let metadata: McpTemplateMetadata | null = null;

	try {
		const metadataContent = await fs.readFile(metadataPath, "utf-8");
		metadata = JSON.parse(metadataContent);
	} catch (error) {
		issues.push({
			severity: "error",
			category: "Metadata",
			message: ".mcp-template.json not found or invalid",
			file: ".mcp-template.json",
			suggestion: "Run this command from an MCP server project root",
		});
		return createResult(issues);
	}

	// 2. Discover actual tools in src/tools/
	const toolsDir = path.join(cwd, "src", "tools");
	const actualTools = await discoverTools(toolsDir);

	// 3. Check index.ts registrations
	const indexPath = path.join(cwd, "src", "index.ts");
	const registeredTools = await checkToolRegistrations(indexPath);

	// 4. Validate tool registrations
	for (const toolFile of actualTools) {
		const toolName = path.basename(toolFile, path.extname(toolFile));

		// Skip example files
		if (toolName.startsWith("_example")) {
			continue;
		}

		// Check if tool is registered
		const isRegistered = registeredTools.includes(toolName);
		if (!isRegistered) {
			// Convert kebab-case to PascalCase for function names
			const pascalName = toolName
				.split("-")
				.map((word) => capitalize(word))
				.join("");
			issues.push({
				severity: "error",
				category: "Registration",
				message: `Tool "${toolName}" is not registered in src/index.ts`,
				file: toolFile,
				suggestion: `Add: import { register${pascalName}Tool } from "./tools/${toolName}.js";\nregister${pascalName}Tool(this.server);`,
			});
		}

		// Check for unit test
		const unitTestPath = path.join(
			cwd,
			"test",
			"unit",
			"tools",
			`${toolName}.test.ts`,
		);
		const hasUnitTest = await fileExists(unitTestPath);
		if (!hasUnitTest) {
			issues.push({
				severity: "warning",
				category: "Testing",
				message: `Tool "${toolName}" is missing unit test`,
				file: toolFile,
				suggestion: `Create test/unit/tools/${toolName}.test.ts`,
			});
		}

		// Check for integration test
		const integrationTestPath = path.join(
			cwd,
			"test",
			"integration",
			"specs",
			`${toolName}.yaml`,
		);
		const hasIntegrationTest = await fileExists(integrationTestPath);
		if (!hasIntegrationTest) {
			issues.push({
				severity: "warning",
				category: "Testing",
				message: `Tool "${toolName}" is missing integration test`,
				file: toolFile,
				suggestion: `Create test/integration/specs/${toolName}.yaml`,
			});
		}

		// Validate integration test YAML if it exists
		if (hasIntegrationTest) {
			const yamlIssues = await validateYaml(integrationTestPath, toolName);
			issues.push(...yamlIssues);
		}
	}

	// 5. Check for orphaned registrations (registered but file doesn't exist)
	for (const registeredTool of registeredTools) {
		const toolFile = actualTools.find((f) => {
			const fileName = path.basename(f, path.extname(f));
			return fileName === registeredTool;
		});
		if (!toolFile) {
			issues.push({
				severity: "error",
				category: "Registration",
				message: `Tool "${registeredTool}" is registered but file doesn't exist`,
				file: "src/index.ts",
				suggestion: `Remove registration or create src/tools/${registeredTool}.ts`,
			});
		}
	}

	// 6. Validate wrangler.jsonc configuration
	const configIssues = await validateConfiguration(cwd);
	issues.push(...configIssues);

	// 7. Validate .mcp-template.json metadata matches reality
	if (metadata) {
		const metadataIssues = await validateMetadata(
			metadata,
			actualTools,
			registeredTools,
			cwd,
		);
		issues.push(...metadataIssues);
	}

	return createResult(issues, options.strict);
}

/**
 * Discover tool files in src/tools/
 */
async function discoverTools(toolsDir: string): Promise<string[]> {
	try {
		const files = await fs.readdir(toolsDir);
		return files
			.filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
			.map((f) => path.join(toolsDir, f));
	} catch (error) {
		return [];
	}
}

/**
 * Check which tools are registered in src/index.ts
 */
async function checkToolRegistrations(indexPath: string): Promise<string[]> {
	try {
		const content = await fs.readFile(indexPath, "utf-8");
		const registered: string[] = [];

		// Match: registerXxxTool(this.server);
		const registerRegex = /register(\w+)Tool\(this\.server\)/g;
		let match: RegExpExecArray | null;

		while ((match = registerRegex.exec(content)) !== null) {
			const toolName = toKebabCase(match[1]);
			registered.push(toolName);
		}

		return registered;
	} catch (error) {
		return [];
	}
}

/**
 * Validate integration test YAML
 */
async function validateYaml(
	yamlPath: string,
	toolName: string,
): Promise<ValidationIssue[]> {
	const issues: ValidationIssue[] = [];

	try {
		const content = await fs.readFile(yamlPath, "utf-8");
		const data = yaml.parse(content);

		// Check required fields
		if (!data.name) {
			issues.push({
				severity: "error",
				category: "YAML",
				message: `Integration test for "${toolName}" is missing "name" field`,
				file: yamlPath,
			});
		}

		if (!data.tool) {
			issues.push({
				severity: "error",
				category: "YAML",
				message: `Integration test for "${toolName}" is missing "tool" field`,
				file: yamlPath,
			});
		}

		if (!data.assertions || !Array.isArray(data.assertions)) {
			issues.push({
				severity: "error",
				category: "YAML",
				message: `Integration test for "${toolName}" is missing "assertions" array`,
				file: yamlPath,
			});
		}

		// Check that tool name matches
		if (data.tool && data.tool !== toolName) {
			issues.push({
				severity: "warning",
				category: "YAML",
				message: `Integration test tool name "${data.tool}" doesn't match file name "${toolName}"`,
				file: yamlPath,
			});
		}
	} catch (error) {
		issues.push({
			severity: "error",
			category: "YAML",
			message: `Integration test for "${toolName}" has invalid YAML: ${error instanceof Error ? error.message : String(error)}`,
			file: yamlPath,
		});
	}

	return issues;
}

/**
 * Validate wrangler.jsonc configuration
 */
async function validateConfiguration(cwd: string): Promise<ValidationIssue[]> {
	const issues: ValidationIssue[] = [];

	// Check for wrangler.jsonc or wrangler.json
	const wranglerJsoncPath = path.join(cwd, "wrangler.jsonc");
	const wranglerJsonPath = path.join(cwd, "wrangler.json");

	let wranglerPath: string | null = null;
	if (await fileExists(wranglerJsoncPath)) {
		wranglerPath = wranglerJsoncPath;
	} else if (await fileExists(wranglerJsonPath)) {
		wranglerPath = wranglerJsonPath;
	}

	if (!wranglerPath) {
		issues.push({
			severity: "error",
			category: "Configuration",
			message: "wrangler.jsonc or wrangler.json not found",
			suggestion:
				"This project needs a Cloudflare Workers configuration file",
		});
		return issues;
	}

	// Parse configuration (handle JSONC comments)
	let config: Record<string, unknown>;
	try {
		const content = await fs.readFile(wranglerPath, "utf-8");
		// Simple JSONC comment removal (good enough for validation)
		const jsonContent = content
			.replace(/\/\*[\s\S]*?\*\//g, "") // Remove /* */ comments
			.replace(/\/\/.*/g, ""); // Remove // comments
		config = JSON.parse(jsonContent);
	} catch (error) {
		issues.push({
			severity: "error",
			category: "Configuration",
			message: `Invalid JSON in ${path.basename(wranglerPath)}: ${error instanceof Error ? error.message : String(error)}`,
			file: wranglerPath,
			suggestion: "Fix JSON syntax errors",
		});
		return issues;
	}

	// Check required fields
	const requiredFields = ["name", "main", "compatibility_date"];
	for (const field of requiredFields) {
		if (!config[field]) {
			issues.push({
				severity: "error",
				category: "Configuration",
				message: `Missing required field "${field}" in ${path.basename(wranglerPath)}`,
				file: wranglerPath,
			});
		}
	}

	// Check for durable_objects configuration
	if (!config.durable_objects) {
		issues.push({
			severity: "error",
			category: "Configuration",
			message: "Missing 'durable_objects' configuration",
			file: wranglerPath,
			suggestion:
				'Add: "durable_objects": { "bindings": [{ "name": "MCP_OBJECT", "class_name": "MCPServerAgent" }] }',
		});
	} else {
		const durableObjects = config.durable_objects as Record<string, unknown>;
		const bindings = durableObjects.bindings as Array<Record<string, unknown>>;

		if (!bindings || !Array.isArray(bindings)) {
			issues.push({
				severity: "error",
				category: "Configuration",
				message: "durable_objects.bindings must be an array",
				file: wranglerPath,
			});
		} else {
			// Check for MCP_OBJECT binding
			const mcpBinding = bindings.find(
				(b) => b.name === "MCP_OBJECT",
			);
			if (!mcpBinding) {
				issues.push({
					severity: "error",
					category: "Configuration",
					message:
						'Missing "MCP_OBJECT" binding in durable_objects.bindings',
					file: wranglerPath,
					suggestion:
						'Add: { "name": "MCP_OBJECT", "class_name": "MCPServerAgent" }',
				});
			} else {
				// Verify class_name is set
				if (!mcpBinding.class_name) {
					issues.push({
						severity: "error",
						category: "Configuration",
						message: "MCP_OBJECT binding is missing class_name",
						file: wranglerPath,
					});
				} else {
					// Verify class exists in src/index.ts
					const indexPath = path.join(cwd, "src", "index.ts");
					try {
						const indexContent = await fs.readFile(indexPath, "utf-8");
						const className = mcpBinding.class_name as string;
						const classRegex = new RegExp(
							`export\\s+class\\s+${className}\\s+extends\\s+McpAgent`,
						);
						if (!classRegex.test(indexContent)) {
							issues.push({
								severity: "error",
								category: "Configuration",
								message: `Class "${className}" not found in src/index.ts or doesn't extend McpAgent`,
								file: wranglerPath,
								suggestion: `Ensure src/index.ts exports: export class ${className} extends McpAgent<Env>`,
							});
						}
					} catch (error) {
						// src/index.ts not found or unreadable - will be caught by other validation
					}
				}
			}
		}
	}

	// Check for migrations configuration
	if (!config.migrations) {
		issues.push({
			severity: "error",
			category: "Configuration",
			message: "Missing 'migrations' configuration (required for Agents)",
			file: wranglerPath,
			suggestion:
				'Add: "migrations": [{ "tag": "v1", "new_sqlite_classes": ["MCPServerAgent"] }]',
		});
	} else {
		const migrations = config.migrations as Array<Record<string, unknown>>;
		if (!Array.isArray(migrations)) {
			issues.push({
				severity: "error",
				category: "Configuration",
				message: "migrations must be an array",
				file: wranglerPath,
			});
		} else if (migrations.length === 0) {
			issues.push({
				severity: "error",
				category: "Configuration",
				message: "migrations array is empty",
				file: wranglerPath,
				suggestion:
					'Add at least one migration: { "tag": "v1", "new_sqlite_classes": ["MCPServerAgent"] }',
			});
		} else {
			// Check that at least one migration has new_sqlite_classes with MCPServerAgent
			const hasSqliteClasses = migrations.some((m) => {
				const sqliteClasses = m.new_sqlite_classes as string[];
				return (
					Array.isArray(sqliteClasses) &&
					sqliteClasses.some((c) =>
						c.includes("MCPServerAgent") || c.includes("McpAgent"),
					)
				);
			});

			if (!hasSqliteClasses) {
				issues.push({
					severity: "warning",
					category: "Configuration",
					message:
						"No migration includes MCPServerAgent in new_sqlite_classes",
					file: wranglerPath,
					suggestion:
						"Add your Agent class to new_sqlite_classes in migrations",
				});
			}
		}
	}

	// Check for deprecated 'mcp' field (from old template)
	if (config.mcp) {
		issues.push({
			severity: "error",
			category: "Configuration",
			message:
				'Deprecated "mcp" field found (this field is not recognized by wrangler)',
			file: wranglerPath,
			suggestion:
				'Remove "mcp" field and use "durable_objects" instead (see above)',
		});
	}

	return issues;
}

/**
 * Validate .mcp-template.json metadata
 */
async function validateMetadata(
	metadata: McpTemplateMetadata,
	actualTools: string[],
	registeredTools: string[],
	cwd: string,
): Promise<ValidationIssue[]> {
	const issues: ValidationIssue[] = [];

	// Check if tools array exists
	if (!metadata.tools || !Array.isArray(metadata.tools)) {
		issues.push({
			severity: "warning",
			category: "Metadata",
			message: ".mcp-template.json is missing tools array",
			file: ".mcp-template.json",
			suggestion: "Tools array should track all tools in the project",
		});
		return issues;
	}

	// Get actual tool names (without examples)
	const actualToolNames = actualTools
		.map((f) => path.basename(f, path.extname(f)))
		.filter((name) => !name.startsWith("_example"));

	// Check for tools in metadata that don't exist
	for (const tool of metadata.tools) {
		if (!actualToolNames.includes(tool.name)) {
			issues.push({
				severity: "warning",
				category: "Metadata",
				message: `Tool "${tool.name}" in .mcp-template.json doesn't exist`,
				file: ".mcp-template.json",
				suggestion: "Remove from tools array or create the tool file",
			});
		}
	}

	// Check for tools that exist but aren't in metadata
	for (const toolName of actualToolNames) {
		const inMetadata = metadata.tools.find((t) => t.name === toolName);
		if (!inMetadata) {
			issues.push({
				severity: "info",
				category: "Metadata",
				message: `Tool "${toolName}" exists but not tracked in .mcp-template.json`,
				file: ".mcp-template.json",
				suggestion: "Add to tools array for better tracking",
			});
		} else {
			// Verify metadata is accurate
			const isRegistered = registeredTools.includes(toolName);
			if (inMetadata.registered !== isRegistered) {
				issues.push({
					severity: "info",
					category: "Metadata",
					message: `Tool "${toolName}" registration status in .mcp-template.json is incorrect`,
					file: ".mcp-template.json",
				});
			}

			const unitTestPath = path.join(
				cwd,
				"test",
				"unit",
				"tools",
				`${toolName}.test.ts`,
			);
			const hasUnitTest = await fileExists(unitTestPath);
			if (inMetadata.hasUnitTest !== hasUnitTest) {
				issues.push({
					severity: "info",
					category: "Metadata",
					message: `Tool "${toolName}" unit test status in .mcp-template.json is incorrect`,
					file: ".mcp-template.json",
				});
			}
		}
	}

	return issues;
}

/**
 * Check if file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

/**
 * Create validation result
 */
function createResult(
	issues: ValidationIssue[],
	strict = false,
): ValidationResult {
	const summary = {
		errors: issues.filter((i) => i.severity === "error").length,
		warnings: issues.filter((i) => i.severity === "warning").length,
		info: issues.filter((i) => i.severity === "info").length,
	};

	const passed = strict
		? summary.errors === 0 && summary.warnings === 0
		: summary.errors === 0;

	return { passed, issues, summary };
}

/**
 * Print validation results
 */
function printValidationResults(result: ValidationResult): void {
	if (result.issues.length === 0) {
		console.log("✅ No issues found! Project is valid.\n");
		return;
	}

	// Group issues by category
	const byCategory = new Map<string, ValidationIssue[]>();
	for (const issue of result.issues) {
		const existing = byCategory.get(issue.category) || [];
		existing.push(issue);
		byCategory.set(issue.category, existing);
	}

	// Print each category
	for (const [category, issues] of byCategory) {
		console.log(`\n${category}:`);
		for (const issue of issues) {
			const icon =
				issue.severity === "error"
					? "❌"
					: issue.severity === "warning"
						? "⚠️"
						: "ℹ️";
			console.log(`  ${icon} ${issue.message}`);
			if (issue.file) {
				console.log(`     File: ${issue.file}`);
			}
			if (issue.suggestion) {
				console.log(`     Suggestion: ${issue.suggestion}`);
			}
		}
	}

	// Print summary
	console.log(`\n${"=".repeat(60)}`);
	console.log(`Summary: ${result.summary.errors} errors, ${result.summary.warnings} warnings, ${result.summary.info} info`);

	if (result.passed) {
		console.log("✅ Validation passed (no critical errors)\n");
	} else {
		console.log("❌ Validation failed (fix errors above)\n");
	}
}

/**
 * Convert string to camelCase
 */
function toCamelCase(str: string): string {
	return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert string to snake_case
 */
function toSnakeCase(str: string): string {
	return str
		.replace(/([A-Z])/g, "_$1")
		.toLowerCase()
		.replace(/^_/, "");
}

/**
 * Convert string to kebab-case
 * Handles PascalCase → kebab-case conversion for tool names
 */
function toKebabCase(str: string): string {
	return str
		.replace(/([a-z])([A-Z])/g, "$1-$2")
		.replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
		.toLowerCase();
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================================================
// Public API Exports
// ============================================================================

/**
 * These exports allow programmatic usage of the validation system.
 * Example:
 *
 * import { validateProject } from 'mcp-server-kit/validation';
 *
 * const result = await validateProject(process.cwd(), { strict: true });
 * if (!result.passed) {
 *   for (const issue of result.issues) {
 *     console.error(`${issue.severity}: ${issue.message}`);
 *   }
 * }
 */

// Types are exported for programmatic usage
// validateProject is already exported above (line 100)
