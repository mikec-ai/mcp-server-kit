/**
 * MCP Server Kit - Main Package Entry Point
 *
 * Extensible scaffolding tool and test harness for Model Context Protocol servers.
 */

// Re-export harness for independent usage
export * from "./harness/index.js";

// Re-export template system
export * from "./core/template-system/index.js";

// Package metadata
export const VERSION = "1.0.0";
export const NAME = "mcp-server-kit";
