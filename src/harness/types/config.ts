/**
 * Test Harness Configuration
 *
 * This configuration is injected by the project to customize the test harness.
 *
 * Design: Fully portable, projects provide their own config
 */

import type { IMCPTestClient } from "./client.ts";

/**
 * Test harness configuration
 *
 * Projects create this configuration object to integrate with the harness.
 */
export interface TestHarnessConfig {
	/** MCP server URL (used by client factory) */
	serverUrl: string;

	/** Default test timeout in milliseconds */
	timeout?: number;

	/** Number of retries for failed tests */
	retries?: number;

	/** Directory for snapshot storage */
	snapshotDir?: string;

	/** Directory for contract (JSON Schema) storage */
	contractDir?: string;

	/** Factory function that creates an IMCPTestClient instance */
	clientFactory: (serverUrl: string) => IMCPTestClient;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Partial<TestHarnessConfig> = {
	timeout: 5000,
	retries: 0,
	snapshotDir: "./test/integration/snapshots",
	contractDir: "./test/integration/contracts",
};

/**
 * Merge user config with defaults
 */
export function mergeConfig(userConfig: TestHarnessConfig): TestHarnessConfig {
	return {
		...DEFAULT_CONFIG,
		...userConfig,
	};
}
