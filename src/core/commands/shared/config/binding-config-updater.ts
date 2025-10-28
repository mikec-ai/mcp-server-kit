/**
 * Binding Configuration Updater
 *
 * Adds Cloudflare bindings (KV, D1, R2, etc.) to wrangler.jsonc and src/index.ts.
 * Uses anchor-based code injection for safe, structured updates.
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { AnchorService, BINDING_ANCHORS } from "../anchor-service.js";
import { getWranglerConfigPath } from "./wrangler-utils.js";

/**
 * Add KV namespace binding to wrangler.jsonc using anchor service
 *
 * @param cwd - Project root directory
 * @param bindingName - Binding name (e.g., MY_CACHE)
 * @param kvId - Optional KV namespace ID
 * @returns True if binding was added
 */
export async function addKVBinding(
	cwd: string,
	bindingName: string,
	kvId?: string,
): Promise<boolean> {
	const wranglerPath = getWranglerConfigPath(cwd);

	if (!wranglerPath || !wranglerPath.endsWith(".jsonc")) {
		throw new Error(
			"wrangler.jsonc not found. KV bindings require wrangler.jsonc format.",
		);
	}

	const anchorService = new AnchorService();

	// Check if anchor exists
	const hasAnchor = await anchorService.hasAnchor(
		wranglerPath,
		BINDING_ANCHORS.KV,
	);
	if (!hasAnchor) {
		throw new Error(
			"Missing KV anchor block in wrangler.jsonc. Your project may be outdated.",
		);
	}

	// Build KV binding entry
	const kvBinding = kvId
		? `"kv_namespaces": [
		{
			"binding": "${bindingName}",
			"id": "${kvId}"
		}
	],`
		: `"kv_namespaces": [
		{
			"binding": "${bindingName}",
			"id": "TODO: Run 'wrangler kv namespace create ${bindingName}' and add the ID here"
		}
	],`;

	// Insert at KV anchor
	const result = await anchorService.insertAtAnchor(
		wranglerPath,
		BINDING_ANCHORS.KV,
		kvBinding,
		{ indent: "\t" },
	);

	return result.modified;
}

/**
 * Add D1 database binding to wrangler.jsonc using anchor service
 *
 * @param cwd - Project root directory
 * @param bindingName - Binding name (e.g., MY_DB)
 * @param databaseName - Database name (e.g., my-database)
 * @param databaseId - Optional D1 database ID
 * @returns True if binding was added
 */
export async function addD1Binding(
	cwd: string,
	bindingName: string,
	databaseName: string,
	databaseId?: string,
): Promise<boolean> {
	const wranglerPath = getWranglerConfigPath(cwd);

	if (!wranglerPath || !wranglerPath.endsWith(".jsonc")) {
		throw new Error(
			"wrangler.jsonc not found. D1 bindings require wrangler.jsonc format.",
		);
	}

	const anchorService = new AnchorService();

	// Check if anchor exists
	const hasAnchor = await anchorService.hasAnchor(
		wranglerPath,
		BINDING_ANCHORS.D1,
	);
	if (!hasAnchor) {
		throw new Error(
			"Missing D1 anchor block in wrangler.jsonc. Your project may be outdated.",
		);
	}

	// Build D1 binding entry
	const d1Binding = databaseId
		? `"d1_databases": [
		{
			"binding": "${bindingName}",
			"database_name": "${databaseName}",
			"database_id": "${databaseId}"
		}
	],`
		: `"d1_databases": [
		{
			"binding": "${bindingName}",
			"database_name": "${databaseName}",
			"database_id": "TODO: Run 'wrangler d1 create ${databaseName}' and add the ID here"
		}
	],`;

	// Insert at D1 anchor
	const result = await anchorService.insertAtAnchor(
		wranglerPath,
		BINDING_ANCHORS.D1,
		d1Binding,
		{ indent: "\t" },
	);

	return result.modified;
}

/**
 * Add R2 bucket binding to wrangler.jsonc using anchor service
 *
 * @param cwd - Project root directory
 * @param bindingName - Binding name (e.g., MY_BUCKET)
 * @param bucketName - Bucket name (e.g., my-bucket)
 * @param previewBucketName - Optional preview bucket name
 * @returns True if binding was added
 */
export async function addR2Binding(
	cwd: string,
	bindingName: string,
	bucketName: string,
	previewBucketName?: string,
): Promise<boolean> {
	const wranglerPath = getWranglerConfigPath(cwd);

	if (!wranglerPath || !wranglerPath.endsWith(".jsonc")) {
		throw new Error(
			"wrangler.jsonc not found. R2 bindings require wrangler.jsonc format.",
		);
	}

	const anchorService = new AnchorService();

	// Check if anchor exists
	const hasAnchor = await anchorService.hasAnchor(
		wranglerPath,
		BINDING_ANCHORS.R2,
	);
	if (!hasAnchor) {
		throw new Error(
			"Missing R2 anchor block in wrangler.jsonc. Your project may be outdated.",
		);
	}

	// Build R2 binding entry
	let r2Binding: string;
	if (previewBucketName) {
		r2Binding = `"r2_buckets": [
		{
			"binding": "${bindingName}",
			"bucket_name": "${bucketName}",
			"preview_bucket_name": "${previewBucketName}"
		}
	],`;
	} else {
		r2Binding = `"r2_buckets": [
		{
			"binding": "${bindingName}",
			"bucket_name": "${bucketName}"
		}
	],`;
	}

	// Insert at R2 anchor
	const result = await anchorService.insertAtAnchor(
		wranglerPath,
		BINDING_ANCHORS.R2,
		r2Binding,
		{ indent: "\t" },
	);

	return result.modified;
}

/**
 * Add helper import to src/index.ts using anchor service
 *
 * @param cwd - Project root directory
 * @param importStatement - Import statement to add
 * @returns True if import was added
 */
export async function addBindingImport(
	cwd: string,
	importStatement: string,
): Promise<boolean> {
	const indexPath = join(cwd, "src", "index.ts");

	if (!existsSync(indexPath)) {
		throw new Error("src/index.ts not found");
	}

	const anchorService = new AnchorService();

	// Check if anchor exists
	const hasAnchor = await anchorService.hasAnchor(
		indexPath,
		BINDING_ANCHORS.IMPORTS,
	);
	if (!hasAnchor) {
		throw new Error(
			"Missing bindings import anchor in src/index.ts. Your project may be outdated.",
		);
	}

	// Read current file content to get existing imports
	const fileContent = await readFile(indexPath, "utf-8");

	// Extract current content between anchors
	const anchor = BINDING_ANCHORS.IMPORTS;
	const startIdx = fileContent.indexOf(anchor.startMarker);
	const endIdx = fileContent.indexOf(anchor.endMarker);

	if (startIdx === -1 || endIdx === -1) {
		throw new Error("Anchor markers not found in src/index.ts");
	}

	const currentContent = fileContent
		.slice(startIdx + anchor.startMarker.length, endIdx)
		.trim();

	// Check if import already exists (avoid duplicates)
	if (currentContent.includes(importStatement.trim())) {
		return false; // Already present, no modification needed
	}

	// Build new content with all imports
	let newContent: string;
	if (currentContent === "" || currentContent.startsWith("//")) {
		// Anchor is empty or only has comments
		newContent = importStatement;
	} else {
		// Append new import to existing imports
		newContent = currentContent + "\n" + importStatement;
	}

	// Insert with force=true to overwrite existing content
	const result = await anchorService.insertAtAnchor(
		indexPath,
		BINDING_ANCHORS.IMPORTS,
		newContent,
		{ force: true },
	);

	return result.modified;
}
