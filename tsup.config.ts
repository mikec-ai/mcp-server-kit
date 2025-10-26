import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		// Main entry point
		index: "src/index.ts",
		// Harness entry point (for independent usage)
		"harness/index": "src/harness/index.ts",
		// Commands entry point
		"core/commands/index": "src/core/commands/index.ts",
		// Scaffolding API entry point
		"core/commands/shared/index": "src/core/commands/shared/index.ts",
		// Validation API entry point
		"core/commands/validate": "src/core/commands/validate.ts",
		// CLI entry point
		cli: "src/core/cli/index.ts",
	},
	format: ["esm"],
	dts: false, // TODO: Fix TypeScript type issues in harness
	sourcemap: true,
	clean: true,
	splitting: false,
	treeshake: true,
	outDir: "dist",
	target: "es2022",
	platform: "node",
	// Preserve directory structure for clean imports
	outExtension: () => ({ js: ".js" }),
});
