/**
 * Vitest Configuration for Harness Unit Tests
 *
 * Separate config from main project - no Cloudflare Workers pool needed.
 * Tests run in standard Node.js environment.
 */

import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["**/*.test.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			include: ["src/harness/**/*.ts"],
			exclude: ["src/harness/types/**", "src/harness/index.ts", "**/*.d.ts"],
		},
	},
});
