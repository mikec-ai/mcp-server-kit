/**
 * Test Project Setup Helpers
 *
 * Utilities for creating test MCP server projects with various configurations
 * for command testing.
 */

import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { TemplateProcessor } from "@/core/template-system/processor";
import { TemplateRegistry } from "@/core/template-system/registry";

/**
 * Options for creating a test project
 */
export interface CreateTestProjectOptions {
	/**
	 * Project name (defaults to "test-project")
	 */
	name?: string;

	/**
	 * Template to use (defaults to "cloudflare-remote")
	 */
	template?: string;

	/**
	 * Tools to create in the project
	 */
	tools?: Array<{
		name: string;
		registered?: boolean;
		hasUnitTest?: boolean;
		hasIntegrationTest?: boolean;
	}>;

	/**
	 * Whether to create a valid .mcp-template.json
	 */
	hasMetadata?: boolean;

	/**
	 * Whether to create wrangler.jsonc
	 */
	hasWranglerConfig?: boolean;
}

/**
 * Create a test project in a temporary directory
 *
 * @returns Path to the project directory
 */
export async function createTestProject(
	options: CreateTestProjectOptions = {},
): Promise<string> {
	const tempDir = await mkdtemp(join(tmpdir(), "mcp-test-"));
	const projectName = options.name || "test-project";
	const projectDir = join(tempDir, projectName);

	// Scaffold a basic project using the template system
	const registry = new TemplateRegistry();
	const processor = new TemplateProcessor(registry);

	await processor.scaffold({
		template: options.template || "cloudflare-remote",
		targetDir: projectDir,
		variables: {
			PROJECT_NAME: projectName,
			MCP_SERVER_NAME: projectName,
			PORT: "8788",
			DESCRIPTION: "Test project",
		},
		noInstall: true, // Don't install dependencies in tests
	});

	// Add custom tools if specified
	if (options.tools) {
		for (const tool of options.tools) {
			await addToolToProject(projectDir, tool.name, {
				registered: tool.registered ?? true,
				hasUnitTest: tool.hasUnitTest ?? false,
				hasIntegrationTest: tool.hasIntegrationTest ?? false,
			});
		}
	}

	// Remove metadata if not wanted
	if (options.hasMetadata === false) {
		await rm(join(projectDir, ".mcp-template.json"), { force: true });
	}

	// Remove wrangler config if not wanted
	if (options.hasWranglerConfig === false) {
		await rm(join(projectDir, "wrangler.jsonc"), { force: true });
	}

	return projectDir;
}

/**
 * Get the parent temp directory from a project directory
 * (for cleanup purposes)
 */
export function getTempDir(projectDir: string): string {
	return projectDir.substring(0, projectDir.lastIndexOf("/"));
}

/**
 * Options for adding a tool to a project
 */
interface AddToolOptions {
	registered?: boolean;
	hasUnitTest?: boolean;
	hasIntegrationTest?: boolean;
	description?: string;
}

/**
 * Options for adding a resource to a project
 */
export interface AddResourceOptions {
	registered?: boolean;
	hasUnitTest?: boolean;
	hasIntegrationTest?: boolean;
	description?: string;
	uriPattern?: string;
	static?: boolean;
	dynamic?: boolean;
}

/**
 * Add a tool to a project
 */
export async function addToolToProject(
	projectDir: string,
	toolName: string,
	options: AddToolOptions = {},
): Promise<void> {
	const { registered = true, hasUnitTest = false, hasIntegrationTest = false } =
		options;

	// Create tool file
	const toolPath = join(projectDir, "src", "tools", `${toolName}.ts`);
	const toolContent = generateToolContent(
		toolName,
		options.description || `${toolName} tool`,
	);
	await mkdir(join(projectDir, "src", "tools"), { recursive: true });
	await writeFile(toolPath, toolContent, "utf-8");

	// Register in index.ts if requested
	if (registered) {
		await registerToolInIndex(projectDir, toolName);
	}

	// Create unit test if requested
	if (hasUnitTest) {
		const testPath = join(
			projectDir,
			"test",
			"unit",
			"tools",
			`${toolName}.test.ts`,
		);
		const testContent = generateUnitTestContent(toolName);
		await mkdir(join(projectDir, "test", "unit", "tools"), { recursive: true });
		await writeFile(testPath, testContent, "utf-8");
	}

	// Create integration test if requested
	if (hasIntegrationTest) {
		const yamlPath = join(
			projectDir,
			"test",
			"integration",
			"specs",
			`${toolName}.yaml`,
		);
		const yamlContent = generateIntegrationTestYaml(toolName);
		await mkdir(join(projectDir, "test", "integration", "specs"), {
			recursive: true,
		});
		await writeFile(yamlPath, yamlContent, "utf-8");
	}
}

