/**
 * Integration test for progress reporter in new-server command
 *
 * Run with: npx tsx --test test/integration/progress-reporter.e2e.ts
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getCliPath(): string {
	return join(__dirname, "../../bin/mcp-server-kit.js");
}

test("Progress reporter outputs NDJSON in JSON mode", async () => {
	const testDir = await mkdtemp(join(tmpdir(), "mcp-progress-test-"));
	const cliPath = getCliPath();
	const projectName = `test-progress-json-${Date.now()}`;

	try {
		const command = `node "${cliPath}" new server --name ${projectName} --dev --no-install --output "${testDir}" --json`;
		const result = await execAsync(command);

		// Split output into lines
		const lines = result.stdout.split("\n");

		// Find all NDJSON progress events (single-line JSON with 'type' field)
		const progressEvents: any[] = [];
		let jsonBuffer = "";
		let inMultilineJson = false;

		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed) continue;

			// Try to parse as single-line JSON
			try {
				const parsed = JSON.parse(trimmed);
				if (parsed.type !== undefined) {
					// This is a progress event
					progressEvents.push(parsed);
				}
			} catch {
				// Not single-line JSON, might be part of multiline final result
				// Skip multiline JSON fragments
			}
		}

		// Verify we got progress events
		assert.ok(progressEvents.length > 0, "Should have progress events");

		// Verify start event exists
		const startEvent = progressEvents.find((e) => e.type === "start");
		assert.ok(startEvent, "Should have start event");
		assert.ok(startEvent.totalSteps > 0, "Should have totalSteps");
		assert.strictEqual(startEvent.completedSteps, 0, "Should start with 0 completed");
		assert.match(startEvent.timestamp, /^\d{4}-\d{2}-\d{2}T/, "Should have ISO timestamp");

		// Verify step_update events exist
		const stepUpdates = progressEvents.filter((e) => e.type === "step_update");
		assert.ok(stepUpdates.length > 0, "Should have step updates");

		// Each step update should have step details
		for (const update of stepUpdates) {
			assert.ok(update.step, "Update should have step");
			assert.match(update.step.id, /^step-\d+$/, "Step should have numeric ID");
			assert.ok(update.step.description, "Step should have description");
			assert.ok(
				["pending", "in_progress", "completed", "failed"].includes(update.step.status),
				`Step status should be valid: ${update.step.status}`
			);
			assert.match(update.timestamp, /^\d{4}-\d{2}-\d{2}T/, "Update should have ISO timestamp");
		}

		// Verify complete event exists
		const completeEvent = progressEvents.find((e) => e.type === "complete");
		assert.ok(completeEvent, "Should have complete event");
		assert.strictEqual(
			completeEvent.completedSteps,
			completeEvent.totalSteps,
			"All steps should be completed"
		);

		// Verify final result is separate JSON (not a progress event)
		// The final result is the multiline JSON at the end
		// Find where progress events end
		let lastProgressIndex = -1;
		for (let i = lines.length - 1; i >= 0; i--) {
			try {
				const parsed = JSON.parse(lines[i].trim());
				if (parsed.type !== undefined) {
					lastProgressIndex = i;
					break;
				}
			} catch {
				// Continue searching
			}
		}

		// Join all lines after the last progress event
		const finalJsonLines = lines.slice(lastProgressIndex + 1).filter((l) => l.trim());
		const finalJsonStr = finalJsonLines.join("\n");
		const finalResult = JSON.parse(finalJsonStr);

		assert.strictEqual(finalResult.type, undefined, "Final result should not be a progress event");
		assert.strictEqual(finalResult.success, true, "Should succeed");
		assert.strictEqual(finalResult.projectName, projectName, "Should have correct project name");

		console.log("✅ JSON mode progress test passed");
	} finally {
		await rm(testDir, { recursive: true, force: true });
	}
});

test("Progress reporter outputs formatted text", async () => {
	const testDir = await mkdtemp(join(tmpdir(), "mcp-progress-test-"));
	const cliPath = getCliPath();
	const projectName = `test-progress-text-${Date.now()}`;

	try {
		const command = `node "${cliPath}" new server --name ${projectName} --dev --no-install --output "${testDir}"`;
		const result = await execAsync(command);

		// Verify text mode output includes progress indicators
		assert.match(result.stdout, /📋 Starting operation/, "Should show starting message");
		assert.match(result.stdout, /✅ Operation completed in/, "Should show completion message");

		// Verify step descriptions are shown
		assert.match(result.stdout, /Validating configuration/, "Should show validation step");
		assert.match(result.stdout, /Loading template/, "Should show template loading");
		assert.match(result.stdout, /Creating project structure/, "Should show project creation");
		assert.match(result.stdout, /Finalizing project/, "Should show finalization");

		// Verify final success message
		assert.match(result.stdout, new RegExp(`Successfully created ${projectName}`), "Should show success");

		console.log("✅ Text mode progress test passed");
	} finally {
		await rm(testDir, { recursive: true, force: true });
	}
});

test("Progress reporter tracks install steps", async () => {
	const testDir = await mkdtemp(join(tmpdir(), "mcp-progress-test-"));
	const cliPath = getCliPath();
	const projectName = `test-progress-install-${Date.now()}`;

	try {
		const command = `node "${cliPath}" new server --name ${projectName} --dev --output "${testDir}" --json`;
		const result = await execAsync(command);

		// Parse progress events
		const lines = result.stdout.split("\n").filter((line) => line.trim());
		const progressEvents = lines
			.filter((line) => {
				try {
					const parsed = JSON.parse(line);
					return parsed.type !== undefined;
				} catch {
					return false;
				}
			})
			.map((line) => JSON.parse(line));

		// With --install, should have additional steps
		const startEvent = progressEvents.find((e) => e.type === "start");
		assert.ok(startEvent.totalSteps >= 5, "Should have at least 5 steps with install");

		// Verify dependency installation steps are mentioned
		const stepUpdates = progressEvents.filter((e) => e.type === "step_update");
		const stepDescriptions = stepUpdates.map((u) => u.step?.description || "");

		assert.ok(
			stepDescriptions.includes("Installing dependencies"),
			"Should have install step"
		);
		assert.ok(
			stepDescriptions.includes("Running post-install commands"),
			"Should have post-install step"
		);

		console.log("✅ Install steps tracking test passed");
	} finally {
		await rm(testDir, { recursive: true, force: true });
	}
});

console.log("\n🚀 Running progress reporter integration tests...\n");
