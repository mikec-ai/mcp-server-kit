/**
 * R2 Mock Factories
 *
 * Helper functions for creating mock R2 bucket objects in tests.
 * These mocks provide type-safe alternatives to manual object creation.
 */

import { vi } from "vitest";

// Type imports - these are available in generated projects but not in the toolkit itself
// We use 'any' with JSDoc for type safety in generated code
type R2Bucket = any;
type R2Object = any;
type R2ObjectBody = any;
type R2MultipartUpload = any;

/**
 * Create a mock R2Bucket with default implementations
 *
 * @param overrides - Override specific methods or properties
 * @returns Mocked R2Bucket instance
 *
 * @example
 * ```typescript
 * const mockBucket = createMockR2Bucket({
 *   list: vi.fn().mockResolvedValue({
 *     objects: [],
 *     truncated: false,
 *     delimitedPrefixes: []
 *   })
 * });
 * ```
 */
export function createMockR2Bucket(overrides?: Partial<R2Bucket>): R2Bucket {
	return {
		head: vi.fn().mockResolvedValue(null),
		get: vi.fn().mockResolvedValue(null),
		put: vi.fn().mockResolvedValue(null),
		delete: vi.fn().mockResolvedValue(undefined),
		list: vi.fn().mockResolvedValue({
			objects: [],
			truncated: false,
			delimitedPrefixes: [],
		}),
		createMultipartUpload: vi
			.fn()
			.mockResolvedValue(createMockR2MultipartUpload()),
		resumeMultipartUpload: vi.fn().mockReturnValue({} as R2MultipartUpload),
		...overrides,
	} as any;
}

/**
 * Create a mock R2MultipartUpload
 *
 * @param overrides - Override specific properties or methods
 * @returns Mocked R2MultipartUpload instance
 *
 * @example
 * ```typescript
 * const mockUpload = createMockR2MultipartUpload({
 *   key: 'large-file.zip',
 *   uploadId: 'upload-123'
 * });
 * ```
 */
export function createMockR2MultipartUpload(
	overrides?: Partial<R2MultipartUpload>,
): R2MultipartUpload {
	return {
		key: "test-key",
		uploadId: "upload-123",
		uploadPart: vi.fn().mockResolvedValue({
			partNumber: 1,
			etag: "abc123",
		}),
		abort: vi.fn().mockResolvedValue(undefined),
		complete: vi.fn().mockResolvedValue(null),
		...overrides,
	} as any;
}

/**
 * Create a mock R2ObjectBody (full object with body stream)
 *
 * @param overrides - Override specific properties or methods
 * @returns Mocked R2ObjectBody instance
 *
 * @example
 * ```typescript
 * const mockObject = createMockR2ObjectBody({
 *   key: 'test-file.txt',
 *   size: 1024,
 *   text: vi.fn().mockResolvedValue('Hello, world!')
 * });
 * ```
 */
export function createMockR2ObjectBody(
	overrides?: Partial<R2ObjectBody>,
): R2ObjectBody {
	const body = new ReadableStream({
		start(controller) {
			controller.close();
		},
	});

	return {
		key: "test-file.txt",
		version: "1",
		size: 100,
		etag: "abc123",
		httpEtag: '"abc123"',
		uploaded: new Date("2024-01-01T00:00:00Z"),
		httpMetadata: {},
		customMetadata: {},
		range: undefined,
		checksums: {},
		body,
		bodyUsed: false,
		arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
		text: vi.fn().mockResolvedValue(""),
		json: vi.fn().mockResolvedValue({}),
		blob: vi.fn().mockResolvedValue(new Blob([])),
		writeHttpMetadata: vi.fn(),
		...overrides,
	} as any;
}

/**
 * Create a mock R2Object (metadata only, no body)
 *
 * @param overrides - Override specific properties
 * @returns Mocked R2Object instance
 *
 * @example
 * ```typescript
 * const mockMeta = createMockR2Object({
 *   key: 'document.pdf',
 *   size: 1024 * 1024, // 1MB
 *   httpMetadata: { contentType: 'application/pdf' }
 * });
 * ```
 */
export function createMockR2Object(overrides?: Partial<R2Object>): R2Object {
	return {
		key: "test-file.txt",
		version: "1",
		size: 100,
		etag: "abc123",
		httpEtag: '"abc123"',
		uploaded: new Date("2024-01-01T00:00:00Z"),
		httpMetadata: {},
		customMetadata: {},
		range: undefined,
		checksums: {},
		writeHttpMetadata: vi.fn(),
		...overrides,
	} as any;
}