/**
 * Generate tool file content
 */
export function generateToolContent(
	toolName: string,
	description: string,
): string {
	const pascalName = toPascalCase(toolName);

	return `/**
 * ${pascalName} Tool
 * ${description}
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const ${pascalName}ParamsSchema = z.object({
	message: z.string().describe("Message to process"),
});

export function register${pascalName}Tool(server: McpServer): void {
	server.tool(
		"${toolName}",
		"${description}",
		${pascalName}ParamsSchema.shape,
		async (params) => {
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify({ result: "success", params }, null, 2),
					},
				],
			};
		},
	);
}
`;
}

/**
 * Generate unit test content
 */
function generateUnitTestContent(toolName: string): string {
	const pascalName = toPascalCase(toolName);

	return `import { describe, it, expect } from "vitest";
import { register${pascalName}Tool } from "../../../src/tools/${toolName}.js";

describe("${toolName} tool", () => {
	it("should register successfully", () => {
		expect(register${pascalName}Tool).toBeDefined();
	});
});
`;
}

/**
 * Generate integration test YAML content
 */
function generateIntegrationTestYaml(toolName: string): string {
	return `name: "${toolName} test"
description: "Test ${toolName} tool"
tool: "${toolName}"
arguments:
  message: "test"
assertions:
  - type: "success"
  - type: "response_time_ms"
    max: 5000
`;
}

/**
 * Register a tool in src/index.ts
 */
async function registerToolInIndex(
	projectDir: string,
	toolName: string,
): Promise<void> {
	const indexPath = join(projectDir, "src", "index.ts");
	const pascalName = toPascalCase(toolName);

	// Read existing content
	const { readFile } = await import("node:fs/promises");
	let content = await readFile(indexPath, "utf-8");

	// Add import
	const importStatement = `import { register${pascalName}Tool } from "./tools/${toolName}.js";`;

	// Find the last import and add after it
	const lastImportRegex = /import\s+[^;]+;(?=\s*\n\s*(?:\/\*|\/\/|\n|export|class))/g;
	const matches = Array.from(content.matchAll(lastImportRegex));
	if (matches.length > 0) {
		const lastMatch = matches[matches.length - 1];
		const insertPos = lastMatch.index! + lastMatch[0].length;
		content =
			content.slice(0, insertPos) +
			`\n${importStatement}` +
			content.slice(insertPos);
	}

	// Add registration call in init() method
	const registrationCall = `\t\tregister${pascalName}Tool(this.server);`;
	const initMethodRegex = /async\s+init\(\)\s*\{([^}]*)\}/;
	const initMatch = content.match(initMethodRegex);

	if (initMatch) {
		const initBody = initMatch[1];
		const lastRegisterCall = initBody.match(/\s+register\w+Tool\(this\.server\);/g);

		if (lastRegisterCall) {
			const lastCall = lastRegisterCall[lastRegisterCall.length - 1];
			const insertPos =
				initMatch.index! + initMatch[0].lastIndexOf(lastCall) + lastCall.length;
			content =
				content.slice(0, insertPos) +
				`\n${registrationCall}` +
				content.slice(insertPos);
		}
	}

	await writeFile(indexPath, content, "utf-8");
}

/**
 * Add a resource to a project
 */
