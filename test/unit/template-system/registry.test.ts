/**
 * Unit Tests for TemplateRegistry
 *
 * Tests template discovery, validation, filtering, and capability management.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { TemplateRegistry } from "@/core/template-system/registry";
import type { TemplateConfig, TemplateFilter } from "@/core/template-system/types";

describe("TemplateRegistry", () => {
	let registry: TemplateRegistry;

	beforeEach(() => {
		// Use default templates directory
		registry = new TemplateRegistry();
	});

	describe("discoverTemplates", () => {
		it("should discover all valid templates in directory", async () => {
			const templates = await registry.discoverTemplates();

			expect(templates).toBeInstanceOf(Array);
			expect(templates.length).toBeGreaterThan(0);
		});

		it("should discover cloudflare-remote template", async () => {
			const templates = await registry.discoverTemplates();

			const cloudflareTemplate = templates.find((t) => t.id === "cloudflare-remote");
			expect(cloudflareTemplate).toBeDefined();
			expect(cloudflareTemplate?.name).toBe("Cloudflare Workers MCP Server");
		});

		it("should validate template configs during discovery", async () => {
			const templates = await registry.discoverTemplates();

			// All discovered templates should be valid
			for (const template of templates) {
				expect(template.id).toBeTruthy();
				expect(template.version).toMatch(/^\d+\.\d+\.\d+$/);
				expect(template.capabilities).toBeDefined();
				expect(template.capabilities.transport.length).toBeGreaterThan(0);
			}
		});

		it("should cache discovered templates", async () => {
			const templates1 = await registry.discoverTemplates();
			const templates2 = await registry.discoverTemplates();

			// Should return same number of templates (cached)
			expect(templates1.length).toBe(templates2.length);
		});
	});

	describe("getTemplate", () => {
		it("should retrieve template by ID", async () => {
			const template = await registry.getTemplate("cloudflare-remote");

			expect(template).toBeDefined();
			expect(template.config.id).toBe("cloudflare-remote");
			expect(template.filesPath).toContain("cloudflare-remote");
		});

		it("should throw error for unknown template ID", async () => {
			await expect(registry.getTemplate("non-existent-template")).rejects.toThrow(
				"Template not found",
			);
		});

		it("should include file paths in template", async () => {
			const template = await registry.getTemplate("cloudflare-remote");

			expect(template.path).toBeTruthy();
			expect(template.filesPath).toBeTruthy();
			expect(template.filesPath).toContain("files");
		});

		it("should cache retrieved templates", async () => {
			const template1 = await registry.getTemplate("cloudflare-remote");
			const template2 = await registry.getTemplate("cloudflare-remote");

			// Should be the same instance (cached)
			expect(template1).toBe(template2);
		});
	});

	describe("validateTemplate", () => {
		it("should validate cloudflare-remote template", async () => {
			const result = await registry.validateTemplate("cloudflare-remote");

			expect(result.valid).toBe(true);
			expect(result.errors.length).toBe(0);
		});

		it("should check for required files", async () => {
			const result = await registry.validateTemplate("cloudflare-remote");

			// May have warnings about optional files, but should be valid
			expect(result.valid).toBe(true);
		});

		it("should return validation errors for unknown template", async () => {
			const result = await registry.validateTemplate("non-existent");

			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});
	});

	describe("listTemplates", () => {
		it("should list all templates", async () => {
			const templates = await registry.listTemplates();

			expect(templates.length).toBeGreaterThan(0);
			const cloudflareTemplate = templates.find((t) => t.id === "cloudflare-remote");
			expect(cloudflareTemplate).toBeDefined();
		});

		it("should filter templates by runtime", async () => {
			const filter: TemplateFilter = {
				runtime: "cloudflare-workers",
			};

			const templates = await registry.listTemplates(filter);

			expect(templates.length).toBeGreaterThan(0);
			for (const template of templates) {
				expect(template.capabilities.runtime).toBe("cloudflare-workers");
			}
		});

		it("should filter templates by transport", async () => {
			const filter: TemplateFilter = {
				transport: "sse",
			};

			const templates = await registry.listTemplates(filter);

			expect(templates.length).toBeGreaterThan(0);
			for (const template of templates) {
				expect(template.capabilities.transport).toContain("sse");
			}
		});

		it("should filter templates by deployment", async () => {
			const filter: TemplateFilter = {
				deployment: "remote",
			};

			const templates = await registry.listTemplates(filter);

			expect(templates.length).toBeGreaterThan(0);
			for (const template of templates) {
				expect(template.capabilities.deployment).toBe("remote");
			}
		});

		it("should filter templates by language", async () => {
			const filter: TemplateFilter = {
				language: "typescript",
			};

			const templates = await registry.listTemplates(filter);

			expect(templates.length).toBeGreaterThan(0);
			for (const template of templates) {
				expect(template.capabilities.language).toBe("typescript");
			}
		});

		it("should return empty array when no templates match filter", async () => {
			const filter: TemplateFilter = {
				runtime: "non-existent-runtime",
			};

			const templates = await registry.listTemplates(filter);

			expect(templates.length).toBe(0);
		});
	});

	describe("templateExists", () => {
		it("should return true for existing template", async () => {
			const exists = await registry.templateExists("cloudflare-remote");
			expect(exists).toBe(true);
		});

		it("should return false for non-existent template", async () => {
			const exists = await registry.templateExists("non-existent");
			expect(exists).toBe(false);
		});
	});

	describe("getCapabilities", () => {
		it("should aggregate all capabilities", async () => {
			const capabilities = await registry.getCapabilities();

			expect(capabilities.runtimes).toBeInstanceOf(Set);
			expect(capabilities.transports).toBeInstanceOf(Set);
			expect(capabilities.deployments).toBeInstanceOf(Set);
			expect(capabilities.languages).toBeInstanceOf(Set);
		});

		it("should include cloudflare-workers runtime", async () => {
			const capabilities = await registry.getCapabilities();

			expect(capabilities.runtimes.has("cloudflare-workers")).toBe(true);
		});

		it("should include SSE transport", async () => {
			const capabilities = await registry.getCapabilities();

			expect(capabilities.transports.has("sse")).toBe(true);
			expect(capabilities.transports.has("http")).toBe(true);
		});

		it("should include remote deployment", async () => {
			const capabilities = await registry.getCapabilities();

			expect(capabilities.deployments.has("remote")).toBe(true);
		});

		it("should include TypeScript language", async () => {
			const capabilities = await registry.getCapabilities();

			expect(capabilities.languages.has("typescript")).toBe(true);
		});
	});

	describe("clearCache", () => {
		it("should clear templates cache", async () => {
			// Load templates to populate cache
			await registry.getTemplate("cloudflare-remote");

			// Clear cache
			registry.clearCache();

			// Should still be able to load templates (re-discovers)
			const template = await registry.getTemplate("cloudflare-remote");
			expect(template).toBeDefined();
		});
	});
});
