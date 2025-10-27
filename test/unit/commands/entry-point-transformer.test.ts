/**
 * Entry Point Transformer Tests
 *
 * Tests for adding authentication middleware to entry point files.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
	addAuthToEntryPoint,
	removeAuthFromEntryPoint,
	hasAuthentication,
} from "../../../src/core/commands/shared/entry-point-transformer.js";

describe("Entry Point Transformer", () => {
	const testDir = "/tmp/entry-point-transformer-test";
	const entryPoint = join(testDir, "index.ts");

	beforeEach(async () => {
		await mkdir(testDir, { recursive: true });
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	describe("Cloudflare Workers", () => {
		const cloudflareEntry = `import { Server } from "@agents/server";

const server = new Server({ name: "my-server" });

server.addTool({
	name: "hello",
	async run() {
		return "Hello World";
	},
});

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		return server.handle(request, env, ctx);
	}
};
`;

		it("should add auth imports to Cloudflare entry point", async () => {
			await writeFile(entryPoint, cloudflareEntry);

			await addAuthToEntryPoint(entryPoint, "cloudflare");

			const result = await readFile(entryPoint, "utf-8");

			expect(result).toContain('import { getAuthProvider } from "./auth/config.js"');
			expect(result).toContain('import { AuthenticationError } from "./auth/types.js"');
		});

		it("should add auth middleware to fetch handler", async () => {
			await writeFile(entryPoint, cloudflareEntry);

			await addAuthToEntryPoint(entryPoint, "cloudflare");

			const result = await readFile(entryPoint, "utf-8");

			expect(result).toContain("// Validate authentication");
			expect(result).toContain('request.headers.get("Authorization")');
			expect(result).toContain("getAuthProvider(env)");
			expect(result).toContain("provider.validateToken(token, env)");
		});

		it("should handle missing Authorization header", async () => {
			await writeFile(entryPoint, cloudflareEntry);

			await addAuthToEntryPoint(entryPoint, "cloudflare");

			const result = await readFile(entryPoint, "utf-8");

			expect(result).toContain("if (!authHeader)");
			expect(result).toContain("Missing Authorization header");
			expect(result).toContain("status: 401");
		});

		it("should handle AuthenticationError", async () => {
			await writeFile(entryPoint, cloudflareEntry);

			await addAuthToEntryPoint(entryPoint, "cloudflare");

			const result = await readFile(entryPoint, "utf-8");

			expect(result).toContain("if (error instanceof AuthenticationError)");
			expect(result).toContain("Unauthorized: ${error.message}");
		});

		it("should attach user context to env", async () => {
			await writeFile(entryPoint, cloudflareEntry);

			await addAuthToEntryPoint(entryPoint, "cloudflare");

			const result = await readFile(entryPoint, "utf-8");

			expect(result).toContain("(env as any).user = user");
		});

		it("should preserve existing code", async () => {
			await writeFile(entryPoint, cloudflareEntry);

			await addAuthToEntryPoint(entryPoint, "cloudflare");

			const result = await readFile(entryPoint, "utf-8");

			expect(result).toContain('import { Server } from "@agents/server"');
			expect(result).toContain('name: "my-server"');
			expect(result).toContain("server.addTool");
			expect(result).toContain("return server.handle(request, env, ctx)");
		});

		it("should not modify if already has auth", async () => {
			const withAuth = cloudflareEntry.replace(
				'import { Server }',
				'import { getAuthProvider } from "./auth/config.js";\nimport { Server }',
			);
			await writeFile(entryPoint, withAuth);

			const modified = await addAuthToEntryPoint(entryPoint, "cloudflare");

			expect(modified).toBe(false);
		});

		it("should handle fetch handler without ctx parameter", async () => {
			const noCtx = `import { Server } from "@agents/server";

const server = new Server({ name: "my-server" });

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		return server.handle(request, env);
	}
};
`;
			await writeFile(entryPoint, noCtx);

			await addAuthToEntryPoint(entryPoint, "cloudflare");

			const result = await readFile(entryPoint, "utf-8");

			expect(result).toContain("getAuthProvider(env)");
		});

		it("should return true when file was modified", async () => {
			await writeFile(entryPoint, cloudflareEntry);

			const modified = await addAuthToEntryPoint(entryPoint, "cloudflare");

			expect(modified).toBe(true);
		});
	});

	describe("Vercel/Next.js", () => {
		const vercelEntry = `import { adaptVercelRequestForMCP } from "@vercel/mcp-adapter";

export async function POST(request: Request) {
	const mcpRequest = await adaptVercelRequestForMCP(request);
	// Handle MCP request
	return new Response("OK");
}
`;

		it("should add auth imports to Vercel entry point", async () => {
			await writeFile(entryPoint, vercelEntry);

			await addAuthToEntryPoint(entryPoint, "vercel");

			const result = await readFile(entryPoint, "utf-8");

			expect(result).toContain('import { getAuthProvider } from "@/auth/config"');
			expect(result).toContain('import { AuthenticationError } from "@/auth/types"');
		});

		it("should add auth middleware to POST handler", async () => {
			await writeFile(entryPoint, vercelEntry);

			await addAuthToEntryPoint(entryPoint, "vercel");

			const result = await readFile(entryPoint, "utf-8");

			expect(result).toContain("// Validate authentication");
			expect(result).toContain('request.headers.get("Authorization")');
			expect(result).toContain("getAuthProvider(process.env as any)");
		});

		it("should preserve existing Vercel code", async () => {
			await writeFile(entryPoint, vercelEntry);

			await addAuthToEntryPoint(entryPoint, "vercel");

			const result = await readFile(entryPoint, "utf-8");

			expect(result).toContain("adaptVercelRequestForMCP");
			expect(result).toContain("// Handle MCP request");
		});

		it("should not modify if already has auth", async () => {
			const withAuth = vercelEntry.replace(
				'import { adaptVercelRequestForMCP }',
				'import { getAuthProvider } from "@/auth/config";\nimport { adaptVercelRequestForMCP }',
			);
			await writeFile(entryPoint, withAuth);

			const modified = await addAuthToEntryPoint(entryPoint, "vercel");

			expect(modified).toBe(false);
		});
	});

	describe("removeAuthFromEntryPoint", () => {
		it("should remove Cloudflare auth imports", async () => {
			const withAuth = `import { Server } from "@agents/server";
import { getAuthProvider } from "./auth/config.js";
import { AuthenticationError } from "./auth/types.js";

const server = new Server({ name: "my-server" });

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// Validate authentication
		const authHeader = request.headers.get("Authorization");
		if (!authHeader) {
			return new Response("Unauthorized", { status: 401 });
		}

		const token = authHeader.replace(/^Bearer\\s+/i, "");
		const provider = getAuthProvider(env);
		const user = await provider.validateToken(token, env);

		// Attach user context to env for tools to use
		(env as any).user = user;

		return server.handle(request, env, ctx);
	}
};
`;
			await writeFile(entryPoint, withAuth);

			await removeAuthFromEntryPoint(entryPoint, "cloudflare");

			const result = await readFile(entryPoint, "utf-8");

			expect(result).not.toContain('import { getAuthProvider }');
			expect(result).not.toContain('import { AuthenticationError }');
		});

		it("should remove auth middleware blocks", async () => {
			const withAuth = `import { Server } from "@agents/server";
import { getAuthProvider } from "./auth/config.js";
import { AuthenticationError } from "./auth/types.js";

const server = new Server({ name: "my-server" });

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// Validate authentication
		const authHeader = request.headers.get("Authorization");
		if (!authHeader) {
			return new Response("Unauthorized", { status: 401 });
		}

		const token = authHeader.replace(/^Bearer\\s+/i, "");
		try {
			const provider = getAuthProvider(env);
			const user = await provider.validateToken(token, env);

			// Attach user context to env for tools to use
			(env as any).user = user;
		}

		return server.handle(request, env, ctx);
	}
};
`;
			await writeFile(entryPoint, withAuth);

			await removeAuthFromEntryPoint(entryPoint, "cloudflare");

			const result = await readFile(entryPoint, "utf-8");

			expect(result).not.toContain("Validate authentication");
			expect(result).not.toContain("authHeader");
			expect(result).not.toContain("getAuthProvider");
		});

		it("should preserve non-auth code", async () => {
			const withAuth = `import { Server } from "@agents/server";
import { getAuthProvider } from "./auth/config.js";

const server = new Server({ name: "my-server" });

server.addTool({
	name: "hello",
	async run() {
		return "Hello";
	}
});

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		// Validate authentication
		const authHeader = request.headers.get("Authorization");
		if (!authHeader) {
			return new Response("Unauthorized", { status: 401 });
		}

		const token = authHeader.replace(/^Bearer\\s+/i, "");
		try {
			const provider = getAuthProvider(env);
			const user = await provider.validateToken(token, env);

			// Attach user context to env for tools to use
			(env as any).user = user;
		} catch (error) {
			return new Response("Error", { status: 500 });
		}

		return server.handle(request, env);
	}
};
`;
			await writeFile(entryPoint, withAuth);

			await removeAuthFromEntryPoint(entryPoint, "cloudflare");

			const result = await readFile(entryPoint, "utf-8");

			expect(result).toContain('import { Server } from "@agents/server"');
			expect(result).toContain("server.addTool");
			expect(result).toContain("return server.handle(request, env)");
		});

		it("should return false if file not found", async () => {
			const modified = await removeAuthFromEntryPoint(
				"/nonexistent/file.ts",
				"cloudflare",
			);

			expect(modified).toBe(false);
		});

		it("should return false if no auth to remove", async () => {
			const noAuth = `import { Server } from "@agents/server";

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		return new Response("OK");
	}
};
`;
			await writeFile(entryPoint, noAuth);

			const modified = await removeAuthFromEntryPoint(entryPoint, "cloudflare");

			expect(modified).toBe(false);
		});

		it("should return true when file was modified", async () => {
			const withAuth = `import { getAuthProvider } from "./auth/config.js";

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		// Validate authentication
		const provider = getAuthProvider(env);

		// Attach user context to env for tools to use
		(env as any).user = {};

		return new Response("OK");
	}
};
`;
			await writeFile(entryPoint, withAuth);

			const modified = await removeAuthFromEntryPoint(entryPoint, "cloudflare");

			expect(modified).toBe(true);
		});
	});

	describe("hasAuthentication", () => {
		it("should return true if auth is present", async () => {
			const withAuth = `import { getAuthProvider } from "./auth/config.js";

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		// Validate authentication
		const provider = getAuthProvider(env);
		return new Response("OK");
	}
};
`;
			await writeFile(entryPoint, withAuth);

			const hasAuth = await hasAuthentication(entryPoint);

			expect(hasAuth).toBe(true);
		});

		it("should return false if auth is not present", async () => {
			const noAuth = `import { Server } from "@agents/server";

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		return new Response("OK");
	}
};
`;
			await writeFile(entryPoint, noAuth);

			const hasAuth = await hasAuthentication(entryPoint);

			expect(hasAuth).toBe(false);
		});

		it("should return false if file not found", async () => {
			const hasAuth = await hasAuthentication("/nonexistent/file.ts");

			expect(hasAuth).toBe(false);
		});

		it("should require both getAuthProvider and validation code", async () => {
			const partial = `import { getAuthProvider } from "./auth/config.js";

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		return new Response("OK");
	}
};
`;
			await writeFile(entryPoint, partial);

			const hasAuth = await hasAuthentication(entryPoint);

			// Should be false because no validation code
			expect(hasAuth).toBe(false);
		});
	});

	describe("Error Handling", () => {
		it("should throw error if entry point not found", async () => {
			await expect(
				addAuthToEntryPoint("/nonexistent/file.ts", "cloudflare"),
			).rejects.toThrow("Entry point not found");
		});

		it("should throw error for unsupported platform", async () => {
			await writeFile(entryPoint, "export default {}");

			await expect(
				addAuthToEntryPoint(entryPoint, "unsupported" as any),
			).rejects.toThrow("Unsupported platform");
		});
	});

	describe("Integration: Add and Remove Auth", () => {
		it("should fully add and remove Cloudflare auth", async () => {
			const original = `import { Server } from "@agents/server";

const server = new Server({ name: "test" });

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		return server.handle(request, env);
	}
};
`;
			await writeFile(entryPoint, original);

			// Add auth
			await addAuthToEntryPoint(entryPoint, "cloudflare");

			let result = await readFile(entryPoint, "utf-8");
			expect(result).toContain("getAuthProvider");
			expect(result).toContain("Validate authentication");

			// Remove auth
			await removeAuthFromEntryPoint(entryPoint, "cloudflare");

			result = await readFile(entryPoint, "utf-8");
			expect(result).not.toContain("getAuthProvider");
			expect(result).not.toContain("Validate authentication");

			// Core code should be preserved
			expect(result).toContain('import { Server } from "@agents/server"');
			expect(result).toContain("return server.handle(request, env)");
		});
	});
});