export async function addResourceToProject(
	projectDir: string,
	resourceName: string,
	options: AddResourceOptions = {},
): Promise<void> {
	const { registered = true, hasUnitTest = false, hasIntegrationTest = false } =
		options;

	// Create resource file
	const resourcePath = join(projectDir, "src", "resources", `${resourceName}.ts`);
	const resourceContent = generateResourceContent(
		resourceName,
		options.description || `${resourceName} resource`,
		options.uriPattern || `config://${resourceName}`,
	);
	await mkdir(join(projectDir, "src", "resources"), { recursive: true });
	await writeFile(resourcePath, resourceContent, "utf-8");

	// Register in index.ts if requested
	if (registered) {
		await registerResourceInIndex(projectDir, resourceName);
	}

	// Create unit test if requested
	if (hasUnitTest) {
		const testPath = join(
			projectDir,
			"test",
			"unit",
			"resources",
			`${resourceName}.test.ts`,
		);
		const testContent = generateResourceUnitTestContent(resourceName);
		await mkdir(join(projectDir, "test", "unit", "resources"), {
			recursive: true,
		});
		await writeFile(testPath, testContent, "utf-8");
	}

	// Create integration test if requested
	if (hasIntegrationTest) {
		const yamlPath = join(
			projectDir,
			"test",
			"integration",
			"specs",
			"resources",
			`${resourceName}.yaml`,
		);
		const yamlContent = generateResourceIntegrationTestYaml(
			resourceName,
			options.uriPattern || `config://${resourceName}`,
		);
		await mkdir(join(projectDir, "test", "integration", "specs", "resources"), {
			recursive: true,
		});
		await writeFile(yamlPath, yamlContent, "utf-8");
	}
}

/**
 * Generate resource file content
 */
export function generateResourceContent(
	resourceName: string,
	description: string,
	uriPattern: string,
): string {
	const pascalName = toPascalCase(resourceName);

	return `/**
 * ${pascalName} Resource
 * ${description}
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function register${pascalName}Resource(server: McpServer): void {
	server.resource(
		"${resourceName}",
		"${uriPattern}",
		{
			description: "${description}",
			mimeType: "application/json",
		},
		async (uri) => {
			return {
				contents: [
					{
						uri: uri.href,
						text: JSON.stringify({ result: "success", resource: "${resourceName}" }, null, 2),
						mimeType: "application/json",
					},
				],
			};
		},
	);
}
`;
}

/**
 * Generate resource unit test content
 */
function generateResourceUnitTestContent(resourceName: string): string {
	const pascalName = toPascalCase(resourceName);

	return `import { describe, it, expect } from "vitest";
import { register${pascalName}Resource } from "../../../src/resources/${resourceName}.js";

describe("${resourceName} resource", () => {
	it("should register successfully", () => {
		expect(register${pascalName}Resource).toBeDefined();
	});
});
`;
}

/**
 * Generate resource integration test YAML content
 */
function generateResourceIntegrationTestYaml(
	resourceName: string,
	uriPattern: string,
): string {
	const sampleUri = uriPattern.replace(/\{[^}]+\}/g, "test-value");

	return `type: "resource"
name: "${resourceName.replace(/-/g, " ")} - Basic"
description: "Test ${resourceName} resource"
uri: "${sampleUri}"
assertions:
  - type: "success"
  - type: "response_time_ms"
    max: 5000
`;
}

/**
 * Register a resource in src/index.ts
 */
async function registerResourceInIndex(
	projectDir: string,
	resourceName: string,
): Promise<void> {
	const indexPath = join(projectDir, "src", "index.ts");
	const pascalName = toPascalCase(resourceName);

	// Read existing content
	const { readFile } = await import("node:fs/promises");
	let content = await readFile(indexPath, "utf-8");

	// Add import
	const importStatement = `import { register${pascalName}Resource } from "./resources/${resourceName}.js";`;

	// Find the last import and add after it
	const lastImportRegex = /import\s+[^;]+;(?=\s*\n\s*(?:\/\*|\/\/|\n|export|class))/g;
	const matches = Array.from(content.matchAll(lastImportRegex));
	if (matches.length > 0) {
		const lastMatch = matches[matches.length - 1];
		const insertPos = lastMatch.index! + lastMatch[0].length;
		content =
			content.slice(0, insertPos) +
			`\n${importStatement}` +
			content.slice(insertPos);
	}

	// Add registration call in init() method
	const registrationCall = `\t\tregister${pascalName}Resource(this.server);`;
	const initMethodRegex = /async\s+init\(\)\s*\{([^}]*)\\}/;
	const initMatch = content.match(initMethodRegex);

	if (initMatch) {
		const initBody = initMatch[1];
		const lastRegisterCall = initBody.match(/\s+register\w+Resource\(this\.server\);/g);

		if (lastRegisterCall) {
			const lastCall = lastRegisterCall[lastRegisterCall.length - 1];
			const insertPos =
				initMatch.index! + initMatch[0].lastIndexOf(lastCall) + lastCall.length;
			content =
				content.slice(0, insertPos) +
				`\n${registrationCall}` +
				content.slice(insertPos);
		}
	}

	await writeFile(indexPath, content, "utf-8");
}

