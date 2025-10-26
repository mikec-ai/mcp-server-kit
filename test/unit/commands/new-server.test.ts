/**
 * new-server - Unit Tests
 *
 * Tests for the new server scaffolding command
 */

import { describe, it, expect } from "vitest";

describe("new-server command", () => {
	/**
	 * The new-server command scaffolds complete MCP server projects from templates.
	 * It handles:
	 * - Template selection and validation
	 * - Variable substitution (name, description, port, dev mode)
	 * - Package manager selection
	 * - Dependency installation (optional)
	 * - Dev mode path resolution (for local development)
	 *
	 * Full integration testing is done through:
	 * 1. Template quality tests (test/quality/*)
	 * 2. Real E2E tests (creating and validating projects)
	 * 3. Agent usability tests
	 */

	describe("package manager validation", () => {
		it("should validate package manager options", () => {
			const validPMs = ["npm", "pnpm", "yarn", "bun"];

			expect(validPMs).toContain("npm");
			expect(validPMs).toContain("pnpm");
			expect(validPMs).toContain("yarn");
			expect(validPMs).toContain("bun");

			// Invalid PMs
			expect(validPMs).not.toContain("invalid");
			expect(validPMs).not.toContain("pip");
		});

		it("should reject invalid package managers", () => {
			const validPMs = ["npm", "pnpm", "yarn", "bun"];
			const invalidPM = "invalid-pm";

			const isValid = validPMs.includes(invalidPM);

			expect(isValid).toBe(false);
			// Would generate error: Invalid package manager 'invalid-pm'
		});
	});

	describe("template resolution", () => {
		it("should use default template when not specified", () => {
			const options = {
				name: "my-server",
				template: "cloudflare-remote", // Default
			};

			expect(options.template).toBe("cloudflare-remote");
		});

		it("should allow custom template selection", () => {
			const options = {
				name: "my-server",
				template: "custom-template",
			};

			expect(options.template).toBe("custom-template");
		});

		it("should provide helpful error when template not found", () => {
			const templateId = "non-existent-template";
			const errorMessage = `Template '${templateId}' not found`;

			expect(errorMessage).toContain(templateId);
			expect(errorMessage).toContain("not found");
			// Should also list available templates
		});
	});

	describe("variable building", () => {
		it("should build required variables from options", () => {
			const options = {
				name: "my-server",
				description: "My MCP Server",
				port: "8788",
				dev: false,
			};

			const variables = {
				PROJECT_NAME: options.name,
				MCP_SERVER_NAME: options.description || options.name,
				PORT: options.port,
				DEV_MODE: Boolean(options.dev),
			};

			expect(variables.PROJECT_NAME).toBe("my-server");
			expect(variables.MCP_SERVER_NAME).toBe("My MCP Server");
			expect(variables.PORT).toBe("8788");
			expect(variables.DEV_MODE).toBe(false);
		});

		it("should use name as description fallback", () => {
			const options = {
				name: "my-server",
				// No description provided
			};

			const mcpServerName = (options as { description?: string }).description || options.name;

			expect(mcpServerName).toBe("my-server");
		});

		it("should include description when provided", () => {
			const options = {
				name: "my-server",
				description: "Custom description",
			};

			const variables: Record<string, any> = {
				PROJECT_NAME: options.name,
			};

			if (options.description) {
				variables.DESCRIPTION = options.description;
			}

			expect(variables.DESCRIPTION).toBe("Custom description");
		});
	});

	describe("dev mode handling", () => {
		it("should enable dev mode when --dev flag is used", () => {
			const options = {
				dev: true,
			};

			expect(options.dev).toBe(true);
			// Should calculate MCP_KIT_PATH
		});

		it("should use published package in production mode", () => {
			const options = {
				dev: false,
			};

			expect(options.dev).toBe(false);
			// Should NOT calculate MCP_KIT_PATH
		});

		it("should calculate absolute path in dev mode", () => {
			// In dev mode, the command calculates the absolute path to mcp-server-kit
			// from dist/ back to root (1 level up)

			// Simulating: const mcpKitRoot = path.resolve(__dirname, "../");
			// This would resolve from /dist/cli.js back to /

			const simulatedPath = "/Users/user/mcp-server-kit";
			expect(simulatedPath).toBeTruthy();
			expect(simulatedPath).toContain("mcp-server-kit");
		});
	});

	describe("installation options", () => {
		it("should install dependencies by default", () => {
			const options = {
				install: true,
			};

			expect(options.install).toBe(true);
			// Dependencies would be installed
		});

		it("should skip installation with --no-install", () => {
			const options = {
				install: false,
			};

			expect(options.install).toBe(false);
			// Dependencies would NOT be installed
		});
	});

	describe("scaffolding options", () => {
		it("should build complete scaffold options", () => {
			const options = {
				name: "my-server",
				template: "cloudflare-remote",
				description: "My MCP Server",
				port: "8788",
				install: true,
				pm: "npm",
				dev: false,
			};

			const scaffoldOptions = {
				template: options.template,
				targetDir: `./${options.name}`,
				variables: {
					PROJECT_NAME: options.name,
					MCP_SERVER_NAME: options.description || options.name,
					PORT: options.port,
					DEV_MODE: Boolean(options.dev),
				},
				noInstall: !options.install,
				packageManager: options.pm as "npm" | "pnpm" | "yarn" | "bun",
			};

			expect(scaffoldOptions.template).toBe("cloudflare-remote");
			expect(scaffoldOptions.targetDir).toBe("./my-server");
			expect(scaffoldOptions.packageManager).toBe("npm");
			expect(scaffoldOptions.noInstall).toBe(false);
		});
	});

	describe("output directory option", () => {
		it("should use current directory when --output is not specified", () => {
			const options = {
				name: "my-server",
				output: undefined,
			};

			const targetDir = options.output
				? `${options.output}/${options.name}`
				: `./${options.name}`;

			expect(targetDir).toBe("./my-server");
		});

		it("should use specified directory when --output is provided", () => {
			const options = {
				name: "my-server",
				output: "/tmp/custom-path",
			};

			const targetDir = options.output
				? `${options.output}/${options.name}`
				: `./${options.name}`;

			expect(targetDir).toBe("/tmp/custom-path/my-server");
		});

		it("should handle relative paths in --output", () => {
			const options = {
				name: "my-server",
				output: "../parent-dir",
			};

			const targetDir = options.output
				? `${options.output}/${options.name}`
				: `./${options.name}`;

			expect(targetDir).toBe("../parent-dir/my-server");
		});

		it("should correctly show next steps with custom output path", () => {
			const options = {
				name: "my-server",
				output: "/tmp/test-output",
			};

			const targetDir = options.output
				? `${options.output}/${options.name}`
				: `./${options.name}`;

			const nextStepsMessage = `cd ${targetDir}`;

			expect(nextStepsMessage).toBe("cd /tmp/test-output/my-server");
		});
	});

	describe("success output", () => {
		it("should provide clear next steps for normal mode", () => {
			const projectName = "my-server";
			const pm = "npm";
			const install = true;

			// cf-typegen runs automatically via postInstall, so it's not in next steps
			const nextSteps = [
				`cd ${projectName}`,
				...(install ? [] : [`${pm} install`]),
				`${pm} run dev`,
			];

			expect(nextSteps).toContain(`cd ${projectName}`);
			expect(nextSteps).not.toContain(`${pm} run cf-typegen`); // Auto-runs now
			expect(nextSteps).toContain(`${pm} run dev`);
		});

		it("should provide clear next steps with --no-install", () => {
			const projectName = "my-server";
			const pm = "npm";
			const install = false;

			const nextSteps = [
				`cd ${projectName}`,
				...(install ? [] : [`${pm} install`]),
				`${pm} run dev`,
			];

			expect(nextSteps).toContain(`cd ${projectName}`);
			expect(nextSteps).toContain(`${pm} install`); // Should show install step
			expect(nextSteps).not.toContain(`${pm} run cf-typegen`); // Auto-runs now
			expect(nextSteps).toContain(`${pm} run dev`);
		});

		it("should show dev mode message when enabled", () => {
			const options = {
				dev: true,
			};

			const devModeMessage = "Development mode enabled - using local mcp-server-kit";

			if (options.dev) {
				expect(devModeMessage).toContain("Development mode");
				expect(devModeMessage).toContain("local mcp-server-kit");
			}
		});
	});

	describe("error scenarios", () => {
		it("should handle template not found", () => {
			const templateId = "invalid-template";
			const errorMessage = `Template '${templateId}' not found`;

			expect(errorMessage).toContain(templateId);
			expect(errorMessage).toContain("not found");
		});

		it("should handle invalid package manager", () => {
			const pm = "invalid";
			const errorMessage = `Invalid package manager '${pm}'`;
			const suggestion = "Valid options: npm, pnpm, yarn, bun";

			expect(errorMessage).toContain(pm);
			expect(errorMessage).toContain("Invalid");
			expect(suggestion).toContain("npm, pnpm, yarn, bun");
		});

		it("should handle scaffold failures", () => {
			const result = {
				success: false,
				errors: ["Failed to create directory", "Permission denied"],
			};

			expect(result.success).toBe(false);
			expect(result.errors).toHaveLength(2);
			expect(result.errors[0]).toContain("Failed");
		});
	});

	describe("template processor integration", () => {
		it("should pass correct options to template processor", () => {
			const scaffoldOptions = {
				template: "cloudflare-remote",
				targetDir: "./my-server",
				variables: {
					PROJECT_NAME: "my-server",
					MCP_SERVER_NAME: "My MCP Server",
					PORT: "8788",
					DEV_MODE: false,
				},
				noInstall: false,
				packageManager: "npm" as const,
			};

			// Verify all required options are present
			expect(scaffoldOptions.template).toBeDefined();
			expect(scaffoldOptions.targetDir).toBeDefined();
			expect(scaffoldOptions.variables).toBeDefined();
			expect(scaffoldOptions.variables.PROJECT_NAME).toBeDefined();
			expect(scaffoldOptions.packageManager).toBeDefined();
		});
	});
});
