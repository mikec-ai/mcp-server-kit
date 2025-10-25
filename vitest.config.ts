import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
	resolve: {
		alias: {
			"@": resolve(__dirname, "./src"),
		},
	},
	test: {
		globals: true,
		environment: "node",
		include: ["test/**/*.test.ts"],
		exclude: ["node_modules", "dist", "templates/**/*"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			include: ["src/**/*.ts"],
			exclude: ["src/**/*.test.ts", "src/**/index.ts", "src/core/cli/**", "test/**/*"],
		},
	},
});
