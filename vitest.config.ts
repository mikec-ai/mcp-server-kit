import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
	resolve: {
		alias: {
			"@": resolve(__dirname, "./src"),
		},
		extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
	},
	esbuild: {
		// Handle .ts imports in source files
		target: "es2022",
	},
	test: {
		globals: true,
		environment: "node",
		include: ["test/**/*.test.ts"],
		exclude: ["node_modules", "dist", "templates/**/*", "**/*.e2e.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			include: ["src/**/*.ts"],
			exclude: ["src/**/*.test.ts", "src/**/index.ts", "src/core/cli/**", "test/**/*"],
		},
	},
});
