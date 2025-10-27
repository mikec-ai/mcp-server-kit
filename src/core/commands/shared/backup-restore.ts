/**
 * Backup and Restore Utilities
 *
 * Provides safe file backup/restore functionality for add-auth command.
 * Creates timestamped backups and supports rollback on failure.
 */

import { cp, rm, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Create a backup of important project files
 *
 * @param cwd - Project root directory
 * @returns Path to backup directory
 */
export async function createBackup(cwd: string): Promise<string> {
	const timestamp = Date.now();
	const backupDir = join(cwd, `.backup-auth-${timestamp}`);

	// Backup src directory
	const srcDir = join(cwd, "src");
	if (existsSync(srcDir)) {
		await cp(srcDir, join(backupDir, "src"), { recursive: true });
	}

	// Backup important config files
	const filesToBackup = [
		"package.json",
		"wrangler.toml",
		"wrangler.jsonc",
		"wrangler.json",
		"vercel.json",
		"next.config.js",
		"next.config.mjs",
		"next.config.ts",
		"README.md",
		".gitignore",
		".env",
		".env.local",
	];

	for (const file of filesToBackup) {
		const filePath = join(cwd, file);
		if (existsSync(filePath)) {
			await cp(filePath, join(backupDir, file));
		}
	}

	return backupDir;
}

/**
 * Restore project from backup directory
 *
 * @param backupDir - Path to backup directory
 * @param cwd - Project root directory
 */
export async function restoreFromBackup(
	backupDir: string,
	cwd: string,
): Promise<void> {
	if (!existsSync(backupDir)) {
		throw new Error(`Backup directory not found: ${backupDir}`);
	}

	// Restore src directory
	const backupSrcDir = join(backupDir, "src");
	if (existsSync(backupSrcDir)) {
		const targetSrcDir = join(cwd, "src");

		// Remove current src directory if it exists
		if (existsSync(targetSrcDir)) {
			await rm(targetSrcDir, { recursive: true, force: true });
		}

		// Restore from backup
		await cp(backupSrcDir, targetSrcDir, { recursive: true });
	}

	// Restore config files
	const backupFiles = await readdir(backupDir);

	for (const file of backupFiles) {
		if (file === "src") {
			continue; // Already handled
		}

		const backupFilePath = join(backupDir, file);
		const targetFilePath = join(cwd, file);

		// Only restore if it's a file, not a directory
		const stats = await stat(backupFilePath);
		if (stats.isFile()) {
			await cp(backupFilePath, targetFilePath);
		}
	}
}

/**
 * Remove backup directory
 *
 * @param backupDir - Path to backup directory
 */
export async function removeBackup(backupDir: string): Promise<void> {
	if (existsSync(backupDir)) {
		await rm(backupDir, { recursive: true, force: true });
	}
}

/**
 * List all backup directories in a project
 *
 * @param cwd - Project root directory
 * @returns Array of backup directory paths
 */
export async function listBackups(cwd: string): Promise<string[]> {
	if (!existsSync(cwd)) {
		return [];
	}

	const entries = await readdir(cwd);
	const backups: string[] = [];

	for (const entry of entries) {
		if (entry.startsWith(".backup-auth-")) {
			const fullPath = join(cwd, entry);
			const stats = await stat(fullPath);

			if (stats.isDirectory()) {
				backups.push(fullPath);
			}
		}
	}

	// Sort by timestamp (newest first)
	return backups.sort().reverse();
}
