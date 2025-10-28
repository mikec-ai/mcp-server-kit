/**
 * Unit tests for R2 Helper Template
 *
 * Tests the generated R2 helper code for type safety and correctness.
 * Focus on verifying the fixes for:
 * 1. Conditional cursor access in list() method
 * 2. R2PutOptions type in createMultipartUpload() method
 */

import { describe, expect, it, beforeEach } from "vitest";
import { BindingTemplateService } from "@/core/commands/shared/binding-template-service.js";
import type { BindingTemplateVars } from "@/types/binding-types.js";

describe("R2 Helper Template", () => {
	let service: BindingTemplateService;
	let testVars: BindingTemplateVars;

	beforeEach(() => {
		service = new BindingTemplateService();
		testVars = {
			BINDING_NAME: "MEDIA_STORAGE",
			HELPER_CLASS_NAME: "MediaStorageR2",
			KEBAB_NAME: "media-storage",
			CAMEL_NAME: "mediaStorage",
			TYPE_SUFFIX: "R2",
		};
	});

	describe("Template generation", () => {
		it("should generate R2 helper with correct class name", () => {
			const content = service.generateR2Helper(testVars);

			expect(content).toContain("export class MediaStorageR2");
			expect(content).toContain("MEDIA_STORAGE R2 bucket");
		});

		it("should include constructor with R2Bucket parameter", () => {
			const content = service.generateR2Helper(testVars);

			expect(content).toContain("constructor(private bucket: R2Bucket)");
		});

		it("should include all essential R2 methods", () => {
			const content = service.generateR2Helper(testVars);

			// Upload methods
			expect(content).toContain("async put(");
			expect(content).toContain("async putText(");
			expect(content).toContain("async putJSON<T");

			// Download methods
			expect(content).toContain("async get(");
			expect(content).toContain("async getText(");
			expect(content).toContain("async getJSON<T");
			expect(content).toContain("async getArrayBuffer(");
			expect(content).toContain("async getBlob(");

			// Metadata and management
			expect(content).toContain("async head(");
			expect(content).toContain("async delete(");
			expect(content).toContain("async list(");
			expect(content).toContain("async listAll(");
			expect(content).toContain("async has(");

			// Multipart upload
			expect(content).toContain("async createMultipartUpload(");
		});

		it("should include type definitions", () => {
			const content = service.generateR2Helper(testVars);

			expect(content).toContain("export interface R2HttpMetadata");
			expect(content).toContain("export interface R2PutOptions");
			expect(content).toContain("export interface R2ListOptions");
			expect(content).toContain("export interface R2ListResult");
			expect(content).toContain("export interface R2ObjectMetadata");
		});
	});

	describe("FIX: list() method - conditional cursor", () => {
		it("should use conditional spread for cursor property", () => {
			const content = service.generateR2Helper(testVars);

			// Verify conditional cursor access
			expect(content).toContain(
				"...(result.truncated ? { cursor: result.cursor } : {})",
			);
		});

		it("should not have unconditional cursor access", () => {
			const content = service.generateR2Helper(testVars);

			// Ensure we're NOT using unconditional access like:
			// cursor: result.cursor,
			// This regex looks for cursor assignment without conditional
			const unconditionalCursorPattern = /\n\s+cursor:\s+result\.cursor,?\s*\n/;

			expect(content).not.toMatch(unconditionalCursorPattern);
		});

		it("should include truncated property in return", () => {
			const content = service.generateR2Helper(testVars);

			// Find the list method return statement
			const listMethodMatch = content.match(
				/async list\([^)]*\):.*?\{[\s\S]*?return\s+\{[\s\S]*?\};/,
			);

			expect(listMethodMatch).toBeTruthy();

			if (listMethodMatch) {
				const returnBlock = listMethodMatch[0];
				expect(returnBlock).toContain("truncated: result.truncated");
			}
		});

		it("should include objects property in return", () => {
			const content = service.generateR2Helper(testVars);

			const listMethodMatch = content.match(
				/async list\([^)]*\):.*?\{[\s\S]*?return\s+\{[\s\S]*?\};/,
			);

			expect(listMethodMatch).toBeTruthy();

			if (listMethodMatch) {
				const returnBlock = listMethodMatch[0];
				expect(returnBlock).toContain("objects: result.objects");
			}
		});

		it("should include delimitedPrefixes property in return", () => {
			const content = service.generateR2Helper(testVars);

			const listMethodMatch = content.match(
				/async list\([^)]*\):.*?\{[\s\S]*?return\s+\{[\s\S]*?\};/,
			);

			expect(listMethodMatch).toBeTruthy();

			if (listMethodMatch) {
				const returnBlock = listMethodMatch[0];
				expect(returnBlock).toContain(
					"delimitedPrefixes: result.delimitedPrefixes",
				);
			}
		});

		it("should have correct return type R2ListResult", () => {
			const content = service.generateR2Helper(testVars);

			expect(content).toContain(
				"async list(options: R2ListOptions = {}): Promise<R2ListResult>",
			);
		});
	});

	describe("FIX: createMultipartUpload() method - R2PutOptions type", () => {
		it("should use R2PutOptions parameter type", () => {
			const content = service.generateR2Helper(testVars);

			// Verify correct parameter type
			expect(content).toContain(
				"async createMultipartUpload(\n\t\tkey: string,\n\t\toptions?: R2PutOptions,\n\t): Promise<R2MultipartUpload>",
			);
		});

		it("should not use R2HttpMetadata as parameter type", () => {
			const content = service.generateR2Helper(testVars);

			// Ensure we're NOT using the incorrect type
			const incorrectTypePattern =
				/createMultipartUpload\([^)]*options\?:\s*R2HttpMetadata/;

			expect(content).not.toMatch(incorrectTypePattern);
		});

		it("should pass options to bucket.createMultipartUpload()", () => {
			const content = service.generateR2Helper(testVars);

			const methodMatch = content.match(
				/async createMultipartUpload\([^)]*\):[\s\S]*?\{[\s\S]*?return[\s\S]*?\}/,
			);

			expect(methodMatch).toBeTruthy();

			if (methodMatch) {
				const methodBody = methodMatch[0];
				expect(methodBody).toContain(
					"return await this.bucket.createMultipartUpload(key, options)",
				);
			}
		});

		it("should include updated JSDoc mentioning customMetadata", () => {
			const content = service.generateR2Helper(testVars);

			// Find JSDoc for createMultipartUpload
			const jsdocMatch = content.match(
				/\/\*\*[\s\S]*?Create a multipart upload[\s\S]*?\*\//,
			);

			expect(jsdocMatch).toBeTruthy();

			if (jsdocMatch) {
				const jsdoc = jsdocMatch[0];
				expect(jsdoc).toContain("customMetadata");
			}
		});

		it("should include example with httpMetadata and customMetadata", () => {
			const content = service.generateR2Helper(testVars);

			// Find the @example section for createMultipartUpload
			const exampleMatch = content.match(
				/@example[\s\S]*?createMultipartUpload[\s\S]*?```/,
			);

			expect(exampleMatch).toBeTruthy();

			if (exampleMatch) {
				const example = exampleMatch[0];
				expect(example).toContain("httpMetadata");
				expect(example).toContain("customMetadata");
			}
		});
	});

	describe("listAll() method - pagination handling", () => {
		it("should use do-while loop with cursor", () => {
			const content = service.generateR2Helper(testVars);

			// Check for do-while pattern
			expect(content).toContain("do {");
			expect(content).toContain("} while (cursor);");
		});

		it("should call list() with cursor parameter", () => {
			const content = service.generateR2Helper(testVars);

			// The listAll method should call list with cursor
			expect(content).toContain("const result = await this.list({ prefix, cursor });");
		});

		it("should accumulate objects from all pages", () => {
			const content = service.generateR2Helper(testVars);

			// Should push objects from each page
			expect(content).toContain("allObjects.push(...result.objects);");
		});

		it("should update cursor from result", () => {
			const content = service.generateR2Helper(testVars);

			// Should update cursor for next iteration
			expect(content).toContain("cursor = result.cursor;");
		});
	});

	describe("Type safety validation", () => {
		it("should have R2ListResult interface with optional cursor", () => {
			const content = service.generateR2Helper(testVars);

			const interfaceMatch = content.match(
				/export interface R2ListResult \{[\s\S]*?\}/,
			);

			expect(interfaceMatch).toBeTruthy();

			if (interfaceMatch) {
				const interfaceBody = interfaceMatch[0];
				expect(interfaceBody).toContain("truncated: boolean");
				expect(interfaceBody).toContain("cursor?: string");
			}
		});

		it("should have R2PutOptions interface with httpMetadata and customMetadata", () => {
			const content = service.generateR2Helper(testVars);

			const interfaceMatch = content.match(
				/export interface R2PutOptions \{[\s\S]*?\}/,
			);

			expect(interfaceMatch).toBeTruthy();

			if (interfaceMatch) {
				const interfaceBody = interfaceMatch[0];
				expect(interfaceBody).toContain("httpMetadata?: R2HttpMetadata");
				expect(interfaceBody).toContain(
					"customMetadata?: Record<string, string>",
				);
			}
		});

		it("should have md5 option in R2PutOptions", () => {
			const content = service.generateR2Helper(testVars);

			const interfaceMatch = content.match(
				/export interface R2PutOptions \{[\s\S]*?\}/,
			);

			expect(interfaceMatch).toBeTruthy();

			if (interfaceMatch) {
				const interfaceBody = interfaceMatch[0];
				expect(interfaceBody).toContain("md5?:");
			}
		});

		it("should use proper TypeScript types for all methods", () => {
			const content = service.generateR2Helper(testVars);

			// Check return types
			expect(content).toContain("Promise<R2Object | null>");
			expect(content).toContain("Promise<R2ObjectBody | null>");
			expect(content).toContain("Promise<string | null>");
			expect(content).toContain("Promise<ArrayBuffer | null>");
			expect(content).toContain("Promise<Blob | null>");
			expect(content).toContain("Promise<boolean>");
			expect(content).toContain("Promise<R2ListResult>");
			expect(content).toContain("Promise<R2ObjectMetadata[]>");
			expect(content).toContain("Promise<R2MultipartUpload>");
		});
	});

	describe("Examples and documentation", () => {
		it("should include usage examples in class JSDoc", () => {
			const content = service.generateR2Helper(testVars);

			// Find the class-level JSDoc
			const classJsDocMatch = content.match(/\/\*\*[\s\S]*?@example[\s\S]*?\*\//);

			expect(classJsDocMatch).toBeTruthy();

			if (classJsDocMatch) {
				const jsDoc = classJsDocMatch[0];
				expect(jsDoc).toContain("await mediaStorage.put(");
				expect(jsDoc).toContain("await mediaStorage.get(");
				expect(jsDoc).toContain("await mediaStorage.list(");
			}
		});

		it("should include pagination example in list() JSDoc", () => {
			const content = service.generateR2Helper(testVars);

			// Find list() method JSDoc
			const listJsDocMatch = content.match(
				/\/\*\*[\s\S]*?List objects in R2[\s\S]*?async list\(/,
			);

			expect(listJsDocMatch).toBeTruthy();

			if (listJsDocMatch) {
				const jsDoc = listJsDocMatch[0];
				expect(jsDoc).toContain("do {");
				expect(jsDoc).toContain("while (result.truncated)");
			}
		});

		it("should include multipart upload example with parts", () => {
			const content = service.generateR2Helper(testVars);

			const multipartJsDocMatch = content.match(
				/\/\*\*[\s\S]*?Create a multipart upload[\s\S]*?@example[\s\S]*?```/,
			);

			expect(multipartJsDocMatch).toBeTruthy();

			if (multipartJsDocMatch) {
				const jsDoc = multipartJsDocMatch[0];
				expect(jsDoc).toContain("uploadPart(");
				expect(jsDoc).toContain("complete(");
			}
		});
	});

	describe("Variable substitution", () => {
		it("should substitute BINDING_NAME in comments", () => {
			const vars: BindingTemplateVars = {
				BINDING_NAME: "TEST_BUCKET",
				HELPER_CLASS_NAME: "TestBucketR2",
				KEBAB_NAME: "test-bucket",
				CAMEL_NAME: "testBucket",
				TYPE_SUFFIX: "R2",
			};

			const content = service.generateR2Helper(vars);

			expect(content).toContain("TEST_BUCKET R2 bucket");
		});

		it("should substitute HELPER_CLASS_NAME in class declaration", () => {
			const vars: BindingTemplateVars = {
				BINDING_NAME: "UPLOADS",
				HELPER_CLASS_NAME: "UploadsR2",
				KEBAB_NAME: "uploads",
				CAMEL_NAME: "uploads",
				TYPE_SUFFIX: "R2",
			};

			const content = service.generateR2Helper(vars);

			expect(content).toContain("export class UploadsR2");
		});

		it("should substitute CAMEL_NAME in examples", () => {
			const vars: BindingTemplateVars = {
				BINDING_NAME: "MY_FILES",
				HELPER_CLASS_NAME: "MyFilesR2",
				KEBAB_NAME: "my-files",
				CAMEL_NAME: "myFiles",
				TYPE_SUFFIX: "R2",
			};

			const content = service.generateR2Helper(vars);

			// Check usage in examples
			expect(content).toContain("myFiles");
		});
	});
});
