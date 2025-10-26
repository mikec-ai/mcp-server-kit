/**
 * Registration Service
 *
 * Handles entity registration in src/index.ts
 * Shared logic for adding imports and registration calls
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Configuration for entity registration
 */
export interface RegistrationConfig {
	/** Entity type (tool, prompt, resource) */
	entityType: "tool" | "prompt" | "resource";
	/** Entity type plural (tools, prompts, resources) */
	entityTypePlural: "tools" | "prompts" | "resources";
	/** Directory path (e.g., "./tools/") */
	directory: string;
	/** Function name suffix (e.g., "Tool", "Prompt", "Resource") */
	functionSuffix: string;
}

/**
 * Service for managing entity registrations in index.ts
 */
export class RegistrationService {
	private static readonly ENTITY_ORDER = ["tool", "prompt", "resource"];

	/**
	 * Register an entity in src/index.ts
	 */
	async registerEntity(
		cwd: string,
		name: string,
		capitalizedName: string,
		config: RegistrationConfig,
	): Promise<void> {
		const indexPath = join(cwd, "src", "index.ts");

		if (!existsSync(indexPath)) {
			throw new Error("src/index.ts not found");
		}

		const content = await readFile(indexPath, "utf-8");
		const functionName = `register${capitalizedName}${config.functionSuffix}`;

		// Check if already registered
		if (content.includes(functionName)) {
			console.warn(
				`  ⚠️  ${config.entityType.charAt(0).toUpperCase() + config.entityType.slice(1)} already registered in src/index.ts`,
			);
			return;
		}

		// Add import and registration call
		const importStatement = `import { ${functionName} } from "${config.directory}${name}.js";`;
		const registrationCall = `\t\t${functionName}(this.server);`;

		let updatedContent = this.addImport(content, importStatement, config);
		updatedContent = this.addRegistrationCall(
			updatedContent,
			registrationCall,
			config,
		);

		await writeFile(indexPath, updatedContent, "utf-8");
	}

	/**
	 * Check if an entity is already registered
	 */
	async isRegistered(
		cwd: string,
		capitalizedName: string,
		config: RegistrationConfig,
	): Promise<boolean> {
		const indexPath = join(cwd, "src", "index.ts");

		if (!existsSync(indexPath)) {
			return false;
		}

		const content = await readFile(indexPath, "utf-8");
		const functionName = `register${capitalizedName}${config.functionSuffix}`;

		return content.includes(functionName);
	}

	/**
	 * Add import statement to the file
	 */
	private addImport(
		content: string,
		importStatement: string,
		config: RegistrationConfig,
	): string {
		let updatedContent = content;
		const currentTypeRegex = this.getImportRegex(config.directory);

		// Try to add after imports of the same type
		const currentTypeMatches = Array.from(content.matchAll(currentTypeRegex));

		if (currentTypeMatches.length > 0) {
			const lastMatch = currentTypeMatches[currentTypeMatches.length - 1];
			const insertPos = lastMatch.index! + lastMatch[0].length;
			return (
				content.slice(0, insertPos) +
				`\n${importStatement}` +
				content.slice(insertPos)
			);
		}

		// No imports of same type, try fallback types in order
		const currentIndex = RegistrationService.ENTITY_ORDER.indexOf(
			config.entityType,
		);

		// Try to add after previous entity types
		for (let i = currentIndex - 1; i >= 0; i--) {
			const fallbackType = RegistrationService.ENTITY_ORDER[i];
			const fallbackDir = `./${fallbackType}s/`;
			const fallbackRegex = this.getImportRegex(fallbackDir);
			const fallbackMatches = Array.from(content.matchAll(fallbackRegex));

			if (fallbackMatches.length > 0) {
				const lastMatch = fallbackMatches[fallbackMatches.length - 1];
				const insertPos = lastMatch.index! + lastMatch[0].length;
				const comment = `\n\n// ${config.entityTypePlural.charAt(0).toUpperCase() + config.entityTypePlural.slice(1)}\n`;
				return (
					content.slice(0, insertPos) +
					comment +
					importStatement +
					content.slice(insertPos)
				);
			}
		}

		// Add after any imports
		const lastImportMatch = content.match(
			/import\s+[^;]+;(?=\s*\n\s*(?:\/\*|\/\/|\n|export|class))/g,
		);

		if (lastImportMatch) {
			const lastImport = lastImportMatch[lastImportMatch.length - 1];
			const insertPos = content.indexOf(lastImport) + lastImport.length;
			const comment = `\n\n// ${config.entityTypePlural.charAt(0).toUpperCase() + config.entityTypePlural.slice(1)}\n`;
			return (
				content.slice(0, insertPos) +
				comment +
				importStatement +
				content.slice(insertPos)
			);
		}

		return updatedContent;
	}

	/**
	 * Add registration call to init() method
	 */
	private addRegistrationCall(
		content: string,
		registrationCall: string,
		config: RegistrationConfig,
	): string {
		const initMethodRegex = /async\s+init\(\)\s*\{([^}]*)\}/;
		const initMatch = content.match(initMethodRegex);

		if (!initMatch) {
			return content;
		}

		const initBody = initMatch[1];
		const currentTypePattern = `register\\w+${config.functionSuffix}\\(this\\.server\\);`;
		const currentTypeRegex = new RegExp(`\\s+${currentTypePattern}`, "g");
		const currentTypeMatches = initBody.match(currentTypeRegex);

		// Add after registrations of the same type
		if (currentTypeMatches) {
			const lastCall = currentTypeMatches[currentTypeMatches.length - 1];
			const insertPos =
				initMatch.index! + initMatch[0].lastIndexOf(lastCall) + lastCall.length;
			return (
				content.slice(0, insertPos) +
				`\n${registrationCall}` +
				content.slice(insertPos)
			);
		}

		// Try fallback types in order
		const currentIndex = RegistrationService.ENTITY_ORDER.indexOf(
			config.entityType,
		);

		for (let i = currentIndex - 1; i >= 0; i--) {
			const fallbackType = RegistrationService.ENTITY_ORDER[i];
			const fallbackSuffix =
				fallbackType.charAt(0).toUpperCase() + fallbackType.slice(1);
			const fallbackPattern = `register\\w+${fallbackSuffix}\\(this\\.server\\);`;
			const fallbackRegex = new RegExp(`\\s+${fallbackPattern}`, "g");
			const fallbackMatches = initBody.match(fallbackRegex);

			if (fallbackMatches) {
				const lastCall = fallbackMatches[fallbackMatches.length - 1];
				const insertPos =
					initMatch.index! +
					initMatch[0].lastIndexOf(lastCall) +
					lastCall.length;
				const comment = `\n\n\t\t// Register all ${config.entityTypePlural}\n`;
				return (
					content.slice(0, insertPos) +
					comment +
					registrationCall +
					content.slice(insertPos)
				);
			}
		}

		// Add at start of init method
		const insertPos = initMatch.index! + initMatch[0].indexOf("{") + 1;
		const comment = `\n\t\t// Register all ${config.entityTypePlural}\n`;
		return (
			content.slice(0, insertPos) +
			comment +
			registrationCall +
			content.slice(insertPos)
		);
	}

	/**
	 * Get import regex pattern for a directory
	 */
	private getImportRegex(directory: string): RegExp {
		// Escape special regex characters in directory
		const escapedDir = directory.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		return new RegExp(
			`import\\s+\\{[^}]+\\}\\s+from\\s+["']${escapedDir}[^"']+["'];`,
			"g",
		);
	}
}
