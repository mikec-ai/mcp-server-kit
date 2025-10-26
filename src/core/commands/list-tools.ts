/**
 * List Tools Command
 *
 * Lists all tools in the MCP server project with their status:
 * - Registration status
 * - Test coverage
 * - File locations
 */

import { Command } from "commander";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Tool information
 */
export interface ToolInfo {
	name: string;
	file: string;
	registered: boolean;
	hasUnitTest: boolean;
	hasIntegrationTest: boolean;
	description?: string;
}

/**
 * MCP Template metadata
 */
interface McpTemplateMetadata {
	id: string;
	version: string;
	name: string;
	tools: Array<{
		name: string;
		file: string;
		registered: boolean;
		hasUnitTest: boolean;
		hasIntegrationTest: boolean;
	}>;
	[key: string]: unknown;
}

/**
 * Create list tools command
 */
export function createListToolsCommand(): Command {
	return new Command("tools")
		.description("List all tools in the MCP server project")
		.option("-j, --json", "Output as JSON")
		.option(
			"-f, --filter <status>",
			"Filter by status (all, registered, unregistered, tested, untested)",
			"all",
		)
		.option("--show-examples", "Include example tools in output")
		.action(async (options) => {
			const cwd = process.cwd();

			try {
				const tools = await discoverTools(cwd, options.showExamples);

				// Filter tools
				const filtered = filterTools(tools, options.filter);

				// Output
				if (options.json) {
					console.log(JSON.stringify(filtered, null, 2));
				} else {
					printToolsTable(filtered);
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
 * Discover all tools in the project
 */
export async function discoverTools(
	cwd: string,
	includeExamples = false,
): Promise<ToolInfo[]> {
	const tools: ToolInfo[] = [];

	// 1. Scan src/tools/ directory
	const toolsDir = path.join(cwd, "src", "tools");
	let toolFiles: string[] = [];

	try {
		const files = await fs.readdir(toolsDir);
		toolFiles = files
			.filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
			.filter((f) => includeExamples || !f.startsWith("_example"));
	} catch (error) {
		throw new Error(
			"src/tools/ directory not found. Are you in an MCP server project?",
		);
	}

	// 2. Check index.ts for registrations
	const indexPath = path.join(cwd, "src", "index.ts");
	const registeredTools = await checkToolRegistrations(indexPath);

	// 3. Build tool info
	for (const file of toolFiles) {
		const toolName = path.basename(file, ".ts");
		const toolPath = path.join(toolsDir, file);

		// Check registration
		const registered = registeredTools.includes(toolName);

		// Check unit test
		const unitTestPath = path.join(
			cwd,
			"test",
			"unit",
			"tools",
			`${toolName}.test.ts`,
		);
		const hasUnitTest = await fileExists(unitTestPath);

		// Check integration test
		const integrationTestPath = path.join(
			cwd,
			"test",
			"integration",
			"specs",
			`${toolName}.yaml`,
		);
		const hasIntegrationTest = await fileExists(integrationTestPath);

		// Try to extract description from file
		const description = await extractDescription(toolPath);

		tools.push({
			name: toolName,
			file: path.relative(cwd, toolPath),
			registered,
			hasUnitTest,
			hasIntegrationTest,
			description,
		});
	}

	return tools;
}

/**
 * Check which tools are registered in src/index.ts
 */
export async function checkToolRegistrations(indexPath: string): Promise<string[]> {
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
 * Extract description from tool file
 */
async function extractDescription(filePath: string): Promise<string> {
	try {
		const content = await fs.readFile(filePath, "utf-8");

		// Look for server.tool() call and extract description parameter
		const toolCallRegex = /server\.tool\(\s*["']([^"']+)["'],\s*["']([^"']+)["']/;
		const match = content.match(toolCallRegex);

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
 * Filter tools by status
 */
export function filterTools(tools: ToolInfo[], filter: string): ToolInfo[] {
	switch (filter.toLowerCase()) {
		case "registered":
			return tools.filter((t) => t.registered);
		case "unregistered":
			return tools.filter((t) => !t.registered);
		case "tested":
			return tools.filter((t) => t.hasUnitTest || t.hasIntegrationTest);
		case "untested":
			return tools.filter((t) => !t.hasUnitTest && !t.hasIntegrationTest);
		case "all":
		default:
			return tools;
	}
}

/**
 * Print tools in a formatted table
 */
function printToolsTable(tools: ToolInfo[]): void {
	if (tools.length === 0) {
		console.log("No tools found.\n");
		return;
	}

	console.log(`\nFound ${tools.length} tool${tools.length === 1 ? "" : "s"}:\n`);

	// Calculate column widths
	const nameWidth = Math.max(
		10,
		...tools.map((t) => t.name.length),
	);
	const fileWidth = Math.max(
		20,
		...tools.map((t) => t.file.length),
	);

	// Header
	const header = `${"NAME".padEnd(nameWidth)} | REG | UNIT | INT | ${"FILE".padEnd(fileWidth)}`;
	console.log(header);
	console.log("=".repeat(header.length));

	// Rows
	for (const tool of tools) {
		const name = tool.name.padEnd(nameWidth);
		const reg = tool.registered ? " ✓ " : " ✗ ";
		const unit = tool.hasUnitTest ? " ✓ " : " ✗ ";
		const int = tool.hasIntegrationTest ? " ✓ " : " ✗ ";
		const file = tool.file.padEnd(fileWidth);

		console.log(`${name} | ${reg} | ${unit} | ${int} | ${file}`);

		// Show description if available
		if (tool.description && tool.description !== "No description") {
			console.log(`${"".padEnd(nameWidth)}   ${tool.description}`);
		}
	}

	// Summary
	const registered = tools.filter((t) => t.registered).length;
	const withUnitTests = tools.filter((t) => t.hasUnitTest).length;
	const withIntegrationTests = tools.filter((t) => t.hasIntegrationTest).length;

	console.log("\nSummary:");
	console.log(`  Registered:       ${registered}/${tools.length}`);
	console.log(`  Unit tests:       ${withUnitTests}/${tools.length}`);
	console.log(`  Integration tests: ${withIntegrationTests}/${tools.length}`);
	console.log("");
}

/**
 * Convert PascalCase to kebab-case
 */
export function toKebabCase(str: string): string {
	return str
		.replace(/([A-Z])/g, "-$1")
		.toLowerCase()
		.replace(/^-/, "");
}
