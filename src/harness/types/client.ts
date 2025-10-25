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
}
