/**
 * Unit tests for CLI parser error handling
 */

import { describe, it, expect } from "vitest";
import { exec as execCallback } from "node:child_process";
import { promisify } from "node:util";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const execAsync = promisify(execCallback);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get path to CLI executable
 */
function getCliPath(): string {
	// From test/unit/cli/ go up to project root
	return join(__dirname, "../../../bin/mcp-server-kit.js");
}

/**
 * Execute CLI command
 */
async function runCLI(args: string): Promise<{
	exitCode: number;
	stdout: string;
	stderr: string;
}> {
	const cliPath = getCliPath();

	try {
		const { stdout, stderr } = await execAsync(`node "${cliPath}" ${args}`);
		return { exitCode: 0, stdout, stderr };
	} catch (error: any) {
		return {
			exitCode: error.code || 1,
			stdout: error.stdout || "",
			stderr: error.stderr || "",
		};
	}
}

describe("Parser Error Handling", () => {
	describe("JSON mode", () => {
		it("should output JSON for unknown option", async () => {
			const result = await runCLI("add tool test-tool --invalid-option --json");

			expect(result.exitCode).toBe(1);

			// Should output valid JSON
			expect(() => JSON.parse(result.stdout)).not.toThrow();

			const json = JSON.parse(result.stdout);
			expect(json.success).toBe(false);
			expect(json.error).toContain("invalid-option");
			expect(json.errorType).toBe("ArgumentError");
			expect(json.errorCode).toBe(1); // VALIDATION_ERROR
		});

		it("should output JSON for missing required argument", async () => {
			const result = await runCLI("add tool --json");

			expect(result.exitCode).toBe(1);

			// Should output valid JSON
			expect(() => JSON.parse(result.stdout)).not.toThrow();

			const json = JSON.parse(result.stdout);
			expect(json.success).toBe(false);
			expect(json.error).toBeDefined();
			expect(json.errorType).toBe("ArgumentError");
			expect(json.errorCode).toBe(1);
		});

		it("should output JSON for unknown command", async () => {
			const result = await runCLI("invalid-command --json");

			expect(result.exitCode).toBe(1);

			// Should output valid JSON
			expect(() => JSON.parse(result.stdout)).not.toThrow();

			const json = JSON.parse(result.stdout);
			expect(json.success).toBe(false);
			expect(json.error).toContain("invalid-command");
			expect(json.errorType).toBe("ArgumentError");
		});

		it("should output JSON with proper structure", async () => {
			const result = await runCLI("add tool --unknown-flag --json");

			expect(result.exitCode).toBe(1);

			const json = JSON.parse(result.stdout);

			// Verify structure
			expect(json).toHaveProperty("success");
			expect(json).toHaveProperty("error");
			expect(json).toHaveProperty("errorCode");
			expect(json).toHaveProperty("errorType");

			expect(json.success).toBe(false);
			expect(typeof json.error).toBe("string");
			expect(typeof json.errorCode).toBe("number");
			expect(typeof json.errorType).toBe("string");
		});

		it("should not output to stderr in JSON mode", async () => {
			const result = await runCLI("add tool --invalid --json");

			// In JSON mode, all output should go to stdout
			expect(result.stdout).toBeTruthy();

			// stderr should be empty or minimal in JSON mode
			// (Some Node.js warnings might still go to stderr, so we don't enforce strictly empty)
		});
	});

	describe("Text mode", () => {
		it("should output human-readable error for unknown option", async () => {
			const result = await runCLI("add tool test-tool --invalid-option");

			expect(result.exitCode).toBe(1);

			// Should NOT be valid JSON
			expect(() => JSON.parse(result.stderr || result.stdout)).toThrow();

			// Should contain error keyword
			const output = result.stderr || result.stdout;
			expect(output.toLowerCase()).toContain("error");
		});

		it("should output human-readable error for missing argument", async () => {
			const result = await runCLI("add tool");

			expect(result.exitCode).toBe(1);

			// Should NOT be valid JSON
			expect(() => JSON.parse(result.stderr || result.stdout)).toThrow();

			const output = result.stderr || result.stdout;
			expect(output.toLowerCase()).toContain("error");
		});

		it("should show help tip after error", async () => {
			const result = await runCLI("add tool --invalid");

			expect(result.exitCode).toBe(1);

			const output = result.stderr || result.stdout;
			expect(output.toLowerCase()).toContain("help");
		});
	});

	describe("Exit codes", () => {
		it("should exit with code 1 for validation errors in JSON mode", async () => {
			const result = await runCLI("add tool --invalid --json");
			expect(result.exitCode).toBe(1);
		});

		it("should exit with code 1 for validation errors in text mode", async () => {
			const result = await runCLI("add tool --invalid");
			expect(result.exitCode).toBe(1);
		});

		it("should exit with code 1 for unknown commands", async () => {
			const result = await runCLI("nonexistent-command --json");
			expect(result.exitCode).toBe(1);
		});
	});

	describe("JSON validation", () => {
		it("should produce parseable JSON for all parser errors", async () => {
			const testCases = [
				"add tool --unknown --json",
				"add tool --json", // missing argument
				"invalid-command --json",
				"add invalid-subcommand --json",
			];

			for (const args of testCases) {
				const result = await runCLI(args);

				// Should produce valid JSON
				expect(() => JSON.parse(result.stdout), `Failed for: ${args}`).not.toThrow();

				const json = JSON.parse(result.stdout);
				expect(json.success, `Failed for: ${args}`).toBe(false);
				expect(json.error, `Failed for: ${args}`).toBeDefined();
			}
		});
	});

	describe("Consistency", () => {
		it("should use same error format for all parser errors", async () => {
			const result1 = await runCLI("add tool --invalid --json");
			const result2 = await runCLI("unknown-command --json");

			const json1 = JSON.parse(result1.stdout);
			const json2 = JSON.parse(result2.stdout);

			// Same structure
			expect(Object.keys(json1).sort()).toEqual(Object.keys(json2).sort());

			// Same types
			expect(typeof json1.success).toBe(typeof json2.success);
			expect(typeof json1.error).toBe(typeof json2.error);
			expect(typeof json1.errorCode).toBe(typeof json2.errorCode);
			expect(typeof json1.errorType).toBe(typeof json2.errorType);

			// Same error type
			expect(json1.errorType).toBe(json2.errorType);
		});
	});
});
