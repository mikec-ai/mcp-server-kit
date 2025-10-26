/**
 * List Prompts Command
 *
 * Lists all prompts in the MCP server project with their status:
 * - Registration status
 * - Test coverage
 * - File locations
 */

import { Command } from "commander";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Prompt information
 */
interface PromptInfo {
	name: string;
	file: string;
	registered: boolean;
	hasUnitTest: boolean;
	hasIntegrationTest: boolean;
	description?: string;
}

/**
 * Create list prompts command
 */
export function createListPromptsCommand(): Command {
	return new Command("prompts")
		.description("List all prompts in the MCP server project")
		.option("-j, --json", "Output as JSON")
		.option(
			"-f, --filter <status>",
			"Filter by status (all, registered, unregistered, tested, untested)",
			"all",
		)
		.option("--show-examples", "Include example prompts in output")
		.action(async (options) => {
			const cwd = process.cwd();

			try {
				const prompts = await discoverPrompts(cwd, options.showExamples);

				// Filter prompts
				const filtered = filterPrompts(prompts, options.filter);

				// Output
				if (options.json) {
					console.log(JSON.stringify(filtered, null, 2));
				} else {
					printPromptsTable(filtered);
				}
			} catch (error) {
				console.error(
					`❌ Error: ${error instanceof Error ? error.message : String(error)}`,
				);
				process.exit(1);
			}
		});
}

/**
 * Discover all prompts in the project
 */
async function discoverPrompts(
	cwd: string,
	includeExamples = false,
): Promise<PromptInfo[]> {
	const prompts: PromptInfo[] = [];

	// 1. Scan src/prompts/ directory
	const promptsDir = path.join(cwd, "src", "prompts");
	let promptFiles: string[] = [];

	try {
		const files = await fs.readdir(promptsDir);
		promptFiles = files
			.filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
			.filter((f) => includeExamples || !f.startsWith("_example"));
	} catch (error) {
		throw new Error(
			"src/prompts/ directory not found. Are you in an MCP server project?",
		);
	}

	// 2. Check index.ts for registrations
	const indexPath = path.join(cwd, "src", "index.ts");
	const registeredPrompts = await checkPromptRegistrations(indexPath);

	// 3. Build prompt info
	for (const file of promptFiles) {
		const promptName = path.basename(file, ".ts");
		const promptPath = path.join(promptsDir, file);

		// Check registration
		const registered = registeredPrompts.includes(promptName);

		// Check unit test
		const unitTestPath = path.join(
			cwd,
			"test",
			"unit",
			"prompts",
			`${promptName}.test.ts`,
		);
		const hasUnitTest = await fileExists(unitTestPath);

		// Check integration test
		const integrationTestPath = path.join(
			cwd,
			"test",
			"integration",
			"specs",
			"prompts",
			`${promptName}.yaml`,
		);
		const hasIntegrationTest = await fileExists(integrationTestPath);

		// Try to extract description from file
		const description = await extractDescription(promptPath);

		prompts.push({
			name: promptName,
			file: path.relative(cwd, promptPath),
			registered,
			hasUnitTest,
			hasIntegrationTest,
			description,
		});
	}

	return prompts;
}

/**
 * Check which prompts are registered in src/index.ts
 */
async function checkPromptRegistrations(indexPath: string): Promise<string[]> {
	try {
		const content = await fs.readFile(indexPath, "utf-8");
		const registered: string[] = [];

		// Match: registerXxxPrompt(this.server);
		const registerRegex = /register(\w+)Prompt\(this\.server\)/g;
		let match: RegExpExecArray | null;

		while ((match = registerRegex.exec(content)) !== null) {
			const promptName = toKebabCase(match[1]);
			registered.push(promptName);
		}

		return registered;
	} catch (error) {
		return [];
	}
}

/**
 * Extract description from prompt file
 */
async function extractDescription(filePath: string): Promise<string> {
	try {
		const content = await fs.readFile(filePath, "utf-8");

		// Look for server.prompt() call and extract description parameter
		const promptCallRegex = /server\.prompt\(\s*["']([^"']+)["'],\s*["']([^"']+)["']/;
		const match = content.match(promptCallRegex);

		if (match && match[2]) {
			return match[2];
		}

		// Fallback: look for file header comment
		const headerRegex = /\/\*\*[\s\S]*?\*\s*([^\n]+)/;
		const headerMatch = content.match(headerRegex);

		if (headerMatch && headerMatch[1]) {
			return headerMatch[1].trim();
		}

		return "No description";
	} catch (error) {
		return "No description";
	}
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
 * Filter prompts by status
 */
function filterPrompts(prompts: PromptInfo[], filter: string): PromptInfo[] {
	switch (filter.toLowerCase()) {
		case "registered":
			return prompts.filter((p) => p.registered);
		case "unregistered":
			return prompts.filter((p) => !p.registered);
		case "tested":
			return prompts.filter((p) => p.hasUnitTest || p.hasIntegrationTest);
		case "untested":
			return prompts.filter((p) => !p.hasUnitTest && !p.hasIntegrationTest);
		case "all":
		default:
			return prompts;
	}
}

/**
 * Print prompts in a formatted table
 */
function printPromptsTable(prompts: PromptInfo[]): void {
	if (prompts.length === 0) {
		console.log("No prompts found.\n");
		return;
	}

	console.log(`\nFound ${prompts.length} prompt${prompts.length === 1 ? "" : "s"}:\n`);

	// Calculate column widths
	const nameWidth = Math.max(
		10,
		...prompts.map((p) => p.name.length),
	);
	const fileWidth = Math.max(
		20,
		...prompts.map((p) => p.file.length),
	);

	// Header
	const header = `${"NAME".padEnd(nameWidth)} | REG | UNIT | INT | ${"FILE".padEnd(fileWidth)}`;
	console.log(header);
	console.log("=".repeat(header.length));

	// Rows
	for (const prompt of prompts) {
		const name = prompt.name.padEnd(nameWidth);
		const reg = prompt.registered ? " ✓ " : " ✗ ";
		const unit = prompt.hasUnitTest ? " ✓ " : " ✗ ";
		const int = prompt.hasIntegrationTest ? " ✓ " : " ✗ ";
		const file = prompt.file.padEnd(fileWidth);

		console.log(`${name} | ${reg} | ${unit} | ${int} | ${file}`);

		// Show description if available
		if (prompt.description && prompt.description !== "No description") {
			console.log(`${"".padEnd(nameWidth)}   ${prompt.description}`);
		}
	}

	// Summary
	const registered = prompts.filter((p) => p.registered).length;
	const withUnitTests = prompts.filter((p) => p.hasUnitTest).length;
	const withIntegrationTests = prompts.filter((p) => p.hasIntegrationTest).length;

	console.log("\nSummary:");
	console.log(`  Registered:       ${registered}/${prompts.length}`);
	console.log(`  Unit tests:       ${withUnitTests}/${prompts.length}`);
	console.log(`  Integration tests: ${withIntegrationTests}/${prompts.length}`);
	console.log("");
}

/**
 * Convert PascalCase to kebab-case
 */
function toKebabCase(str: string): string {
	return str
		.replace(/([A-Z])/g, "-$1")
		.toLowerCase()
		.replace(/^-/, "");
}
