/**
 * List Resources Command
 *
 * Lists all resources in the MCP server project with their status:
 * - Registration status
 * - Test coverage
 * - File locations
 */

import { Command } from "commander";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Resource information
 */
export interface ResourceInfo {
	name: string;
	file: string;
	registered: boolean;
	hasUnitTest: boolean;
	hasIntegrationTest: boolean;
	description?: string;
}

/**
 * Create list resources command
 */
export function createListResourcesCommand(): Command {
	return new Command("resources")
		.description("List all resources in the MCP server project")
		.option("-j, --json", "Output as JSON")
		.option(
			"-f, --filter <status>",
			"Filter by status (all, registered, unregistered, tested, untested)",
			"all",
		)
		.option("--show-examples", "Include example resources in output")
		.action(async (options) => {
			const cwd = process.cwd();

			try {
				const resources = await discoverResources(cwd, options.showExamples);

				// Filter resources
				const filtered = filterResources(resources, options.filter);

				// Output
				if (options.json) {
					console.log(JSON.stringify(filtered, null, 2));
				} else {
					printResourcesTable(filtered);
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
 * Discover all resources in the project
 */
export async function discoverResources(
	cwd: string,
	includeExamples = false,
): Promise<ResourceInfo[]> {
	const resources: ResourceInfo[] = [];

	// 1. Scan src/resources/ directory
	const resourcesDir = path.join(cwd, "src", "resources");
	let resourceFiles: string[] = [];

	try {
		const files = await fs.readdir(resourcesDir);
		resourceFiles = files
			.filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
			.filter((f) => includeExamples || !f.startsWith("_example"));
	} catch (error) {
		throw new Error(
			"src/resources/ directory not found. Are you in an MCP server project?",
		);
	}

	// 2. Check index.ts for registrations
	const indexPath = path.join(cwd, "src", "index.ts");
	const registeredResources = await checkResourceRegistrations(indexPath);

	// 3. Build resource info
	for (const file of resourceFiles) {
		const resourceName = path.basename(file, ".ts");
		const resourcePath = path.join(resourcesDir, file);

		// Check registration
		const registered = registeredResources.includes(resourceName);

		// Check unit test
		const unitTestPath = path.join(
			cwd,
			"test",
			"unit",
			"resources",
			`${resourceName}.test.ts`,
		);
		const hasUnitTest = await fileExists(unitTestPath);

		// Check integration test
		const integrationTestPath = path.join(
			cwd,
			"test",
			"integration",
			"specs",
			"resources",
			`${resourceName}.yaml`,
		);
		const hasIntegrationTest = await fileExists(integrationTestPath);

		// Try to extract description from file
		const description = await extractDescription(resourcePath);

		resources.push({
			name: resourceName,
			file: path.relative(cwd, resourcePath),
			registered,
			hasUnitTest,
			hasIntegrationTest,
			description,
		});
	}

	return resources;
}

/**
 * Check which resources are registered in src/index.ts
 */
export async function checkResourceRegistrations(indexPath: string): Promise<string[]> {
	try {
		const content = await fs.readFile(indexPath, "utf-8");
		const registered: string[] = [];

		// Match: registerXxxResource(this.server);
		const registerRegex = /register(\w+)Resource\(this\.server\)/g;
		let match: RegExpExecArray | null;

		while ((match = registerRegex.exec(content)) !== null) {
			const resourceName = toKebabCase(match[1]);
			registered.push(resourceName);
		}

		return registered;
	} catch (error) {
		return [];
	}
}

/**
 * Extract description from resource file
 */
async function extractDescription(filePath: string): Promise<string> {
	try {
		const content = await fs.readFile(filePath, "utf-8");

		// Look for server.resource() call and extract description parameter
		const resourceCallRegex = /server\.resource\(\s*["']([^"']+)["'],[\s\S]*?description:\s*["']([^"']+)["']/;
		const match = content.match(resourceCallRegex);

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
 * Filter resources by status
 */
export function filterResources(resources: ResourceInfo[], filter: string): ResourceInfo[] {
	switch (filter.toLowerCase()) {
		case "registered":
			return resources.filter((r) => r.registered);
		case "unregistered":
			return resources.filter((r) => !r.registered);
		case "tested":
			return resources.filter((r) => r.hasUnitTest || r.hasIntegrationTest);
		case "untested":
			return resources.filter((r) => !r.hasUnitTest && !r.hasIntegrationTest);
		case "all":
		default:
			return resources;
	}
}

/**
 * Print resources in a formatted table
 */
function printResourcesTable(resources: ResourceInfo[]): void {
	if (resources.length === 0) {
		console.log("No resources found.\n");
		return;
	}

	console.log(`\nFound ${resources.length} resource${resources.length === 1 ? "" : "s"}:\n`);

	// Calculate column widths
	const nameWidth = Math.max(
		10,
		...resources.map((r) => r.name.length),
	);
	const fileWidth = Math.max(
		20,
		...resources.map((r) => r.file.length),
	);

	// Header
	const header = `${"NAME".padEnd(nameWidth)} | REG | UNIT | INT | ${"FILE".padEnd(fileWidth)}`;
	console.log(header);
	console.log("=".repeat(header.length));

	// Rows
	for (const resource of resources) {
		const name = resource.name.padEnd(nameWidth);
		const reg = resource.registered ? " ✓ " : " ✗ ";
		const unit = resource.hasUnitTest ? " ✓ " : " ✗ ";
		const int = resource.hasIntegrationTest ? " ✓ " : " ✗ ";
		const file = resource.file.padEnd(fileWidth);

		console.log(`${name} | ${reg} | ${unit} | ${int} | ${file}`);

		// Show description if available
		if (resource.description && resource.description !== "No description") {
			console.log(`${"".padEnd(nameWidth)}   ${resource.description}`);
		}
	}

	// Summary
	const registered = resources.filter((r) => r.registered).length;
	const withUnitTests = resources.filter((r) => r.hasUnitTest).length;
	const withIntegrationTests = resources.filter((r) => r.hasIntegrationTest).length;

	console.log("\nSummary:");
	console.log(`  Registered:       ${registered}/${resources.length}`);
	console.log(`  Unit tests:       ${withUnitTests}/${resources.length}`);
	console.log(`  Integration tests: ${withIntegrationTests}/${resources.length}`);
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
