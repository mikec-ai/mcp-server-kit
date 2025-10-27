/**
 * Backup and Restore Tests
 *
 * Tests for safe file backup and restore functionality.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm, readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
	createBackup,
	restoreFromBackup,
	removeBackup,
	listBackups,
} from "../../../src/core/commands/shared/backup-restore.js";

describe("Backup and Restore", () => {
	const testDir = "/tmp/backup-restore-test";

	beforeEach(async () => {
		await mkdir(testDir, { recursive: true });
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	describe("createBackup", () => {
		it("should create backup directory with timestamp", async () => {
			// Setup minimal project
			await mkdir(join(testDir, "src"), { recursive: true });
			await writeFile(join(testDir, "src/index.ts"), "original content");

			const backupDir = await createBackup(testDir);

			expect(backupDir).toContain(".backup-auth-");
			expect(existsSync(backupDir)).toBe(true);
		});

		it("should backup src directory", async () => {
			await mkdir(join(testDir, "src"), { recursive: true });
			await writeFile(join(testDir, "src/index.ts"), "original");
			await writeFile(join(testDir, "src/server.ts"), "server");

			const backupDir = await createBackup(testDir);

			expect(existsSync(join(backupDir, "src/index.ts"))).toBe(true);
			expect(existsSync(join(backupDir, "src/server.ts"))).toBe(true);

			const backedUpContent = await readFile(
				join(backupDir, "src/index.ts"),
				"utf-8",
			);
			expect(backedUpContent).toBe("original");
		});

		it("should backup package.json", async () => {
			const pkg = { name: "test", version: "1.0.0" };
			await writeFile(join(testDir, "package.json"), JSON.stringify(pkg));

			const backupDir = await createBackup(testDir);

			expect(existsSync(join(backupDir, "package.json"))).toBe(true);

			const backedUpPkg = JSON.parse(
				await readFile(join(backupDir, "package.json"), "utf-8"),
			);
			expect(backedUpPkg.name).toBe("test");
		});

		it("should backup wrangler.toml", async () => {
			await writeFile(join(testDir, "wrangler.toml"), "name = 'test'");

			const backupDir = await createBackup(testDir);

			expect(existsSync(join(backupDir, "wrangler.toml"))).toBe(true);
		});

		it("should backup vercel.json", async () => {
			await writeFile(join(testDir, "vercel.json"), "{}");

			const backupDir = await createBackup(testDir);

			expect(existsSync(join(backupDir, "vercel.json"))).toBe(true);
		});

		it("should backup README.md", async () => {
			await writeFile(join(testDir, "README.md"), "# Test");

			const backupDir = await createBackup(testDir);

			expect(existsSync(join(backupDir, "README.md"))).toBe(true);
		});

		it("should backup .gitignore", async () => {
			await writeFile(join(testDir, ".gitignore"), "node_modules/");

			const backupDir = await createBackup(testDir);

			expect(existsSync(join(backupDir, ".gitignore"))).toBe(true);
		});

		it("should backup .env files", async () => {
			await writeFile(join(testDir, ".env"), "SECRET=123");
			await writeFile(join(testDir, ".env.local"), "LOCAL=456");

			const backupDir = await createBackup(testDir);

			expect(existsSync(join(backupDir, ".env"))).toBe(true);
			expect(existsSync(join(backupDir, ".env.local"))).toBe(true);
		});

		it("should handle missing src directory", async () => {
			await writeFile(join(testDir, "package.json"), "{}");

			const backupDir = await createBackup(testDir);

			expect(existsSync(backupDir)).toBe(true);
			expect(existsSync(join(backupDir, "package.json"))).toBe(true);
		});

		it("should handle missing config files", async () => {
			await mkdir(join(testDir, "src"));

			const backupDir = await createBackup(testDir);

			expect(existsSync(backupDir)).toBe(true);
			expect(existsSync(join(backupDir, "src"))).toBe(true);
		});

		it("should backup nested directories in src", async () => {
			await mkdir(join(testDir, "src/tools"), { recursive: true });
			await writeFile(join(testDir, "src/tools/health.ts"), "health tool");

			const backupDir = await createBackup(testDir);

			expect(existsSync(join(backupDir, "src/tools/health.ts"))).toBe(true);
		});
	});

	describe("restoreFromBackup", () => {
		it("should restore src directory", async () => {
			// Create backup
			await mkdir(join(testDir, "src"));
			await writeFile(join(testDir, "src/index.ts"), "original");
			const backupDir = await createBackup(testDir);

			// Modify current files
			await writeFile(join(testDir, "src/index.ts"), "modified");

			// Restore
			await restoreFromBackup(backupDir, testDir);

			const restored = await readFile(join(testDir, "src/index.ts"), "utf-8");
			expect(restored).toBe("original");
		});

		it("should restore package.json", async () => {
			const originalPkg = { name: "original", version: "1.0.0" };
			await writeFile(join(testDir, "package.json"), JSON.stringify(originalPkg));
			const backupDir = await createBackup(testDir);

			// Modify
			const modifiedPkg = { name: "modified", version: "2.0.0" };
			await writeFile(join(testDir, "package.json"), JSON.stringify(modifiedPkg));

			// Restore
			await restoreFromBackup(backupDir, testDir);

			const restored = JSON.parse(
				await readFile(join(testDir, "package.json"), "utf-8"),
			);
			expect(restored.name).toBe("original");
		});

		it("should restore all config files", async () => {
			await writeFile(join(testDir, "wrangler.toml"), "original wrangler");
			await writeFile(join(testDir, "README.md"), "# Original");
			const backupDir = await createBackup(testDir);

			// Modify
			await writeFile(join(testDir, "wrangler.toml"), "modified");
			await writeFile(join(testDir, "README.md"), "# Modified");

			// Restore
			await restoreFromBackup(backupDir, testDir);

			const wrangler = await readFile(join(testDir, "wrangler.toml"), "utf-8");
			const readme = await readFile(join(testDir, "README.md"), "utf-8");

			expect(wrangler).toBe("original wrangler");
			expect(readme).toBe("# Original");
		});

		it("should remove modified files not in backup", async () => {
			await mkdir(join(testDir, "src"));
			await writeFile(join(testDir, "src/original.ts"), "original");
			const backupDir = await createBackup(testDir);

			// Add new file
			await writeFile(join(testDir, "src/new-file.ts"), "new");

			// Restore (should remove new-file.ts)
			await restoreFromBackup(backupDir, testDir);

			expect(existsSync(join(testDir, "src/original.ts"))).toBe(true);
			expect(existsSync(join(testDir, "src/new-file.ts"))).toBe(false);
		});

		it("should throw error if backup directory not found", async () => {
			await expect(
				restoreFromBackup("/nonexistent/backup", testDir),
			).rejects.toThrow("Backup directory not found");
		});

		it("should handle nested directories in src", async () => {
			await mkdir(join(testDir, "src/tools"), { recursive: true });
			await writeFile(join(testDir, "src/tools/health.ts"), "original");
			const backupDir = await createBackup(testDir);

			// Modify
			await writeFile(join(testDir, "src/tools/health.ts"), "modified");

			// Restore
			await restoreFromBackup(backupDir, testDir);

			const restored = await readFile(
				join(testDir, "src/tools/health.ts"),
				"utf-8",
			);
			expect(restored).toBe("original");
		});
	});

	describe("removeBackup", () => {
		it("should remove backup directory", async () => {
			await mkdir(join(testDir, "src"));
			const backupDir = await createBackup(testDir);

			expect(existsSync(backupDir)).toBe(true);

			await removeBackup(backupDir);

			expect(existsSync(backupDir)).toBe(false);
		});

		it("should handle non-existent backup directory", async () => {
			await expect(
				removeBackup("/nonexistent/backup"),
			).resolves.not.toThrow();
		});

		it("should remove nested directories", async () => {
			await mkdir(join(testDir, "src/tools"), { recursive: true });
			await writeFile(join(testDir, "src/tools/health.ts"), "content");
			const backupDir = await createBackup(testDir);

			await removeBackup(backupDir);

			expect(existsSync(backupDir)).toBe(false);
		});
	});

	describe("listBackups", () => {
		it("should list backup directories", async () => {
			await mkdir(join(testDir, "src"));

			const backup1 = await createBackup(testDir);
			// Wait a bit to ensure different timestamp
			await new Promise((resolve) => setTimeout(resolve, 10));
			const backup2 = await createBackup(testDir);

			const backups = await listBackups(testDir);

			expect(backups).toHaveLength(2);
			expect(backups).toContain(backup1);
			expect(backups).toContain(backup2);
		});

		it("should return empty array if no backups", async () => {
			const backups = await listBackups(testDir);

			expect(backups).toEqual([]);
		});

		it("should sort backups by timestamp (newest first)", async () => {
			await mkdir(join(testDir, "src"));

			const backup1 = await createBackup(testDir);
			await new Promise((resolve) => setTimeout(resolve, 10));
			const backup2 = await createBackup(testDir);
			await new Promise((resolve) => setTimeout(resolve, 10));
			const backup3 = await createBackup(testDir);

			const backups = await listBackups(testDir);

			expect(backups[0]).toBe(backup3); // Newest
			expect(backups[1]).toBe(backup2);
			expect(backups[2]).toBe(backup1); // Oldest
		});

		it("should only include .backup-auth-* directories", async () => {
			await mkdir(join(testDir, "src"));
			await mkdir(join(testDir, ".other-backup"));
			await mkdir(join(testDir, "regular-dir"));

			const backup = await createBackup(testDir);

			const backups = await listBackups(testDir);

			expect(backups).toHaveLength(1);
			expect(backups[0]).toBe(backup);
		});

		it("should ignore files with backup pattern", async () => {
			await mkdir(join(testDir, "src"));
			await writeFile(join(testDir, ".backup-auth-file.txt"), "not a dir");

			const backup = await createBackup(testDir);

			const backups = await listBackups(testDir);

			expect(backups).toHaveLength(1);
			expect(backups[0]).toBe(backup);
		});

		it("should return empty array if directory does not exist", async () => {
			const backups = await listBackups("/nonexistent/dir");

			expect(backups).toEqual([]);
		});
	});

	describe("Full Backup/Restore Cycle", () => {
		it("should successfully backup and restore complete project", async () => {
			// Setup complete project structure
			await mkdir(join(testDir, "src/tools"), { recursive: true });
			await mkdir(join(testDir, "src/prompts"), { recursive: true });
			await writeFile(join(testDir, "src/index.ts"), "export default {}");
			await writeFile(join(testDir, "src/tools/health.ts"), "health");
			await writeFile(join(testDir, "src/prompts/review.ts"), "review");
			await writeFile(join(testDir, "package.json"), '{"name":"test"}');
			await writeFile(join(testDir, "wrangler.toml"), "name='test'");
			await writeFile(join(testDir, "README.md"), "# Test");

			// Create backup
			const backupDir = await createBackup(testDir);

			// Modify everything
			await writeFile(join(testDir, "src/index.ts"), "MODIFIED");
			await writeFile(join(testDir, "src/tools/health.ts"), "MODIFIED");
			await rm(join(testDir, "src/prompts/review.ts"));
			await writeFile(join(testDir, "package.json"), '{"name":"modified"}');

			// Restore
			await restoreFromBackup(backupDir, testDir);

			// Verify everything restored
			const index = await readFile(join(testDir, "src/index.ts"), "utf-8");
			const health = await readFile(
				join(testDir, "src/tools/health.ts"),
				"utf-8",
			);
			const review = await readFile(
				join(testDir, "src/prompts/review.ts"),
				"utf-8",
			);
			const pkg = JSON.parse(
				await readFile(join(testDir, "package.json"), "utf-8"),
			);

			expect(index).toBe("export default {}");
			expect(health).toBe("health");
			expect(review).toBe("review");
			expect(pkg.name).toBe("test");

			// Cleanup
			await removeBackup(backupDir);
			expect(existsSync(backupDir)).toBe(false);
		});
	});
});
