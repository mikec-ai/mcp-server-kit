/**
 * Unit tests for centralized error handler
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	CLIError,
	ValidationError,
	RuntimeError,
	FileSystemError,
	handleCommandError,
	withErrorHandler,
	ValidationErrors,
	FileSystemErrors,
	RuntimeErrors,
} from "../../../src/core/commands/shared/error-handler.js";
import { ExitCode } from "../../../src/types/cli-errors.js";

describe("Error Handler", () => {
	let consoleLogSpy: any;
	let consoleErrorSpy: any;
	let processExitSpy: any;

	beforeEach(() => {
		// Spy on console methods
		consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
		consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		// Spy on process.exit and prevent actual exit
		processExitSpy = vi
			.spyOn(process, "exit")
			.mockImplementation((code?: any) => {
				throw new Error(`Process exited with code ${code}`);
			});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("CLIError", () => {
		it("should create error with exit code", () => {
			const error = new CLIError(
				"Test error",
				ExitCode.VALIDATION_ERROR,
				"TestError",
			);

			expect(error.message).toBe("Test error");
			expect(error.exitCode).toBe(ExitCode.VALIDATION_ERROR);
			expect(error.errorType).toBe("TestError");
			expect(error.name).toBe("CLIError");
		});

		it("should include suggestion and details", () => {
			const error = new CLIError(
				"Test error",
				ExitCode.VALIDATION_ERROR,
				"TestError",
				"Try this instead",
				{ field: "value" },
			);

			expect(error.suggestion).toBe("Try this instead");
			expect(error.details).toEqual({ field: "value" });
		});

		it("should convert to JSON response", () => {
			const error = new CLIError(
				"Test error",
				ExitCode.VALIDATION_ERROR,
				"TestError",
				"Try this instead",
				{ field: "value" },
			);

			const json = error.toJSON();

			expect(json).toEqual({
				success: false,
				error: "Test error",
				errorCode: ExitCode.VALIDATION_ERROR,
				errorType: "TestError",
				suggestion: "Try this instead",
				details: { field: "value" },
			});
		});
	});

	describe("Error Types", () => {
		it("should create ValidationError with correct exit code", () => {
			const error = new ValidationError("Invalid input");

			expect(error).toBeInstanceOf(CLIError);
			expect(error.exitCode).toBe(ExitCode.VALIDATION_ERROR);
			expect(error.errorType).toBe("ValidationError");
		});

		it("should create RuntimeError with correct exit code", () => {
			const error = new RuntimeError("Operation failed");

			expect(error).toBeInstanceOf(CLIError);
			expect(error.exitCode).toBe(ExitCode.RUNTIME_ERROR);
			expect(error.errorType).toBe("RuntimeError");
		});

		it("should create FileSystemError with correct exit code", () => {
			const error = new FileSystemError("File not found");

			expect(error).toBeInstanceOf(CLIError);
			expect(error.exitCode).toBe(ExitCode.FILESYSTEM_ERROR);
			expect(error.errorType).toBe("FileSystemError");
		});
	});

	describe("handleCommandError", () => {
		it("should output JSON and exit with correct code for CLIError", () => {
			const error = new ValidationError("Invalid input", "Use lowercase");

			expect(() =>
				handleCommandError(error, { jsonMode: true }),
			).toThrow("Process exited with code 1");

			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining('"success": false'),
			);
			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining('"error": "Invalid input"'),
			);
			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining('"errorCode": 1'),
			);
			expect(processExitSpy).toHaveBeenCalledWith(ExitCode.VALIDATION_ERROR);
		});

		it("should output text and exit with correct code for CLIError", () => {
			const error = new ValidationError("Invalid input", "Use lowercase");

			expect(() =>
				handleCommandError(error, { jsonMode: false }),
			).toThrow("Process exited with code 1");

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("Invalid input"),
			);
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("Use lowercase"),
			);
			expect(processExitSpy).toHaveBeenCalledWith(ExitCode.VALIDATION_ERROR);
		});

		it("should handle unknown errors in JSON mode", () => {
			const error = new Error("Unknown error");

			expect(() =>
				handleCommandError(error, { jsonMode: true }),
			).toThrow("Process exited with code 2");

			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining('"success": false'),
			);
			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining('"error": "Unknown error"'),
			);
			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining('"errorType": "UnknownError"'),
			);
			expect(processExitSpy).toHaveBeenCalledWith(ExitCode.RUNTIME_ERROR);
		});

		it("should handle unknown errors in text mode", () => {
			const error = new Error("Unknown error");

			expect(() =>
				handleCommandError(error, { jsonMode: false }),
			).toThrow("Process exited with code 2");

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("Unknown error"),
			);
			expect(processExitSpy).toHaveBeenCalledWith(ExitCode.RUNTIME_ERROR);
		});

		it("should handle non-Error objects", () => {
			const error = "String error";

			expect(() =>
				handleCommandError(error, { jsonMode: true }),
			).toThrow("Process exited with code 2");

			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining('"error": "String error"'),
			);
		});
	});

	describe("withErrorHandler", () => {
		it("should execute action successfully and exit with code 0", async () => {
			const action = vi.fn().mockResolvedValue(undefined);
			const getContext = vi.fn().mockReturnValue({ jsonMode: false });

			const wrapped = withErrorHandler(action, getContext);

			await expect(wrapped("arg1", "arg2")).rejects.toThrow(
				"Process exited with code 0",
			);

			expect(action).toHaveBeenCalledWith("arg1", "arg2");
			// getContext is only called on errors, not on success
			expect(getContext).not.toHaveBeenCalled();
			expect(processExitSpy).toHaveBeenCalledWith(ExitCode.SUCCESS);
		});

		it("should handle errors and exit with correct code", async () => {
			const error = new ValidationError("Invalid input");
			const action = vi.fn().mockRejectedValue(error);
			const getContext = vi
				.fn()
				.mockReturnValue({ jsonMode: true, command: "test" });

			const wrapped = withErrorHandler(action, getContext);

			await expect(wrapped("arg1")).rejects.toThrow(
				"Process exited with code 1",
			);

			expect(action).toHaveBeenCalledWith("arg1");
			expect(getContext).toHaveBeenCalledWith("arg1");
			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining('"errorCode": 1'),
			);
			expect(processExitSpy).toHaveBeenCalledWith(ExitCode.VALIDATION_ERROR);
		});

		it("should pass all arguments to action", async () => {
			const action = vi.fn().mockResolvedValue(undefined);
			const getContext = vi.fn().mockReturnValue({ jsonMode: false });

			const wrapped = withErrorHandler(action, getContext);

			await expect(wrapped("a", "b", "c")).rejects.toThrow(
				"Process exited with code 0",
			);

			expect(action).toHaveBeenCalledWith("a", "b", "c");
			// getContext is only called on errors, not on success
			expect(getContext).not.toHaveBeenCalled();
		});
	});

	describe("ValidationErrors helpers", () => {
		it("should create invalidName error", () => {
			const error = ValidationErrors.invalidName("Invalid_Name", "kebab-case");

			expect(error.message).toContain("Invalid_Name");
			expect(error.message).toContain("kebab-case");
			expect(error.suggestion).toContain("lowercase with hyphens");
			expect(error.details).toEqual({
				providedName: "Invalid_Name",
				expectedFormat: "kebab-case",
			});
		});

		it("should create alreadyExists error", () => {
			const error = ValidationErrors.alreadyExists("tool", "my-tool");

			expect(error.message).toContain("tool");
			expect(error.message).toContain("my-tool");
			expect(error.message).toContain("already exists");
			expect(error.suggestion).toContain("Choose a different name");
		});

		it("should create notFound error", () => {
			const error = ValidationErrors.notFound("binding", "MY_CACHE");

			expect(error.message).toContain("binding");
			expect(error.message).toContain("MY_CACHE");
			expect(error.message).toContain("not found");
		});

		it("should create invalidOption error", () => {
			const error = ValidationErrors.invalidOption("invalid", [
				"option1",
				"option2",
			]);

			expect(error.message).toContain("invalid");
			expect(error.suggestion).toContain("option1, option2");
		});
	});

	describe("FileSystemErrors helpers", () => {
		it("should create notFound error", () => {
			const error = FileSystemErrors.notFound("/path/to/file");

			expect(error.message).toContain("File not found");
			expect(error.message).toContain("/path/to/file");
			expect(error.exitCode).toBe(ExitCode.FILESYSTEM_ERROR);
		});

		it("should create permissionDenied error", () => {
			const error = FileSystemErrors.permissionDenied("/path/to/file", "write");

			expect(error.message).toContain("Permission denied");
			expect(error.message).toContain("write");
			expect(error.message).toContain("/path/to/file");
		});

		it("should create alreadyExists error", () => {
			const error = FileSystemErrors.alreadyExists("/path/to/file");

			expect(error.message).toContain("already exists");
			expect(error.message).toContain("/path/to/file");
		});
	});

	describe("RuntimeErrors helpers", () => {
		it("should create operationFailed error", () => {
			const error = RuntimeErrors.operationFailed(
				"npm install",
				"network timeout",
			);

			expect(error.message).toContain("npm install");
			expect(error.message).toContain("network timeout");
			expect(error.exitCode).toBe(ExitCode.RUNTIME_ERROR);
		});

		it("should create unexpectedState error", () => {
			const error = RuntimeErrors.unexpectedState("initializing", "ready");

			expect(error.message).toContain("initializing");
			expect(error.message).toContain("ready");
			expect(error.suggestion).toContain("bug");
		});
	});

	describe("JSON output validation", () => {
		it("should produce valid JSON for all error types", () => {
			const errors = [
				new ValidationError("test"),
				new RuntimeError("test"),
				new FileSystemError("test"),
			];

			errors.forEach((error) => {
				expect(() =>
					handleCommandError(error, { jsonMode: true }),
				).toThrow();

				const output = consoleLogSpy.mock.calls[0][0];
				expect(() => JSON.parse(output)).not.toThrow();

				const parsed = JSON.parse(output);
				expect(parsed.success).toBe(false);
				expect(parsed.error).toBeDefined();
				expect(parsed.errorCode).toBeDefined();
				expect(parsed.errorType).toBeDefined();

				// Reset for next test
				consoleLogSpy.mockClear();
			});
		});
	});
});
