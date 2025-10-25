#!/usr/bin/env node

/**
 * MCP Server Kit CLI Entry Point
 *
 * This file serves as the executable entry point for the mcp-server-kit CLI.
 * It imports and runs the CLI implementation from the compiled distribution.
 */

import("../dist/cli.js")
	.then((cli) => {
		cli.run();
	})
	.catch((error) => {
		console.error("Failed to load CLI:", error);
		process.exit(1);
	});
