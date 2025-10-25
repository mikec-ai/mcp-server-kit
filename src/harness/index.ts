/**
 * MCP Test Harness - Portable, framework-agnostic testing for MCP servers
 *
 * This module provides a complete testing framework for Model Context Protocol servers.
 * It uses dependency injection (IMCPTestClient interface) to remain portable across
 * different MCP implementations (Cloudflare Workers, Vercel Edge, Node.js stdio, etc.)
 *
 * @example
 * ```typescript
 * import { TestRunner, loadTestSpec } from 'mcp-server-kit/harness';
 *
 * const client = new MyMCPClient();
 * const runner = new TestRunner(client);
 * await runner.connect();
 *
 * const spec = await loadTestSpec('test.yaml');
 * const result = await runner.runTest(spec);
 *
 * console.log(result.passed ? 'PASS' : 'FAIL');
 * await runner.disconnect();
 * ```
 */

// Core Types
export type {
	IMCPTestClient,
	MCPToolResponse,
	MCPTool,
	MCPServerInfo,
} from "./types/client.js";

export type {
	TestSpec,
	Assertion,
	SuccessAssertion,
	ErrorAssertion,
	ContainsTextAssertion,
	NotContainsTextAssertion,
	ResponseTimeAssertion,
	JsonPathAssertion,
	RegexMatchAssertion,
} from "./types/spec.js";

export type {
	TestResult,
	TestRunResults,
	TestSummary,
	AssertionResult,
} from "./types/results.js";

export type { TestHarnessConfig } from "./types/config.js";

// Test Execution
export { TestRunner } from "./runner.js";

// Spec Loading
export {
	loadTestSpec,
	loadTestSuiteSpec,
	parseTestSpec,
	serializeTestSpecToYAML,
	serializeTestSpecToJSON,
} from "./spec-loader.js";

// Validation
export {
	TestSpecSchema,
	TestSuiteSpecSchema,
	AssertionSchema,
} from "./validation/schemas.js";

// Reporters (for custom output formatting)
export { formatAsJSON, printJSON, formatSimpleSummary } from "./reporters/json.js";
export { printConsole, printSimple } from "./reporters/console.js";

// Assertion Runner (for advanced usage)
export { runAssertions } from "./assertions/index.js";
