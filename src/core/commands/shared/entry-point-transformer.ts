/**
 * Entry Point Transformer
 *
 * Transforms entry point files (src/index.ts) to add authentication middleware.
 * Handles Cloudflare Workers and Vercel Next.js patterns.
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

export type Platform = "cloudflare" | "vercel";

/**
 * Transform entry point to add authentication
 *
 * @param filePath - Path to entry point file
 * @param platform - Deployment platform
 * @returns True if file was modified
 */
export async function addAuthToEntryPoint(
	filePath: string,
	platform: Platform,
): Promise<boolean> {
	if (!existsSync(filePath)) {
		throw new Error(`Entry point not found: ${filePath}`);
	}

	const content = await readFile(filePath, "utf-8");

	let transformed: string;
	if (platform === "cloudflare") {
		transformed = addCloudflareAuth(content);
	} else if (platform === "vercel") {
		transformed = addVercelAuth(content);
	} else {
		throw new Error(`Unsupported platform: ${platform}`);
	}

	// Only write if content changed
	if (transformed !== content) {
		await writeFile(filePath, transformed, "utf-8");
		return true;
	}

	return false;
}

/**
 * Add authentication to Cloudflare Workers entry point
 */
function addCloudflareAuth(content: string): string {
	// Check if already has auth
	if (content.includes("getAuthProvider") || content.includes("Authorization")) {
		return content; // Already transformed
	}

	// Add auth imports after existing imports
	const authImports = `import { getAuthProvider } from "./auth/config.js";
import { AuthenticationError } from "./auth/types.js";
`;

	// Find the last import statement
	const importRegex = /^import\s+.*?;$/gm;
	let lastImportIndex = 0;
	let match;

	while ((match = importRegex.exec(content)) !== null) {
		lastImportIndex = match.index + match[0].length;
	}

	// Insert auth imports after last import
	let result = content;
	if (lastImportIndex > 0) {
		result =
			content.slice(0, lastImportIndex) +
			"\n" +
			authImports +
			content.slice(lastImportIndex);
	} else {
		// No imports found, add at the beginning
		result = authImports + "\n" + content;
	}

	// Find the fetch handler and add auth middleware
	const fetchHandlerRegex =
		/async\s+fetch\s*\(\s*request:\s*Request,\s*env:\s*Env(?:,\s*ctx:\s*ExecutionContext)?\s*\):\s*Promise<Response>\s*\{/;
	const fetchMatch = fetchHandlerRegex.exec(result);

	if (fetchMatch) {
		const insertPosition = fetchMatch.index + fetchMatch[0].length;

		const authMiddleware = `
		// Validate authentication
		const authHeader = request.headers.get("Authorization");
		if (!authHeader) {
			return new Response("Unauthorized: Missing Authorization header", {
				status: 401,
				headers: { "Content-Type": "text/plain" },
			});
		}

		const token = authHeader.replace(/^Bearer\\s+/i, "");
		try {
			const provider = getAuthProvider(env);
			const user = await provider.validateToken(token, env);

			// Attach user context to env for tools to use
			(env as any).user = user;
		} catch (error) {
			if (error instanceof AuthenticationError) {
				return new Response(\`Unauthorized: \${error.message}\`, {
					status: 401,
					headers: { "Content-Type": "text/plain" },
				});
			}
			console.error("Authentication error:", error);
			return new Response("Internal Server Error", {
				status: 500,
				headers: { "Content-Type": "text/plain" },
			});
		}
`;

		result =
			result.slice(0, insertPosition) + authMiddleware + result.slice(insertPosition);
	}

	return result;
}

/**
 * Add authentication to Vercel/Next.js entry point
 */
function addVercelAuth(content: string): string {
	// Check if already has auth
	if (content.includes("getAuthProvider") || content.includes("Authorization")) {
		return content; // Already transformed
	}

	// Add auth imports after existing imports
	const authImports = `import { getAuthProvider } from "@/auth/config";
import { AuthenticationError } from "@/auth/types";
`;

	// Find the last import statement
	const importRegex = /^import\s+.*?;$/gm;
	let lastImportIndex = 0;
	let match;

	while ((match = importRegex.exec(content)) !== null) {
		lastImportIndex = match.index + match[0].length;
	}

	// Insert auth imports after last import
	let result = content;
	if (lastImportIndex > 0) {
		result =
			content.slice(0, lastImportIndex) +
			"\n" +
			authImports +
			content.slice(lastImportIndex);
	} else {
		result = authImports + "\n" + content;
	}

	// Find the POST handler and add auth middleware
	const postHandlerRegex =
		/export\s+async\s+function\s+POST\s*\(\s*request:\s*Request\s*\)/;
	const postMatch = postHandlerRegex.exec(result);

	if (postMatch) {
		const insertPosition = postMatch.index + postMatch[0].length;

		// Find opening brace
		const braceMatch = result.slice(insertPosition).match(/\{/);
		if (braceMatch) {
			const bracePosition = insertPosition + braceMatch.index! + 1;

			const authMiddleware = `
	// Validate authentication
	const authHeader = request.headers.get("Authorization");
	if (!authHeader) {
		return new Response("Unauthorized: Missing Authorization header", {
			status: 401,
			headers: { "Content-Type": "text/plain" },
		});
	}

	const token = authHeader.replace(/^Bearer\\s+/i, "");
	try {
		const provider = getAuthProvider(process.env as any);
		const user = await provider.validateToken(token, process.env as any);

		// User context available for tools (would need to pass through adapter)
		// For now, validation is the primary goal
	} catch (error) {
		if (error instanceof AuthenticationError) {
			return new Response(\`Unauthorized: \${error.message}\`, {
				status: 401,
				headers: { "Content-Type": "text/plain" },
			});
		}
		console.error("Authentication error:", error);
		return new Response("Internal Server Error", {
			status: 500,
			headers: { "Content-Type": "text/plain" },
		});
	}
`;

			result =
				result.slice(0, bracePosition) +
				authMiddleware +
				result.slice(bracePosition);
		}
	}

	return result;
}

/**
 * Remove authentication from entry point (for rollback)
 *
 * @param filePath - Path to entry point file
 * @param platform - Deployment platform
 * @returns True if file was modified
 */
export async function removeAuthFromEntryPoint(
	filePath: string,
	platform: Platform,
): Promise<boolean> {
	if (!existsSync(filePath)) {
		return false;
	}

	const content = await readFile(filePath, "utf-8");

	// Remove auth imports
	let result = content.replace(
		/import\s+\{[^}]*getAuthProvider[^}]*\}\s+from\s+['"]\.\/auth\/config(?:\.js)?['"];?\s*/g,
		"",
	);
	result = result.replace(
		/import\s+\{[^}]*AuthenticationError[^}]*\}\s+from\s+['"]\.\/auth\/types(?:\.js)?['"];?\s*/g,
		"",
	);
	result = result.replace(
		/import\s+\{[^}]*getAuthProvider[^}]*\}\s+from\s+['"]@\/auth\/config['"];?\s*/g,
		"",
	);
	result = result.replace(
		/import\s+\{[^}]*AuthenticationError[^}]*\}\s+from\s+['"]@\/auth\/types['"];?\s*/g,
		"",
	);

	// Remove auth middleware blocks
	result = result.replace(
		/\/\/ Validate authentication[\s\S]*?\/\/ Attach user context[\s\S]*?\}\s*\n/g,
		"",
	);
	result = result.replace(
		/\/\/ Validate authentication[\s\S]*?\/\/ User context available[\s\S]*?\}\s*\n/g,
		"",
	);

	// Only write if content changed
	if (result !== content) {
		await writeFile(filePath, result, "utf-8");
		return true;
	}

	return false;
}

/**
 * Check if entry point already has authentication
 *
 * @param filePath - Path to entry point file
 * @returns True if authentication is present
 */
export async function hasAuthentication(filePath: string): Promise<boolean> {
	if (!existsSync(filePath)) {
		return false;
	}

	const content = await readFile(filePath, "utf-8");
	return (
		content.includes("getAuthProvider") &&
		(content.includes("Validate authentication") ||
			content.includes("Authorization"))
	);
}
