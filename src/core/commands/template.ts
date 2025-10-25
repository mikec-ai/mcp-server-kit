/**
 * Template Commands
 *
 * Commands for managing and discovering templates.
 */

import { Command } from "commander";
import { TemplateRegistry } from "../template-system/registry.js";
import type { TemplateFilter } from "../template-system/types.js";

/**
 * Create the 'template list' command
 */
function createListCommand(): Command {
	return new Command("list")
		.description("List available templates")
		.option("--json", "Output as JSON")
		.option("--runtime <runtime>", "Filter by runtime")
		.option("--transport <transport>", "Filter by transport")
		.option("--deployment <deployment>", "Filter by deployment (remote/local)")
		.option("--language <language>", "Filter by language (typescript/javascript)")
		.action(async (options) => {
			try {
				const registry = new TemplateRegistry();

				// Build filter
				const filter: TemplateFilter = {};
				if (options.runtime) filter.runtime = options.runtime;
				if (options.transport) filter.transport = options.transport;
				if (options.deployment) filter.deployment = options.deployment;
				if (options.language) filter.language = options.language;

				// Get templates
				const templates = await registry.listTemplates(filter);

				if (options.json) {
					console.log(JSON.stringify(templates, null, 2));
				} else {
					if (templates.length === 0) {
						console.log("No templates found matching the filter criteria.\n");
						return;
					}

					console.log(`\nAvailable Templates (${templates.length}):\n`);
					for (const template of templates) {
						console.log(`  ${template.id}`);
						console.log(`    Name: ${template.name}`);
						console.log(`    Description: ${template.description}`);
						console.log(`    Runtime: ${template.capabilities.runtime}`);
						console.log(`    Transport: ${template.capabilities.transport.join(", ")}`);
						console.log(`    Deployment: ${template.capabilities.deployment}`);
						console.log(`    Language: ${template.capabilities.language}`);
						console.log();
					}
				}
			} catch (error) {
				console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
				process.exit(1);
			}
		});
}

/**
 * Create the 'template info' command
 */
function createInfoCommand(): Command {
	return new Command("info")
		.description("Show detailed information about a template")
		.argument("<template-id>", "Template ID")
		.option("--json", "Output as JSON")
		.action(async (templateId, options) => {
			try {
				const registry = new TemplateRegistry();
				const template = await registry.getTemplate(templateId);

				if (options.json) {
					console.log(JSON.stringify(template.config, null, 2));
				} else {
					console.log(`\nTemplate: ${template.config.name}\n`);
					console.log(`ID: ${template.config.id}`);
					console.log(`Version: ${template.config.version}`);
					console.log(`Description: ${template.config.description}`);
					console.log();

					console.log("Capabilities:");
					console.log(`  Runtime: ${template.config.capabilities.runtime}`);
					console.log(`  Transport: ${template.config.capabilities.transport.join(", ")}`);
					console.log(`  Deployment: ${template.config.capabilities.deployment}`);
					console.log(`  Language: ${template.config.capabilities.language}`);
					console.log();

					console.log("Features:");
					console.log(`  Unit Testing: ${template.config.features.unitTesting ? "✓" : "✗"}`);
					console.log(
						`  Integration Testing: ${template.config.features.integrationTesting ? "✓" : "✗"}`,
					);
					console.log(`  Documentation: ${template.config.features.documentation ? "✓" : "✗"}`);
					if (template.config.features.exampleTools.length > 0) {
						console.log(
							`  Example Tools: ${template.config.features.exampleTools.join(", ")}`,
						);
					}
					console.log();

					if (template.config.scaffolding.variables.length > 0) {
						console.log("Variables:");
						for (const v of template.config.scaffolding.variables) {
							const req = v.required ? "(required)" : "(optional)";
							const def = v.default ? ` [default: ${v.default}]` : "";
							console.log(`  ${v.name} ${req}${def}`);
							if (v.prompt) {
								console.log(`    ${v.prompt}`);
							}
						}
						console.log();
					}
				}
			} catch (error) {
				console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
				process.exit(1);
			}
		});
}

/**
 * Create the 'template validate' command
 */
function createValidateCommand(): Command {
	return new Command("validate")
		.description("Validate a template configuration")
		.argument("<template-id>", "Template ID")
		.option("--json", "Output as JSON")
		.action(async (templateId, options) => {
			try {
				const registry = new TemplateRegistry();
				const result = await registry.validateTemplate(templateId);

				if (options.json) {
					console.log(JSON.stringify(result, null, 2));
				} else {
					if (result.valid) {
						console.log(`\n✅ Template '${templateId}' is valid\n`);
					} else {
						console.log(`\n❌ Template '${templateId}' has validation errors:\n`);
						for (const error of result.errors) {
							console.log(`  - ${error}`);
						}
						console.log();
					}

					if (result.warnings.length > 0) {
						console.log("Warnings:");
						for (const warning of result.warnings) {
							console.log(`  ⚠️  ${warning}`);
						}
						console.log();
					}
				}

				if (!result.valid) {
					process.exit(1);
				}
			} catch (error) {
				console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
				process.exit(1);
			}
		});
}

/**
 * Create the 'template capabilities' command
 */
function createCapabilitiesCommand(): Command {
	return new Command("capabilities")
		.description("Show all available capabilities across templates")
		.option("--json", "Output as JSON")
		.action(async (options) => {
			try {
				const registry = new TemplateRegistry();
				const capabilities = await registry.getCapabilities();

				const output = {
					runtimes: Array.from(capabilities.runtimes),
					transports: Array.from(capabilities.transports),
					deployments: Array.from(capabilities.deployments),
					languages: Array.from(capabilities.languages),
				};

				if (options.json) {
					console.log(JSON.stringify(output, null, 2));
				} else {
					console.log("\nAvailable Capabilities:\n");
					console.log("Runtimes:");
					for (const runtime of output.runtimes) {
						console.log(`  - ${runtime}`);
					}
					console.log();

					console.log("Transports:");
					for (const transport of output.transports) {
						console.log(`  - ${transport}`);
					}
					console.log();

					console.log("Deployments:");
					for (const deployment of output.deployments) {
						console.log(`  - ${deployment}`);
					}
					console.log();

					console.log("Languages:");
					for (const language of output.languages) {
						console.log(`  - ${language}`);
					}
					console.log();
				}
			} catch (error) {
				console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
				process.exit(1);
			}
		});
}

/**
 * Create the main 'template' command
 */
export function createTemplateCommand(): Command {
	const templateCmd = new Command("template").description("Manage and discover templates");

	templateCmd.addCommand(createListCommand());
	templateCmd.addCommand(createInfoCommand());
	templateCmd.addCommand(createValidateCommand());
	templateCmd.addCommand(createCapabilitiesCommand());

	return templateCmd;
}
