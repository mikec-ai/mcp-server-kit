/**
 * AnchorService - Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import {
	AnchorService,
	AUTH_ANCHORS,
	type AnchorBlock,
} from "@/core/commands/shared/anchor-service.js";

describe("AnchorService", () => {
	let tempDir: string;
	let service: AnchorService;
	let testFilePath: string;

	beforeEach(async () => {
		tempDir = join("/tmp", `anchor-test-${Date.now()}`);
		await mkdir(tempDir, { recursive: true });
		service = new AnchorService();
		testFilePath = join(tempDir, "test-file.ts");
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	describe("hasAnchor", () => {
		it("should return true when anchor exists", async () => {
			const content = `
import { foo } from "./foo.js";
// <mcp-auth:imports>
// Auth imports will be added here
// </mcp-auth:imports>

export default {};
`;
			await writeFile(testFilePath, content, "utf-8");

			const result = await service.hasAnchor(testFilePath, AUTH_ANCHORS.IMPORTS);

			expect(result).toBe(true);
		});

		it("should return false when anchor does not exist", async () => {
			const content = `
import { foo } from "./foo.js";
export default {};
`;
			await writeFile(testFilePath, content, "utf-8");

			const result = await service.hasAnchor(testFilePath, AUTH_ANCHORS.IMPORTS);

			expect(result).toBe(false);
		});

		it("should return false when only start marker exists", async () => {
			const content = `
import { foo } from "./foo.js";
// <mcp-auth:imports>
export default {};
`;
			await writeFile(testFilePath, content, "utf-8");

			const result = await service.hasAnchor(testFilePath, AUTH_ANCHORS.IMPORTS);

			expect(result).toBe(false);
		});

		it("should return false when only end marker exists", async () => {
			const content = `
import { foo } from "./foo.js";
// </mcp-auth:imports>
export default {};
`;
			await writeFile(testFilePath, content, "utf-8");

			const result = await service.hasAnchor(testFilePath, AUTH_ANCHORS.IMPORTS);

			expect(result).toBe(false);
		});

		it("should return false when file does not exist", async () => {
			const result = await service.hasAnchor(
				join(tempDir, "nonexistent.ts"),
				AUTH_ANCHORS.IMPORTS,
			);

			expect(result).toBe(false);
		});
	});

	describe("isAnchorEmpty", () => {
		it("should return true when anchor has no content", async () => {
			const content = `
import { foo } from "./foo.js";
// <mcp-auth:imports>
// </mcp-auth:imports>
export default {};
`;
			await writeFile(testFilePath, content, "utf-8");

			const result = await service.isAnchorEmpty(
				testFilePath,
				AUTH_ANCHORS.IMPORTS,
			);

			expect(result).toBe(true);
		});

		it("should return true when anchor has only whitespace", async () => {
			const content = `
import { foo } from "./foo.js";
// <mcp-auth:imports>

// </mcp-auth:imports>
export default {};
`;
			await writeFile(testFilePath, content, "utf-8");

			const result = await service.isAnchorEmpty(
				testFilePath,
				AUTH_ANCHORS.IMPORTS,
			);

			expect(result).toBe(true);
		});

		it("should return true when anchor has only comments", async () => {
			const content = `
import { foo } from "./foo.js";
// <mcp-auth:imports>
// Auth imports will be added here
// </mcp-auth:imports>
export default {};
`;
			await writeFile(testFilePath, content, "utf-8");

			const result = await service.isAnchorEmpty(
				testFilePath,
				AUTH_ANCHORS.IMPORTS,
			);

			expect(result).toBe(true);
		});

		it("should return false when anchor has content", async () => {
			const content = `
import { foo } from "./foo.js";
// <mcp-auth:imports>
import { getAuthProvider } from "./auth/config.js";
// </mcp-auth:imports>
export default {};
`;
			await writeFile(testFilePath, content, "utf-8");

			const result = await service.isAnchorEmpty(
				testFilePath,
				AUTH_ANCHORS.IMPORTS,
			);

			expect(result).toBe(false);
		});

		it("should return false when anchor does not exist", async () => {
			const content = `
import { foo } from "./foo.js";
export default {};
`;
			await writeFile(testFilePath, content, "utf-8");

			const result = await service.isAnchorEmpty(
				testFilePath,
				AUTH_ANCHORS.IMPORTS,
			);

			expect(result).toBe(false);
		});
	});

	describe("insertAtAnchor", () => {
		it("should insert content at anchor", async () => {
			const content = `import { foo } from "./foo.js";
// <mcp-auth:imports>
// Auth imports will be added here
// </mcp-auth:imports>
export default {};`;
			await writeFile(testFilePath, content, "utf-8");

			const insertContent = `import { getAuthProvider } from "./auth/config.js";
import { AuthenticationError } from "./auth/types.js";`;

			const result = await service.insertAtAnchor(
				testFilePath,
				AUTH_ANCHORS.IMPORTS,
				insertContent,
			);

			expect(result.success).toBe(true);
			expect(result.modified).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it("should apply indentation to inserted content", async () => {
			const content = `import { foo } from "./foo.js";
// <mcp-auth:imports>
// </mcp-auth:imports>
export default {};`;
			await writeFile(testFilePath, content, "utf-8");

			const insertContent = `import { getAuthProvider } from "./auth/config.js";
import { AuthenticationError } from "./auth/types.js";`;

			await service.insertAtAnchor(
				testFilePath,
				AUTH_ANCHORS.IMPORTS,
				insertContent,
				{ indent: "\t" },
			);

			const { readFile } = await import("node:fs/promises");
			const updatedContent = await readFile(testFilePath, "utf-8");

			expect(updatedContent).toContain("\timport { getAuthProvider }");
			expect(updatedContent).toContain("\timport { AuthenticationError }");
		});

		it("should return warning when anchor already has content and force is false", async () => {
			const content = `import { foo } from "./foo.js";
// <mcp-auth:imports>
import { existing } from "./existing.js";
// </mcp-auth:imports>
export default {};`;
			await writeFile(testFilePath, content, "utf-8");

			const insertContent = `import { getAuthProvider } from "./auth/config.js";`;

			const result = await service.insertAtAnchor(
				testFilePath,
				AUTH_ANCHORS.IMPORTS,
				insertContent,
			);

			expect(result.success).toBe(true);
			expect(result.modified).toBe(false);
			expect(result.warning).toContain("already has content");
		});

		it("should overwrite content when force is true", async () => {
			const content = `import { foo } from "./foo.js";
// <mcp-auth:imports>
import { existing } from "./existing.js";
// </mcp-auth:imports>
export default {};`;
			await writeFile(testFilePath, content, "utf-8");

			const insertContent = `import { getAuthProvider } from "./auth/config.js";`;

			const result = await service.insertAtAnchor(
				testFilePath,
				AUTH_ANCHORS.IMPORTS,
				insertContent,
				{ force: true },
			);

			expect(result.success).toBe(true);
			expect(result.modified).toBe(true);

			const { readFile } = await import("node:fs/promises");
			const updatedContent = await readFile(testFilePath, "utf-8");
			expect(updatedContent).toContain("getAuthProvider");
			expect(updatedContent).not.toContain("existing");
		});

		it("should return error when file does not exist", async () => {
			const result = await service.insertAtAnchor(
				join(tempDir, "nonexistent.ts"),
				AUTH_ANCHORS.IMPORTS,
				"content",
			);

			expect(result.success).toBe(false);
			expect(result.modified).toBe(false);
			expect(result.error).toContain("File not found");
		});

		it("should return error when anchor does not exist", async () => {
			const content = `import { foo } from "./foo.js";
export default {};`;
			await writeFile(testFilePath, content, "utf-8");

			const result = await service.insertAtAnchor(
				testFilePath,
				AUTH_ANCHORS.IMPORTS,
				"content",
			);

			expect(result.success).toBe(false);
			expect(result.modified).toBe(false);
			expect(result.error).toContain("Missing anchor block");
		});
	});

	describe("clearAnchor", () => {
		it("should remove content from anchor", async () => {
			const content = `import { foo } from "./foo.js";
// <mcp-auth:imports>
import { getAuthProvider } from "./auth/config.js";
import { AuthenticationError } from "./auth/types.js";
// </mcp-auth:imports>
export default {};`;
			await writeFile(testFilePath, content, "utf-8");

			const result = await service.clearAnchor(
				testFilePath,
				AUTH_ANCHORS.IMPORTS,
			);

			expect(result.success).toBe(true);
			expect(result.modified).toBe(true);

			const { readFile } = await import("node:fs/promises");
			const updatedContent = await readFile(testFilePath, "utf-8");
			expect(updatedContent).toContain("// <mcp-auth:imports>");
			expect(updatedContent).toContain("// </mcp-auth:imports>");
			expect(updatedContent).not.toContain("getAuthProvider");
			expect(updatedContent).toContain(AUTH_ANCHORS.IMPORTS.description);
		});

		it("should return error when file does not exist", async () => {
			const result = await service.clearAnchor(
				join(tempDir, "nonexistent.ts"),
				AUTH_ANCHORS.IMPORTS,
			);

			expect(result.success).toBe(false);
			expect(result.modified).toBe(false);
			expect(result.error).toContain("File not found");
		});

		it("should return error when anchor does not exist", async () => {
			const content = `import { foo } from "./foo.js";
export default {};`;
			await writeFile(testFilePath, content, "utf-8");

			const result = await service.clearAnchor(
				testFilePath,
				AUTH_ANCHORS.IMPORTS,
			);

			expect(result.success).toBe(false);
			expect(result.modified).toBe(false);
			expect(result.error).toContain("Missing anchor block");
		});
	});

	describe("insertAnchorBlock", () => {
		it("should insert anchor block at specified position", async () => {
			const content = `import { foo } from "./foo.js";
export default {};`;
			await writeFile(testFilePath, content, "utf-8");

			const position = content.indexOf("export");

			const result = await service.insertAnchorBlock(
				testFilePath,
				AUTH_ANCHORS.IMPORTS,
				position,
			);

			expect(result.success).toBe(true);
			expect(result.modified).toBe(true);

			const { readFile } = await import("node:fs/promises");
			const updatedContent = await readFile(testFilePath, "utf-8");
			expect(updatedContent).toContain("// <mcp-auth:imports>");
			expect(updatedContent).toContain("// </mcp-auth:imports>");
			expect(updatedContent).toContain(AUTH_ANCHORS.IMPORTS.description);
		});

		it("should return warning when anchor already exists", async () => {
			const content = `import { foo } from "./foo.js";
// <mcp-auth:imports>
// </mcp-auth:imports>
export default {};`;
			await writeFile(testFilePath, content, "utf-8");

			const result = await service.insertAnchorBlock(
				testFilePath,
				AUTH_ANCHORS.IMPORTS,
				0,
			);

			expect(result.success).toBe(true);
			expect(result.modified).toBe(false);
			expect(result.warning).toContain("already exists");
		});

		it("should return error when file does not exist", async () => {
			const result = await service.insertAnchorBlock(
				join(tempDir, "nonexistent.ts"),
				AUTH_ANCHORS.IMPORTS,
				0,
			);

			expect(result.success).toBe(false);
			expect(result.modified).toBe(false);
			expect(result.error).toContain("File not found");
		});
	});

	describe("validateAnchors", () => {
		it("should return valid when all anchors present", async () => {
			const content = `import { foo } from "./foo.js";
// <mcp-auth:imports>
// </mcp-auth:imports>

export default {
	async fetch() {
		// <mcp-auth:middleware>
		// </mcp-auth:middleware>
		return new Response("ok");
	}
};`;
			await writeFile(testFilePath, content, "utf-8");

			const result = await service.validateAnchors(testFilePath, [
				AUTH_ANCHORS.IMPORTS,
				AUTH_ANCHORS.MIDDLEWARE,
			]);

			expect(result.valid).toBe(true);
			expect(result.missing).toHaveLength(0);
		});

		it("should return invalid when some anchors missing", async () => {
			const content = `import { foo } from "./foo.js";
// <mcp-auth:imports>
// </mcp-auth:imports>

export default {
	async fetch() {
		return new Response("ok");
	}
};`;
			await writeFile(testFilePath, content, "utf-8");

			const result = await service.validateAnchors(testFilePath, [
				AUTH_ANCHORS.IMPORTS,
				AUTH_ANCHORS.MIDDLEWARE,
			]);

			expect(result.valid).toBe(false);
			expect(result.missing).toContain("auth:middleware");
			expect(result.missing).not.toContain("auth:imports");
		});

		it("should return invalid when all anchors missing", async () => {
			const content = `import { foo } from "./foo.js";
export default {};`;
			await writeFile(testFilePath, content, "utf-8");

			const result = await service.validateAnchors(testFilePath, [
				AUTH_ANCHORS.IMPORTS,
				AUTH_ANCHORS.MIDDLEWARE,
			]);

			expect(result.valid).toBe(false);
			expect(result.missing).toHaveLength(2);
			expect(result.missing).toContain("auth:imports");
			expect(result.missing).toContain("auth:middleware");
		});

		it("should return invalid when file does not exist", async () => {
			const result = await service.validateAnchors(
				join(tempDir, "nonexistent.ts"),
				[AUTH_ANCHORS.IMPORTS],
			);

			expect(result.valid).toBe(false);
			expect(result.missing).toContain("auth:imports");
		});
	});

	describe("AUTH_ANCHORS constants", () => {
		it("should have correct structure for IMPORTS anchor", () => {
			expect(AUTH_ANCHORS.IMPORTS.type).toBe("auth:imports");
			expect(AUTH_ANCHORS.IMPORTS.startMarker).toBe("// <mcp-auth:imports>");
			expect(AUTH_ANCHORS.IMPORTS.endMarker).toBe("// </mcp-auth:imports>");
			expect(AUTH_ANCHORS.IMPORTS.description).toBeTruthy();
		});

		it("should have correct structure for MIDDLEWARE anchor", () => {
			expect(AUTH_ANCHORS.MIDDLEWARE.type).toBe("auth:middleware");
			expect(AUTH_ANCHORS.MIDDLEWARE.startMarker).toBe(
				"// <mcp-auth:middleware>",
			);
			expect(AUTH_ANCHORS.MIDDLEWARE.endMarker).toBe(
				"// </mcp-auth:middleware>",
			);
			expect(AUTH_ANCHORS.MIDDLEWARE.description).toBeTruthy();
		});

		it("should have correct structure for CONFIG_VARS anchor", () => {
			expect(AUTH_ANCHORS.CONFIG_VARS.type).toBe("auth:vars");
			expect(AUTH_ANCHORS.CONFIG_VARS.startMarker).toBe("// <mcp-auth:vars>");
			expect(AUTH_ANCHORS.CONFIG_VARS.endMarker).toBe("// </mcp-auth:vars>");
			expect(AUTH_ANCHORS.CONFIG_VARS.description).toBeTruthy();
		});
	});
});