/**
 * Convert kebab-case to PascalCase
 */
function toPascalCase(str: string): string {
	return str
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join("");
}

/**
 * Create a project with invalid wrangler.jsonc
 */
export async function createProjectWithInvalidWrangler(
	issues: {
		missingFile?: boolean;
		missingName?: boolean;
		missingMain?: boolean;
		missingCompatibilityDate?: boolean;
		missingDurableObjects?: boolean;
		missingMcpBinding?: boolean;
		missingMigrations?: boolean;
		invalidClass?: boolean;
	} = {},
): Promise<string> {
	const projectDir = await createTestProject({
		hasWranglerConfig: !issues.missingFile,
	});

	if (issues.missingFile) {
		return projectDir;
	}

	// Create a custom wrangler.jsonc with specific issues
	const config: any = {
		name: issues.missingName ? undefined : "test-server",
		main: issues.missingMain ? undefined : "src/index.ts",
		compatibility_date: issues.missingCompatibilityDate
			? undefined
			: "2024-01-01",
	};

	if (!issues.missingDurableObjects) {
		config.durable_objects = {
			bindings: issues.missingMcpBinding
				? []
				: [
						{
							name: "MCP_OBJECT",
							class_name: issues.invalidClass ? "NonExistentClass" : "MCPServerAgent",
						},
					],
		};
	}

	if (!issues.missingMigrations) {
		config.migrations = [
			{
				tag: "v1",
				new_sqlite_classes: ["MCPServerAgent"],
			},
		];
	}

	const wranglerPath = join(projectDir, "wrangler.jsonc");
	await writeFile(wranglerPath, JSON.stringify(config, null, 2), "utf-8");

	return projectDir;
}

/**
 * Create an integration test YAML with specific issues
 */
export async function createIntegrationTestYaml(
	projectDir: string,
	toolName: string,
	issues: {
		missingName?: boolean;
		missingTool?: boolean;
		missingAssertions?: boolean;
		toolNameMismatch?: string;
		invalidYaml?: boolean;
	} = {},
): Promise<string> {
	const yamlPath = join(
		projectDir,
		"test",
		"integration",
		"specs",
		`${toolName}.yaml`,
	);

	await mkdir(join(projectDir, "test", "integration", "specs"), {
		recursive: true,
	});

	if (issues.invalidYaml) {
		// Write invalid YAML
		await writeFile(yamlPath, "invalid: yaml: content: [unclosed", "utf-8");
		return yamlPath;
	}

	const yamlContent = `${issues.missingName ? "" : `name: "${toolName} test"\n`}${issues.missingTool ? "" : `tool: "${issues.toolNameMismatch || toolName}"\n`}description: "Test description"
arguments:
  message: "test"
${issues.missingAssertions ? "" : `assertions:
  - type: "success"
`}`;

	await writeFile(yamlPath, yamlContent, "utf-8");
	return yamlPath;
}

/**
 * Options for adding a prompt to a project
 */
export interface AddPromptOptions {
	registered?: boolean;
	hasUnitTest?: boolean;
	hasIntegrationTest?: boolean;
	description?: string;
}

/**
 * Add a prompt to a project
 */
