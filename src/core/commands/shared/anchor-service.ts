/**
 * Anchor Service
 *
 * Provides anchor-based code transformation for reliable, agent-friendly
 * code modifications. Anchors are special comment blocks that mark insertion
 * points for generated code, making transformations more robust than regex.
 *
 * Pattern: <!-- or // <mcp-anchor:name> --> ... <!-- or // </mcp-anchor:name> -->
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

/**
 * Anchor block definition
 */
export interface AnchorBlock {
	/** Anchor type/name (e.g., "auth:imports", "auth:middleware") */
	type: string;
	/** Start marker comment */
	startMarker: string;
	/** End marker comment */
	endMarker: string;
	/** Human-readable description */
	description: string;
}

/**
 * Predefined anchor blocks for auth transformation
 */
export const AUTH_ANCHORS = {
	IMPORTS: {
		type: "auth:imports",
		startMarker: "// <mcp-auth:imports>",
		endMarker: "// </mcp-auth:imports>",
		description: "Auth imports will be added here by add-auth command",
	},
	MIDDLEWARE: {
		type: "auth:middleware",
		startMarker: "// <mcp-auth:middleware>",
		endMarker: "// </mcp-auth:middleware>",
		description: "Auth middleware will be added here by add-auth command",
	},
	CONFIG_VARS: {
		type: "auth:vars",
		startMarker: "# <mcp-auth:vars>",
		endMarker: "# </mcp-auth:vars>",
		description: "Auth environment variables managed by mcp-server-kit",
	},
} as const;

/**
 * Predefined anchor blocks for Cloudflare binding transformation
 */
export const BINDING_ANCHORS = {
	// Phase 1: KV and D1
	KV: {
		type: "bindings:kv",
		startMarker: "// <mcp-bindings:kv>",
		endMarker: "// </mcp-bindings:kv>",
		description: "KV namespace bindings managed by mcp-server-kit",
	},
	D1: {
		type: "bindings:d1",
		startMarker: "// <mcp-bindings:d1>",
		endMarker: "// </mcp-bindings:d1>",
		description: "D1 database bindings managed by mcp-server-kit",
	},
	IMPORTS: {
		type: "bindings:imports",
		startMarker: "// <mcp-bindings:imports>",
		endMarker: "// </mcp-bindings:imports>",
		description: "Binding helper imports will be added here by add binding command",
	},
	// Phase 2: R2 and Queues (coming soon)
	R2: {
		type: "bindings:r2",
		startMarker: "// <mcp-bindings:r2>",
		endMarker: "// </mcp-bindings:r2>",
		description: "R2 bucket bindings managed by mcp-server-kit",
	},
	QUEUES_PRODUCERS: {
		type: "bindings:queues:producers",
		startMarker: "// <mcp-bindings:queues:producers>",
		endMarker: "// </mcp-bindings:queues:producers>",
		description: "Queue producer bindings managed by mcp-server-kit",
	},
	QUEUES_CONSUMERS: {
		type: "bindings:queues:consumers",
		startMarker: "// <mcp-bindings:queues:consumers>",
		endMarker: "// </mcp-bindings:queues:consumers>",
		description: "Queue consumer bindings managed by mcp-server-kit",
	},
	// Phase 3: Workers AI and Vectorize (coming soon)
	AI: {
		type: "bindings:ai",
		startMarker: "// <mcp-bindings:ai>",
		endMarker: "// </mcp-bindings:ai>",
		description: "Workers AI binding managed by mcp-server-kit",
	},
	VECTORIZE: {
		type: "bindings:vectorize",
		startMarker: "// <mcp-bindings:vectorize>",
		endMarker: "// </mcp-bindings:vectorize>",
		description: "Vectorize index bindings managed by mcp-server-kit",
	},
	// Phase 4: Hyperdrive (coming soon)
	HYPERDRIVE: {
		type: "bindings:hyperdrive",
		startMarker: "// <mcp-bindings:hyperdrive>",
		endMarker: "// </mcp-bindings:hyperdrive>",
		description: "Hyperdrive config bindings managed by mcp-server-kit",
	},
} as const;

/**
 * Result of anchor operation
 */
export interface AnchorOperationResult {
	/** Whether the operation succeeded */
	success: boolean;
	/** Whether content was actually modified */
	modified: boolean;
	/** Error message if operation failed */
	error?: string;
	/** Warning message (e.g., anchor already populated) */
	warning?: string;
}

/**
 * Service for anchor-based code transformation
 */
export class AnchorService {
	/**
	 * Check if a file contains the specified anchor block
	 */
	async hasAnchor(
		filePath: string,
		anchor: AnchorBlock,
	): Promise<boolean> {
		if (!existsSync(filePath)) {
			return false;
		}

		const content = await readFile(filePath, "utf-8");
		return (
			content.includes(anchor.startMarker) && content.includes(anchor.endMarker)
		);
	}

	/**
	 * Check if an anchor block is empty (ready for content insertion)
	 */
	async isAnchorEmpty(
		filePath: string,
		anchor: AnchorBlock,
	): Promise<boolean> {
		const content = await readFile(filePath, "utf-8");

		const startIdx = content.indexOf(anchor.startMarker);
		const endIdx = content.indexOf(anchor.endMarker);

		if (startIdx === -1 || endIdx === -1) {
			return false;
		}

		// Extract content between anchors
		const blockContent = content.slice(
			startIdx + anchor.startMarker.length,
			endIdx,
		);

		// Consider empty if only whitespace or comments
		const trimmed = blockContent.trim();
		return (
			trimmed === "" ||
			trimmed.startsWith("//") ||
			trimmed.startsWith("#")
		);
	}

