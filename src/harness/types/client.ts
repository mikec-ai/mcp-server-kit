/**
 * Generic MCP Test Client Interface
 *
 * This interface abstracts MCP client operations for testing.
 * Projects implement this interface with their own MCP client.
 *
 * Design: Fully portable, no project-specific dependencies
 */

/**
 * Standard MCP tool response format
 */
export interface MCPToolResponse {
	/** Response content array */
	content: Array<{
		type: string;
		text: string;
	}>;
	/** Whether the response indicates an error */
	isError?: boolean;
}

/**
 * MCP tool metadata
 */
export interface MCPTool {
	/** Tool name */
	name: string;
	/** Tool description */
	description: string;
	/** Input schema (JSON Schema) */
	inputSchema: Record<string, any>;
}

/**
 * MCP server information
 */
export interface MCPServerInfo {
	/** Server name */
	name: string;
	/** Server version */
	version: string;
	/** Protocol version */
	protocolVersion: string;
	/** Server capabilities */
	capabilities?: Record<string, any>;
}

/**
 * MCP Prompt metadata
 */
export interface MCPPrompt {
	/** Prompt name */
	name: string;
	/** Prompt description */
	description: string;
	/** Optional arguments schema (JSON Schema) */
	argsSchema?: Record<string, any>;
}

/**
 * MCP Prompt response
 */
export interface MCPPromptResponse {
	/** Array of messages in the prompt */
	messages: Array<{
		/** Message role */
		role: "user" | "assistant";
		/** Message content */
		content: {
			/** Content type */
			type: "text" | "image" | "resource";
			/** Text content */
			text?: string;
			/** Base64-encoded data */
			data?: string;
			/** MIME type */
			mimeType?: string;
		};
	}>;
}

/**
 * MCP Resource metadata
 */
export interface MCPResource {
	/** Resource URI */
	uri: string;
	/** Resource name */
	name: string;
	/** Resource description */
	description?: string;
	/** MIME type */
	mimeType?: string;
}

/**
 * MCP Resource content (single content item)
 */
export interface MCPResourceContentItem {
	/** Resource URI */
	uri: string;
	/** Text content */
	text?: string;
	/** Base64-encoded blob */
	blob?: string;
	/** MIME type */
	mimeType?: string;
}

/**
 * MCP Resource content response (matches MCP protocol)
 */
export interface MCPResourceContent {
	/** Array of content items */
	contents: MCPResourceContentItem[];
}

/**
 * Generic MCP Test Client Interface
 *
 * Projects must implement this interface to integrate with the test harness.
 * See adapters/README.md for implementation guide.
 */
export interface IMCPTestClient {
	/**
	 * Connect to the MCP server and initialize session
	 */
	connect(): Promise<void>;

	/**
	 * Disconnect from the MCP server
	 */
	disconnect(): Promise<void>;

	/**
	 * Call an MCP tool with arguments
	 *
	 * @param name - Tool name
	 * @param args - Tool arguments
	 * @returns Tool response
	 */
	callTool(name: string, args: Record<string, any>): Promise<MCPToolResponse>;

	/**
	 * List all available tools from the server
	 *
	 * @returns Array of tool metadata
	 */
	listTools(): Promise<MCPTool[]>;

	/**
	 * Get server information
	 *
	 * @returns Server metadata
	 */
	getServerInfo(): Promise<MCPServerInfo>;

	/**
	 * List all available prompts from the server
	 *
	 * @returns Array of prompt metadata
	 */
	listPrompts(): Promise<MCPPrompt[]>;

	/**
	 * Get a prompt with optional arguments
	 *
	 * @param name - Prompt name
	 * @param args - Optional prompt arguments
	 * @returns Prompt response with messages
	 */
	getPrompt(name: string, args?: Record<string, unknown>): Promise<MCPPromptResponse>;

	/**
	 * List all available resources from the server
	 *
	 * @returns Array of resource metadata
	 */
	listResources(): Promise<MCPResource[]>;

	/**
	 * Read a resource by URI
	 *
	 * @param uri - Resource URI
	 * @returns Resource content
	 */
	readResource(uri: string): Promise<MCPResourceContent>;
}