export async function addPromptToProject(
	projectDir: string,
	promptName: string,
	options: AddPromptOptions = {},
): Promise<void> {
	const { registered = true, hasUnitTest = false, hasIntegrationTest = false } =
		options;

	// Create prompt file
	const promptPath = join(projectDir, "src", "prompts", `${promptName}.ts`);
	const promptContent = generatePromptContent(
		promptName,
		options.description || `${promptName} prompt`,
	);
	await mkdir(join(projectDir, "src", "prompts"), { recursive: true });
	await writeFile(promptPath, promptContent, "utf-8");

	// Register in index.ts if requested
	if (registered) {
		await registerPromptInIndex(projectDir, promptName);
	}

	// Create unit test if requested
	if (hasUnitTest) {
		const testPath = join(
			projectDir,
			"test",
			"unit",
			"prompts",
			`${promptName}.test.ts`,
		);
		const testContent = generatePromptUnitTestContent(promptName);
		await mkdir(join(projectDir, "test", "unit", "prompts"), {
			recursive: true,
		});
		await writeFile(testPath, testContent, "utf-8");
	}

	// Create integration test if requested
	if (hasIntegrationTest) {
		const yamlPath = join(
			projectDir,
			"test",
			"integration",
			"specs",
			"prompts",
			`${promptName}.yaml`,
		);
		const yamlContent = generatePromptIntegrationTestYaml(promptName);
		await mkdir(join(projectDir, "test", "integration", "specs", "prompts"), {
			recursive: true,
		});
		await writeFile(yamlPath, yamlContent, "utf-8");
	}
}

/**
 * Generate prompt file content
 */
export function generatePromptContent(
	promptName: string,
	description: string,
): string {
	const pascalName = toPascalCase(promptName);

	return `/**
 * ${pascalName} Prompt
 * ${description}
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const ${pascalName}ArgsSchema = z.object({
	// Add your string arguments here
});

export function register${pascalName}Prompt(server: McpServer): void {
	server.prompt(
		"${promptName}",
		"${description}",
		${pascalName}ArgsSchema.shape,
		async (args) => {
			return {
				messages: [
					{
						role: "user" as const,
						content: {
							type: "text" as const,
							text: JSON.stringify({ result: "success", prompt: "${promptName}" }, null, 2),
						},
					},
				],
			};
		},
	);
}
`;
}

/**
 * Generate prompt unit test content
 */
function generatePromptUnitTestContent(promptName: string): string {
	const pascalName = toPascalCase(promptName);

	return `import { describe, it, expect } from "vitest";
import { register${pascalName}Prompt } from "../../../src/prompts/${promptName}.js";

describe("${promptName} prompt", () => {
	it("should register successfully", () => {
		expect(register${pascalName}Prompt).toBeDefined();
	});
});
`;
}

/**
 * Generate prompt integration test YAML content
 */
function generatePromptIntegrationTestYaml(promptName: string): string {
	return `type: "prompt"
name: "${promptName.replace(/-/g, " ")} - Basic"
description: "Test ${promptName} prompt"
prompt: "${promptName}"
assertions:
  - type: "success"
  - type: "response_time_ms"
    max: 5000
`;
}

/**
 * Register a prompt in src/index.ts
 */
async function registerPromptInIndex(
	projectDir: string,
	promptName: string,
): Promise<void> {
	const indexPath = join(projectDir, "src", "index.ts");
	const pascalName = toPascalCase(promptName);

	// Read existing content
	const { readFile } = await import("node:fs/promises");
	let content = await readFile(indexPath, "utf-8");

	// Add import
	const importStatement = `import { register${pascalName}Prompt } from "./prompts/${promptName}.js";`;

	// Find the last import and add after it
	const lastImportRegex = /import\s+[^;]+;(?=\s*\n\s*(?:\/\*|\/\/|\n|export|class))/g;
	const matches = Array.from(content.matchAll(lastImportRegex));
	if (matches.length > 0) {
		const lastMatch = matches[matches.length - 1];
		const insertPos = lastMatch.index! + lastMatch[0].length;
		content =
			content.slice(0, insertPos) +
			`\n${importStatement}` +
			content.slice(insertPos);
	}

	// Add registration call in init() method
	const registrationCall = `\t\tregister${pascalName}Prompt(this.server);`;
	const initMethodRegex = /async\s+init\(\)\s*\{([^}]*)\}/;
	const initMatch = content.match(initMethodRegex);

	if (initMatch) {
		const initBody = initMatch[1];
		const lastRegisterCall = initBody.match(/\s+register\w+Prompt\(this\.server\);/g);

		if (lastRegisterCall) {
			const lastCall = lastRegisterCall[lastRegisterCall.length - 1];
			const insertPos =
				initMatch.index! + initMatch[0].lastIndexOf(lastCall) + lastCall.length;
			content =
				content.slice(0, insertPos) +
				`\n${registrationCall}` +
				content.slice(insertPos);
		}
	}

	await writeFile(indexPath, content, "utf-8");
}
