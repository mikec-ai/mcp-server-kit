/**
 * ValidationService - Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import {
	ValidationService,
	type ValidationConfig,
	type ResourceOptions,
} from "@/core/commands/shared/validation-service.js";

describe("ValidationService", () => {
	let tempDir: string;
	let service: ValidationService;

	beforeEach(async () => {
		tempDir = join("/tmp", `validation-test-${Date.now()}`);
		await mkdir(tempDir, { recursive: true });
		service = new ValidationService();
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	const toolConfig: ValidationConfig = {
		entityType: "tool",
		sourceDir: "src/tools",
	};

	const promptConfig: ValidationConfig = {
		entityType: "prompt",
		sourceDir: "src/prompts",
	};

	const resourceConfig: ValidationConfig = {
		entityType: "resource",
		sourceDir: "src/resources",
	};

	describe("validateName", () => {
		it("should accept valid tool names", () => {
			expect(() => service.validateName("my-tool", toolConfig)).not.toThrow();
			expect(() => service.validateName("api-client", toolConfig)).not.toThrow();
			expect(() => service.validateName("tool123", toolConfig)).not.toThrow();
			expect(() => service.validateName("tool-with-many-hyphens", toolConfig)).not.toThrow();
		});

		it("should accept valid prompt names", () => {
			expect(() => service.validateName("my-prompt", promptConfig)).not.toThrow();
			expect(() => service.validateName("code-reviewer", promptConfig)).not.toThrow();
		});

		it("should accept valid resource names", () => {
			expect(() => service.validateName("my-resource", resourceConfig)).not.toThrow();
			expect(() => service.validateName("config-data", resourceConfig)).not.toThrow();
		});

		it("should reject names starting with uppercase", () => {
			expect(() => service.validateName("MyTool", toolConfig)).toThrow(
				"Tool name must be lowercase with hyphens",
			);
			expect(() => service.validateName("MyPrompt", promptConfig)).toThrow(
				"Prompt name must be lowercase with hyphens",
			);
			expect(() => service.validateName("MyResource", resourceConfig)).toThrow(
				"Resource name must be lowercase with hyphens",
			);
		});

		it("should reject names starting with numbers", () => {
			expect(() => service.validateName("123tool", toolConfig)).toThrow(
				"Tool name must be lowercase with hyphens",
			);
		});

		it("should reject names starting with hyphens", () => {
			expect(() => service.validateName("-tool", toolConfig)).toThrow(
				"Tool name must be lowercase with hyphens",
			);
		});

		it("should reject names with underscores", () => {
			expect(() => service.validateName("my_tool", toolConfig)).toThrow(
				"Tool name must be lowercase with hyphens",
			);
		});

		it("should reject names with spaces", () => {
			expect(() => service.validateName("my tool", toolConfig)).toThrow(
				"Tool name must be lowercase with hyphens",
			);
		});

		it("should reject names with special characters", () => {
			expect(() => service.validateName("my@tool", toolConfig)).toThrow(
				"Tool name must be lowercase with hyphens",
			);
			expect(() => service.validateName("my.tool", toolConfig)).toThrow(
				"Tool name must be lowercase with hyphens",
			);
			expect(() => service.validateName("my$tool", toolConfig)).toThrow(
				"Tool name must be lowercase with hyphens",
			);
		});

		it("should reject empty names", () => {
			expect(() => service.validateName("", toolConfig)).toThrow(
				"Tool name must be lowercase with hyphens",
			);
		});
	});

	describe("validateProject", () => {
		it("should pass when package.json exists", async () => {
			await writeFile(join(tempDir, "package.json"), "{}", "utf-8");

			expect(() => service.validateProject(tempDir)).not.toThrow();
		});

		it("should throw when package.json does not exist", () => {
			expect(() => service.validateProject(tempDir)).toThrow(
				"Not in a valid project directory (no package.json found)",
			);
		});

		it("should throw when directory does not exist", () => {
			const nonExistentDir = join(tempDir, "does-not-exist");

			expect(() => service.validateProject(nonExistentDir)).toThrow(
				"Not in a valid project directory",
			);
		});
	});

	describe("validateFileNotExists", () => {
		beforeEach(async () => {
			await mkdir(join(tempDir, "src", "tools"), { recursive: true });
			await mkdir(join(tempDir, "src", "prompts"), { recursive: true });
			await mkdir(join(tempDir, "src", "resources"), { recursive: true });
		});

		it("should pass when tool file does not exist", () => {
			expect(() =>
				service.validateFileNotExists(tempDir, "new-tool", toolConfig),
			).not.toThrow();
		});

		it("should throw when tool file exists", async () => {
			const toolPath = join(tempDir, "src", "tools", "existing-tool.ts");
			await writeFile(toolPath, "// tool content", "utf-8");

			expect(() =>
				service.validateFileNotExists(tempDir, "existing-tool", toolConfig),
			).toThrow("Tool already exists:");
		});

		it("should throw when prompt file exists", async () => {
			const promptPath = join(tempDir, "src", "prompts", "existing-prompt.ts");
			await writeFile(promptPath, "// prompt content", "utf-8");

			expect(() =>
				service.validateFileNotExists(tempDir, "existing-prompt", promptConfig),
			).toThrow("Prompt already exists:");
		});

		it("should throw when resource file exists", async () => {
			const resourcePath = join(
				tempDir,
				"src",
				"resources",
				"existing-resource.ts",
			);
			await writeFile(resourcePath, "// resource content", "utf-8");

			expect(() =>
				service.validateFileNotExists(
					tempDir,
					"existing-resource",
					resourceConfig,
				),
			).toThrow("Resource already exists:");
		});

		it("should include file path in error message", async () => {
			const toolPath = join(tempDir, "src", "tools", "my-tool.ts");
			await writeFile(toolPath, "// tool content", "utf-8");

			expect(() =>
				service.validateFileNotExists(tempDir, "my-tool", toolConfig),
			).toThrow(toolPath);
		});
	});

	describe("validateEntity", () => {
		it("should pass all validations for a new tool", async () => {
			await writeFile(join(tempDir, "package.json"), "{}", "utf-8");
			await mkdir(join(tempDir, "src", "tools"), { recursive: true });

			expect(() =>
				service.validateEntity(tempDir, "new-tool", toolConfig),
			).not.toThrow();
		});

		it("should pass all validations for a new prompt", async () => {
			await writeFile(join(tempDir, "package.json"), "{}", "utf-8");
			await mkdir(join(tempDir, "src", "prompts"), { recursive: true });

			expect(() =>
				service.validateEntity(tempDir, "new-prompt", promptConfig),
			).not.toThrow();
		});

		it("should pass all validations for a new resource", async () => {
			await writeFile(join(tempDir, "package.json"), "{}", "utf-8");
			await mkdir(join(tempDir, "src", "resources"), { recursive: true });

			expect(() =>
				service.validateEntity(tempDir, "new-resource", resourceConfig),
			).not.toThrow();
		});

		it("should fail when name is invalid", async () => {
			await writeFile(join(tempDir, "package.json"), "{}", "utf-8");
			await mkdir(join(tempDir, "src", "tools"), { recursive: true });

			expect(() =>
				service.validateEntity(tempDir, "InvalidName", toolConfig),
			).toThrow("Tool name must be lowercase with hyphens");
		});

		it("should fail when not in a project", async () => {
			await mkdir(join(tempDir, "src", "tools"), { recursive: true });

			expect(() =>
				service.validateEntity(tempDir, "new-tool", toolConfig),
			).toThrow("Not in a valid project directory");
		});

		it("should fail when entity file exists", async () => {
			await writeFile(join(tempDir, "package.json"), "{}", "utf-8");
			await mkdir(join(tempDir, "src", "tools"), { recursive: true });
			await writeFile(
				join(tempDir, "src", "tools", "existing-tool.ts"),
				"// tool",
				"utf-8",
			);

			expect(() =>
				service.validateEntity(tempDir, "existing-tool", toolConfig),
			).toThrow("Tool already exists:");
		});
	});

	describe("validateResourceOptions", () => {
		it("should pass when neither static nor dynamic is set", () => {
			const options: ResourceOptions = {};

			expect(() => service.validateResourceOptions(options)).not.toThrow();
		});

		it("should pass when only static is set", () => {
			const options: ResourceOptions = { static: true };

			expect(() => service.validateResourceOptions(options)).not.toThrow();
		});

		it("should pass when only dynamic is set", () => {
			const options: ResourceOptions = { dynamic: true };

			expect(() => service.validateResourceOptions(options)).not.toThrow();
		});

		it("should throw when both static and dynamic are set", () => {
			const options: ResourceOptions = { static: true, dynamic: true };

			expect(() => service.validateResourceOptions(options)).toThrow(
				"Cannot use both --static and --dynamic flags",
			);
		});

		it("should pass when uriPattern is provided", () => {
			const options: ResourceOptions = { uriPattern: "custom://pattern" };

			expect(() => service.validateResourceOptions(options)).not.toThrow();
		});

		it("should pass when uriPattern and static are both set", () => {
			const options: ResourceOptions = {
				uriPattern: "custom://pattern",
				static: true,
			};

			expect(() => service.validateResourceOptions(options)).not.toThrow();
		});

		it("should throw when uriPattern and both flags are set", () => {
			const options: ResourceOptions = {
				uriPattern: "custom://pattern",
				static: true,
				dynamic: true,
			};

			expect(() => service.validateResourceOptions(options)).toThrow(
				"Cannot use both --static and --dynamic flags",
			);
		});
	});

	describe("determineUriPattern", () => {
		it("should use explicit uriPattern when provided", () => {
			const options: ResourceOptions = { uriPattern: "custom://my-pattern" };

			const result = service.determineUriPattern("my-resource", options);

			expect(result).toBe("custom://my-pattern");
		});

		it("should use dynamic pattern when --dynamic flag is set", () => {
			const options: ResourceOptions = { dynamic: true };

			const result = service.determineUriPattern("my-resource", options);

			expect(result).toBe("resource://{id}");
		});

		it("should use static pattern by default", () => {
			const options: ResourceOptions = {};

			const result = service.determineUriPattern("my-resource", options);

			expect(result).toBe("config://my-resource");
		});

		it("should use static pattern when --static flag is set", () => {
			const options: ResourceOptions = { static: true };

			const result = service.determineUriPattern("my-resource", options);

			expect(result).toBe("config://my-resource");
		});

		it("should prefer explicit uriPattern over --dynamic flag", () => {
			const options: ResourceOptions = {
				uriPattern: "custom://pattern",
				dynamic: true,
			};

			const result = service.determineUriPattern("my-resource", options);

			expect(result).toBe("custom://pattern");
		});

		it("should prefer explicit uriPattern over --static flag", () => {
			const options: ResourceOptions = {
				uriPattern: "custom://pattern",
				static: true,
			};

			const result = service.determineUriPattern("my-resource", options);

			expect(result).toBe("custom://pattern");
		});

		it("should incorporate resource name in static pattern", () => {
			const options: ResourceOptions = {};

			const result1 = service.determineUriPattern("config-data", options);
			const result2 = service.determineUriPattern("api-keys", options);

			expect(result1).toBe("config://config-data");
			expect(result2).toBe("config://api-keys");
		});
	});
});
