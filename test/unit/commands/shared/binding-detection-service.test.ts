/**
 * BindingDetectionService - Unit Tests
 *
 * Tests AI binding detection and example generation
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { BindingDetectionService } from "@/core/commands/shared/binding-detection-service.js";

describe("BindingDetectionService", () => {
	let tempDir: string;
	let service: BindingDetectionService;

	beforeEach(async () => {
		tempDir = join("/tmp", `binding-detection-test-${Date.now()}`);
		await mkdir(tempDir, { recursive: true });
		service = new BindingDetectionService();
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	describe("AI binding detection", () => {
		it("should detect AI binding in wrangler.jsonc", async () => {
			const wranglerPath = join(tempDir, "wrangler.jsonc");
			await writeFile(
				wranglerPath,
				JSON.stringify({
					ai: {
						binding: "AI",
					},
				}),
			);

			const bindings = await service.detectBindings(tempDir);

			expect(bindings.ai).toBe("AI");
		});

		it("should detect custom AI binding name", async () => {
			const wranglerPath = join(tempDir, "wrangler.jsonc");
			await writeFile(
				wranglerPath,
				JSON.stringify({
					ai: {
						binding: "MY_AI",
					},
				}),
			);

			const bindings = await service.detectBindings(tempDir);

			expect(bindings.ai).toBe("MY_AI");
		});

		it("should handle missing AI binding", async () => {
			const wranglerPath = join(tempDir, "wrangler.jsonc");
			await writeFile(
				wranglerPath,
				JSON.stringify({
					kv_namespaces: [{ binding: "MY_CACHE" }],
				}),
			);

			const bindings = await service.detectBindings(tempDir);

			expect(bindings.ai).toBeUndefined();
		});

		it("should handle AI binding with empty string", async () => {
			const wranglerPath = join(tempDir, "wrangler.jsonc");
			await writeFile(
				wranglerPath,
				JSON.stringify({
					ai: {
						binding: "",
					},
				}),
			);

			const bindings = await service.detectBindings(tempDir);

			expect(bindings.ai).toBeUndefined();
		});

		it("should handle AI binding with invalid type", async () => {
			const wranglerPath = join(tempDir, "wrangler.jsonc");
			await writeFile(
				wranglerPath,
				JSON.stringify({
					ai: {
						binding: 123, // Invalid type
					},
				}),
			);

			const bindings = await service.detectBindings(tempDir);

			expect(bindings.ai).toBeUndefined();
		});
	});

	describe("AI binding with other bindings", () => {
		it("should detect AI alongside KV bindings", async () => {
			const wranglerPath = join(tempDir, "wrangler.jsonc");
			await writeFile(
				wranglerPath,
				JSON.stringify({
					kv_namespaces: [
						{ binding: "MY_CACHE" },
						{ binding: "SESSION_STORE" },
					],
					ai: {
						binding: "AI",
					},
				}),
			);

			const bindings = await service.detectBindings(tempDir);

			expect(bindings.kv).toEqual(["MY_CACHE", "SESSION_STORE"]);
			expect(bindings.ai).toBe("AI");
		});

		it("should detect AI alongside D1 bindings", async () => {
			const wranglerPath = join(tempDir, "wrangler.jsonc");
			await writeFile(
				wranglerPath,
				JSON.stringify({
					d1_databases: [{ binding: "USER_DB", database_name: "users" }],
					ai: {
						binding: "AI",
					},
				}),
			);

			const bindings = await service.detectBindings(tempDir);

			expect(bindings.d1).toEqual(["USER_DB"]);
			expect(bindings.ai).toBe("AI");
		});

		it("should detect AI alongside R2 bindings", async () => {
			const wranglerPath = join(tempDir, "wrangler.jsonc");
			await writeFile(
				wranglerPath,
				JSON.stringify({
					r2_buckets: [{ binding: "MEDIA", bucket_name: "media" }],
					ai: {
						binding: "AI",
					},
				}),
			);

			const bindings = await service.detectBindings(tempDir);

			expect(bindings.r2).toEqual(["MEDIA"]);
			expect(bindings.ai).toBe("AI");
		});

		it("should detect AI alongside all binding types", async () => {
			const wranglerPath = join(tempDir, "wrangler.jsonc");
			await writeFile(
				wranglerPath,
				JSON.stringify({
					kv_namespaces: [{ binding: "MY_CACHE" }],
					d1_databases: [{ binding: "USER_DB", database_name: "users" }],
					r2_buckets: [{ binding: "MEDIA", bucket_name: "media" }],
					ai: {
						binding: "AI",
					},
				}),
			);

			const bindings = await service.detectBindings(tempDir);

			expect(bindings.kv).toEqual(["MY_CACHE"]);
			expect(bindings.d1).toEqual(["USER_DB"]);
			expect(bindings.r2).toEqual(["MEDIA"]);
			expect(bindings.ai).toBe("AI");
		});
	});

	describe("hasAnyBindings with AI", () => {
		it("should return true when only AI binding exists", async () => {
			const wranglerPath = join(tempDir, "wrangler.jsonc");
			await writeFile(
				wranglerPath,
				JSON.stringify({
					ai: {
						binding: "AI",
					},
				}),
			);

			const hasBindings = await service.hasAnyBindings(tempDir);

			expect(hasBindings).toBe(true);
		});

		it("should return false when no bindings exist", async () => {
			const wranglerPath = join(tempDir, "wrangler.jsonc");
			await writeFile(wranglerPath, JSON.stringify({}));

			const hasBindings = await service.hasAnyBindings(tempDir);

			expect(hasBindings).toBe(false);
		});
	});

	describe("AI binding examples generation", () => {
		it("should generate AI examples with correct format", async () => {
			const bindings = {
				kv: [],
				d1: [],
				r2: [],
				ai: "AI",
			};

			const examples = service.generateBindingExamples(bindings);

			expect(examples).toHaveLength(1);
			expect(examples[0]).toEqual({
				type: "ai",
				bindingName: "AI",
				usageExample: expect.stringContaining("env.AI.aiSearch"),
			});
		});

		it("should generate AI examples without helper class", async () => {
			const bindings = {
				kv: [],
				d1: [],
				r2: [],
				ai: "AI",
			};

			const examples = service.generateBindingExamples(bindings);

			expect(examples[0].helperClass).toBeUndefined();
			expect(examples[0].importStatement).toBeUndefined();
		});

		it("should include both aiSearch and search methods in examples", async () => {
			const bindings = {
				kv: [],
				d1: [],
				r2: [],
				ai: "AI",
			};

			const examples = service.generateBindingExamples(bindings);

			expect(examples[0].usageExample).toContain("aiSearch");
			expect(examples[0].usageExample).toContain("search");
		});

		it("should include RAG and vector-only comments in examples", async () => {
			const bindings = {
				kv: [],
				d1: [],
				r2: [],
				ai: "AI",
			};

			const examples = service.generateBindingExamples(bindings);

			expect(examples[0].usageExample).toContain("RAG with LLM");
			expect(examples[0].usageExample).toContain("Vector-only search");
		});

		it("should generate AI examples with custom binding name", async () => {
			const bindings = {
				kv: [],
				d1: [],
				r2: [],
				ai: "MY_AI",
			};

			const examples = service.generateBindingExamples(bindings);

			expect(examples[0].bindingName).toBe("MY_AI");
			expect(examples[0].usageExample).toContain("env.MY_AI");
		});

		it("should generate AI examples alongside other binding types", async () => {
			const bindings = {
				kv: ["MY_CACHE"],
				d1: ["USER_DB"],
				r2: ["MEDIA"],
				ai: "AI",
			};

			const examples = service.generateBindingExamples(bindings);

			expect(examples).toHaveLength(4);

			// Find AI example
			const aiExample = examples.find((ex) => ex.type === "ai");
			expect(aiExample).toBeDefined();
			expect(aiExample?.bindingName).toBe("AI");
			expect(aiExample?.helperClass).toBeUndefined();
			expect(aiExample?.importStatement).toBeUndefined();
		});
	});

	describe("AI in binding summary", () => {
		it("should include AI in binding summary", async () => {
			const bindings = {
				kv: [],
				d1: [],
				r2: [],
				ai: "AI",
			};

			const summary = service.generateBindingSummary(bindings);

			expect(summary).toBe("AI: AI");
		});

		it("should include AI with custom binding name", async () => {
			const bindings = {
				kv: [],
				d1: [],
				r2: [],
				ai: "MY_AI",
			};

			const summary = service.generateBindingSummary(bindings);

			expect(summary).toBe("AI: MY_AI");
		});

		it("should include AI alongside other bindings", async () => {
			const bindings = {
				kv: ["MY_CACHE"],
				d1: ["USER_DB"],
				r2: ["MEDIA"],
				ai: "AI",
			};

			const summary = service.generateBindingSummary(bindings);

			expect(summary).toBe("KV: MY_CACHE | D1: USER_DB | R2: MEDIA | AI: AI");
		});

		it("should handle missing AI binding", async () => {
			const bindings = {
				kv: ["MY_CACHE"],
				d1: [],
				r2: [],
			};

			const summary = service.generateBindingSummary(bindings);

			expect(summary).toBe("KV: MY_CACHE");
			expect(summary).not.toContain("AI");
		});
	});
});