	/**
	 * Insert content at the specified anchor block
	 *
	 * @param filePath - Path to file to modify
	 * @param anchor - Anchor block to insert at
	 * @param content - Content to insert
	 * @param options - Insertion options
	 * @returns Result of the operation
	 */
	async insertAtAnchor(
		filePath: string,
		anchor: AnchorBlock,
		content: string,
		options: {
			/** Allow overwriting non-empty anchors */
			force?: boolean;
			/** Add indentation to inserted content */
			indent?: string;
		} = {},
	): Promise<AnchorOperationResult> {
		if (!existsSync(filePath)) {
			return {
				success: false,
				modified: false,
				error: `File not found: ${filePath}`,
			};
		}

		const fileContent = await readFile(filePath, "utf-8");

		// Check if anchors exist
		const startIdx = fileContent.indexOf(anchor.startMarker);
		const endIdx = fileContent.indexOf(anchor.endMarker);

		if (startIdx === -1 || endIdx === -1) {
			return {
				success: false,
				modified: false,
				error: `Missing anchor block: ${anchor.type}. Expected to find ${anchor.startMarker} and ${anchor.endMarker}`,
			};
		}

		// Check if anchor already has content
		const blockContent = fileContent.slice(
			startIdx + anchor.startMarker.length,
			endIdx,
		);
		const isEmpty =
			blockContent.trim() === "" ||
			blockContent.trim().startsWith("//") ||
			blockContent.trim().startsWith("#");

		if (!isEmpty && !options.force) {
			return {
				success: true,
				modified: false,
				warning: `Anchor block ${anchor.type} already has content. Use force=true to overwrite.`,
			};
		}

		// Apply indentation if specified
		let insertContent = content;
		if (options.indent) {
			insertContent = content
				.split("\n")
				.map((line) => (line.trim() ? options.indent + line : line))
				.join("\n");
		}

		// Insert content between anchors
		const before = fileContent.slice(0, startIdx + anchor.startMarker.length);
		const after = fileContent.slice(endIdx);
		const newContent = before + "\n" + insertContent + "\n" + after;

		await writeFile(filePath, newContent, "utf-8");

		return {
			success: true,
			modified: true,
		};
	}

	/**
	 * Remove content from an anchor block (leave anchors intact)
	 */
	async clearAnchor(
		filePath: string,
		anchor: AnchorBlock,
	): Promise<AnchorOperationResult> {
		if (!existsSync(filePath)) {
			return {
				success: false,
				modified: false,
				error: `File not found: ${filePath}`,
			};
		}

		const fileContent = await readFile(filePath, "utf-8");

		const startIdx = fileContent.indexOf(anchor.startMarker);
		const endIdx = fileContent.indexOf(anchor.endMarker);

		if (startIdx === -1 || endIdx === -1) {
			return {
				success: false,
				modified: false,
				error: `Missing anchor block: ${anchor.type}`,
			};
		}

		// Remove content between anchors, keep anchors
		const before = fileContent.slice(0, startIdx + anchor.startMarker.length);
		const after = fileContent.slice(endIdx);
		const newContent = before + "\n// " + anchor.description + "\n" + after;

		await writeFile(filePath, newContent, "utf-8");

		return {
			success: true,
			modified: true,
		};
	}

	/**
	 * Insert an anchor block at a specific position in a file
	 * (Used when scaffolding new templates)
	 */
	async insertAnchorBlock(
		filePath: string,
		anchor: AnchorBlock,
		position: number,
	): Promise<AnchorOperationResult> {
		if (!existsSync(filePath)) {
			return {
				success: false,
				modified: false,
				error: `File not found: ${filePath}`,
			};
		}

		const content = await readFile(filePath, "utf-8");

		// Check if anchor already exists
		if (content.includes(anchor.startMarker)) {
			return {
				success: true,
				modified: false,
				warning: `Anchor block ${anchor.type} already exists`,
			};
		}

		const anchorBlock = `\n${anchor.startMarker}\n// ${anchor.description}\n${anchor.endMarker}\n`;
		const newContent =
			content.slice(0, position) + anchorBlock + content.slice(position);

		await writeFile(filePath, newContent, "utf-8");

		return {
			success: true,
			modified: true,
		};
	}

	/**
	 * Validate that all required anchors are present in a file
	 */
	async validateAnchors(
		filePath: string,
		requiredAnchors: AnchorBlock[],
	): Promise<{ valid: boolean; missing: string[] }> {
		if (!existsSync(filePath)) {
			return {
				valid: false,
				missing: requiredAnchors.map((a) => a.type),
			};
		}

		const content = await readFile(filePath, "utf-8");
		const missing: string[] = [];

		for (const anchor of requiredAnchors) {
			if (
				!content.includes(anchor.startMarker) ||
				!content.includes(anchor.endMarker)
			) {
				missing.push(anchor.type);
			}
		}

		return {
			valid: missing.length === 0,
			missing,
		};
	}
}
