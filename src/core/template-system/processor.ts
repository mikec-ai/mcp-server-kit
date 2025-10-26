/**
 * Template Processor
 *
 * Handles scaffolding projects from templates:
 * - Variable substitution
 * - File copying
 * - Hook execution
 * - Dependency installation
 */

import { mkdir, readdir, readFile, writeFile, copyFile, stat } from "node:fs/promises";
import { join, dirname, basename } from "node:path";
import Handlebars from "handlebars";
import type {
	ScaffoldOptions,
	ScaffoldResult,
	ScaffoldMetadata,
	TemplateHookContext,
	Template,
	TemplateVariable,
} from "./types.js";
import { TemplateRegistry } from "./registry.js";

/**
 * Template Processor - scaffolds projects from templates
 */
export class TemplateProcessor {
	private registry: TemplateRegistry;

	constructor(registry: TemplateRegistry) {
		this.registry = registry;
	}

	/**
	 * Scaffold a project from a template
	 */
	async scaffold(options: ScaffoldOptions): Promise<ScaffoldResult> {
		try {
			// 1. Load template
			const template = await this.registry.getTemplate(options.template);

			// 2. Validate variables
			const variables = this.validateVariables(
				options.variables,
				template.config.scaffolding.variables,
			);

			// 3. Create target directory
			await mkdir(options.targetDir, { recursive: true });

			// 4. Run pre-scaffold hook (if exists)
			await this.runHook(template, "pre-scaffold", {
				template: template.config,
				targetDir: options.targetDir,
				variables,
				packageManager: options.packageManager,
			});

			// 5. Copy template files with variable substitution
			await this.copyTemplateFiles(template, options.targetDir, variables);

			// 6. Run post-scaffold hook (if exists)
			await this.runHook(template, "post-scaffold", {
				template: template.config,
				targetDir: options.targetDir,
				variables,
				packageManager: options.packageManager,
			});

			// 7. Install dependencies (if enabled)
			if (!options.noInstall && template.config.scaffolding.postScaffold?.install) {
				await this.installDependencies(
					options.targetDir,
					options.packageManager,
					template.config.scaffolding.postScaffold.installCommand,
				);

				// 7.5. Run post-install commands (if configured)
				if (template.config.scaffolding.postScaffold?.postInstall) {
					await this.runPostInstallCommands(
						options.targetDir,
						template.config.scaffolding.postScaffold.postInstall,
					);
				}
			}

			// 8. Run smoke test (if configured and requested)
			if (options.smokeTest && template.config.scaffolding.postScaffold?.smokeTest) {
				await this.runSmokeTest(
					options.targetDir,
					template.config.scaffolding.postScaffold.smokeTest,
				);
			}

			// 9. Write scaffold metadata
			await this.writeMetadata(options.targetDir, template, variables);

			return {
				success: true,
				template: template.config.id,
				path: options.targetDir,
			};
		} catch (error) {
			return {
				success: false,
				template: options.template,
				path: options.targetDir,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Validate and merge variables with defaults
	 */
	private validateVariables(
		provided: Record<string, string>,
		definitions: TemplateVariable[],
	): Record<string, string> {
		const variables: Record<string, string> = {};

		for (const def of definitions) {
			// Check if required variable is provided
			if (def.required && !provided[def.name]) {
				throw new Error(`Required variable missing: ${def.name}`);
			}

			// Use provided value or default
			const value = provided[def.name] || def.default || "";

			// Validate pattern (if specified)
			if (def.pattern && value) {
				const regex = new RegExp(def.pattern);
				if (!regex.test(value)) {
					throw new Error(`Variable ${def.name} does not match pattern: ${def.pattern}`);
				}
			}

			variables[def.name] = value;
		}

		// Include any extra variables not in definitions
		for (const [key, value] of Object.entries(provided)) {
			if (!variables[key]) {
				variables[key] = value;
			}
		}

		return variables;
	}

	/**
	 * Copy template files to target directory with variable substitution
	 */
	private async copyTemplateFiles(
		template: Template,
		targetDir: string,
		variables: Record<string, string>,
	): Promise<void> {
		await this.copyDirectoryRecursive(template.filesPath, targetDir, variables);
	}

	/**
	 * Recursively copy directory with variable substitution
	 */
	private async copyDirectoryRecursive(
		sourceDir: string,
		targetDir: string,
		variables: Record<string, string>,
	): Promise<void> {
		const entries = await readdir(sourceDir, { withFileTypes: true });

		for (const entry of entries) {
			const sourcePath = join(sourceDir, entry.name);
			let targetPath = join(targetDir, entry.name);

			// Process filename (remove .hbs extension, substitute variables)
			if (entry.name.endsWith(".hbs")) {
				targetPath = join(targetDir, entry.name.slice(0, -4)); // Remove .hbs
			}

			if (entry.isDirectory()) {
				// Create directory and recurse
				await mkdir(targetPath, { recursive: true });
				await this.copyDirectoryRecursive(sourcePath, targetPath, variables);
			} else {
				// Process file
				await this.processFile(sourcePath, targetPath, variables);
			}
		}
	}

	/**
	 * Process a single file (with or without Handlebars templating)
	 */
	private async processFile(
		sourcePath: string,
		targetPath: string,
		variables: Record<string, string>,
	): Promise<void> {
		// Ensure target directory exists
		await mkdir(dirname(targetPath), { recursive: true });

		// Check if file should be templated
		if (sourcePath.endsWith(".hbs")) {
			// Read template file
			const templateContent = await readFile(sourcePath, "utf-8");

			// Compile and execute Handlebars template
			const template = Handlebars.compile(templateContent);
			const processedContent = template(variables);

			// Write processed file
			await writeFile(targetPath, processedContent, "utf-8");
		} else {
			// Binary file or non-templated file - just copy
			await copyFile(sourcePath, targetPath);
		}
	}

	/**
	 * Run a template hook
	 */
	private async runHook(
		template: Template,
		hookName: string,
		context: TemplateHookContext,
	): Promise<void> {
		if (!template.hooksPath) return;

		const hookPath = join(template.hooksPath, `${hookName}.js`);

		try {
			// Check if hook exists
			await stat(hookPath);

			// Import and execute hook
			const hook = await import(hookPath);

			if (typeof hook.default === "function") {
				await hook.default(context);
			}
		} catch (error) {
			// Only warn if hook exists but failed to execute
			// Don't warn if hook doesn't exist (ENOENT) - hooks are optional
			const isNotFound = error instanceof Error &&
				'code' in error &&
				(error as NodeJS.ErrnoException).code === 'ENOENT';

			if (!isNotFound) {
				console.warn(`⚠️  Hook ${hookName} failed: ${error instanceof Error ? error.message : String(error)}`);
			}
		}
	}

	/**
	 * Install dependencies
	 */
	private async installDependencies(
		targetDir: string,
		packageManager: string | undefined,
		customCommand?: string,
	): Promise<void> {
		const { spawn } = await import("node:child_process");

		// Use custom command or detect package manager
		const command = customCommand || this.getInstallCommand(packageManager);

		return new Promise((resolve, reject) => {
			const [cmd, ...args] = command.split(" ");

			const proc = spawn(cmd, args, {
				cwd: targetDir,
				stdio: "inherit",
				shell: true,
			});

			proc.on("close", (code) => {
				if (code === 0) {
					resolve();
				} else {
					reject(new Error(`Install command failed with code ${code}`));
				}
			});

			proc.on("error", (error) => {
				reject(error);
			});
		});
	}

	/**
	 * Run post-install commands
	 */
	private async runPostInstallCommands(
		targetDir: string,
		commands: string[],
	): Promise<void> {
		const { spawn } = await import("node:child_process");

		console.log(`\n📦 Running ${commands.length} post-install command(s)...\n`);

		for (const command of commands) {
			await new Promise<void>((resolve, reject) => {
				const [cmd, ...args] = command.split(" ");

				const proc = spawn(cmd, args, {
					cwd: targetDir,
					stdio: "inherit",
					shell: true,
				});

				proc.on("close", (code) => {
					if (code === 0) {
						resolve();
					} else {
						reject(new Error(`Post-install command "${command}" failed with code ${code}`));
					}
				});

				proc.on("error", (error) => {
					reject(error);
				});
			});
		}
	}

	/**
	 * Get install command for package manager
	 */
	private getInstallCommand(packageManager?: string): string {
		switch (packageManager) {
			case "pnpm":
				return "pnpm install";
			case "yarn":
				return "yarn install";
			case "bun":
				return "bun install";
			case "npm":
			default:
				return "npm install";
		}
	}

	/**
	 * Run smoke test
	 */
	private async runSmokeTest(targetDir: string, smokeTestCommand: string): Promise<void> {
		const { spawn } = await import("node:child_process");

		return new Promise((resolve, reject) => {
			const [cmd, ...args] = smokeTestCommand.split(" ");

			const proc = spawn(cmd, args, {
				cwd: targetDir,
				stdio: "inherit",
				shell: true,
			});

			proc.on("close", (code) => {
				if (code === 0) {
					resolve();
				} else {
					console.warn(`Smoke test failed with code ${code} (continuing anyway)`);
					resolve(); // Don't fail scaffolding due to smoke test failure
				}
			});

			proc.on("error", (error) => {
				console.warn(`Smoke test error: ${error} (continuing anyway)`);
				resolve(); // Don't fail scaffolding
			});
		});
	}

	/**
	 * Write scaffold metadata to .mcp-template.json
	 */
	private async writeMetadata(
		targetDir: string,
		template: Template,
		variables: Record<string, string>,
	): Promise<void> {
		const metadata: ScaffoldMetadata = {
			id: template.config.id,
			version: template.config.version,
			name: template.config.name,
			mcp_sdk_version: template.config.dependencies.mcp_sdk,
			agents_version: template.config.dependencies.agents,
			scaffolded_at: new Date().toISOString(),
			variables,
		};

		const metadataPath = join(targetDir, ".mcp-template.json");
		await writeFile(metadataPath, JSON.stringify(metadata, null, "\t"), "utf-8");
	}
}
