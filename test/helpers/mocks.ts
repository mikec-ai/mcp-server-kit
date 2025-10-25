/**
 * Shared Test Mocks
 *
 * Reusable mock implementations for testing
 */

import type {
	IMCPTestClient,
	MCPToolResponse,
	MCPPrompt,
	MCPPromptResponse,
	MCPResource,
	MCPResourceContent,
} from "../../src/harness/types/client.js";

/**
 * Create a mock MCP test client
 */
export function createMockMCPClient(
	overrides?: Partial<IMCPTestClient>,
): IMCPTestClient {
	return {
		connect: async () => {},
		disconnect: async () => {},
		callTool: async (name: string, args?: unknown) => {
			// Default successful response
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify({ success: true, tool: name, args }, null, 2),
					},
				],
			};
		},
		listTools: async () => [],
		getServerInfo: async () => ({
			name: "Mock MCP Server",
			version: "1.0.0",
			protocolVersion: "2024-11-05",
		}),
		listPrompts: async () => [],
		getPrompt: async (name: string, args?: Record<string, unknown>) => {
			// Default successful prompt response
			return {
				messages: [
					{
						role: "user" as const,
						content: {
							type: "text" as const,
							text: `Mock prompt: ${name}`,
						},
					},
				],
			};
		},
		listResources: async () => [],
		readResource: async (uri: string) => {
			// Default successful resource response
			return {
				uri,
				text: JSON.stringify({ success: true, uri }, null, 2),
				mimeType: "application/json",
			};
		},
		...overrides,
	};
}

/**
 * Create a mock fs module for file system operations
 */
export function createMockFs() {
	const files = new Map<string, string>();
	const directories = new Set<string>();

	return {
		// File contents storage
		files,
		directories,

		// Mock implementations
		readFile: async (path: string, encoding?: string) => {
			if (!files.has(path)) {
				throw new Error(`ENOENT: no such file or directory, open '${path}'`);
			}
			return files.get(path) as string;
		},

		writeFile: async (path: string, content: string) => {
			files.set(path, content);
		},

		readdir: async (path: string) => {
			const pathPrefix = path.endsWith("/") ? path : `${path}/`;
			const filesInDir: string[] = [];

			for (const filePath of files.keys()) {
				if (filePath.startsWith(pathPrefix)) {
					const relativePath = filePath.substring(pathPrefix.length);
					const fileName = relativePath.split("/")[0];
					if (fileName && !filesInDir.includes(fileName)) {
						filesInDir.push(fileName);
					}
				}
			}

			for (const dirPath of directories) {
				if (dirPath.startsWith(pathPrefix)) {
					const relativePath = dirPath.substring(pathPrefix.length);
					const dirName = relativePath.split("/")[0];
					if (dirName && !filesInDir.includes(dirName)) {
						filesInDir.push(dirName);
					}
				}
			}

			return filesInDir;
		},

		mkdir: async (path: string, options?: { recursive?: boolean }) => {
			directories.add(path);
		},

		access: async (path: string) => {
			if (!files.has(path) && !directories.has(path)) {
				throw new Error(`ENOENT: no such file or directory, access '${path}'`);
			}
		},

		// Helper methods for tests
		reset: () => {
			files.clear();
			directories.clear();
		},

		setFile: (path: string, content: string) => {
			files.set(path, content);
		},

		setDirectory: (path: string) => {
			directories.add(path);
		},

		hasFile: (path: string) => files.has(path),

		hasDirectory: (path: string) => directories.has(path),

		getFile: (path: string) => files.get(path),
	};
}

/**
 * Mock template registry for testing new-server command
 */
export function createMockTemplateRegistry(overrides?: {
	templates?: Array<{ id: string; name: string; description: string }>;
	templateExists?: (id: string) => Promise<boolean>;
}) {
	const defaultTemplates = [
		{
			id: "cloudflare-remote",
			name: "Cloudflare Remote MCP",
			description: "MCP server with Cloudflare Workers",
		},
	];

	return {
		listTemplates: async () => overrides?.templates || defaultTemplates,
		templateExists: overrides?.templateExists || (async (id: string) => id === "cloudflare-remote"),
		getTemplate: async (id: string) => {
			const templates = overrides?.templates || defaultTemplates;
			return templates.find((t) => t.id === id);
		},
	};
}

/**
 * Mock template processor for testing new-server command
 */
export function createMockTemplateProcessor(overrides?: {
	scaffold?: (options: any) => Promise<{ success: boolean; errors?: string[] }>;
}) {
	return {
		scaffold: overrides?.scaffold || (async (options: any) => {
			return { success: true };
		}),
	};
}

/**
 * Create a successful tool response
 */
export function createSuccessResponse(data: unknown): MCPToolResponse {
	return {
		content: [
			{
				type: "text",
				text: JSON.stringify(data, null, 2),
			},
		],
	};
}

/**
 * Create an error tool response
 */
export function createErrorResponse(message: string): MCPToolResponse {
	return {
		content: [
			{
				type: "text",
				text: JSON.stringify({ error: true, message }, null, 2),
			},
		],
		isError: true,
	};
}
