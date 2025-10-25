/**
 * Integration Test CLI
 *
 * Runs integration tests using the mcp-server-kit test harness.
 */

import { TestRunner, loadTestSpecs } from "mcp-server-kit/harness";
import {
	formatJsonReport,
	formatConsoleReport,
} from "mcp-server-kit/harness";
import { createClient, DEFAULT_SERVER_URL } from "./config.js";
import { glob } from "glob";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Main CLI entry point
 */
async function main() {
	const args = process.argv.slice(2);
	const command = args[0];

	if (command === "run") {
		await runTests(args.slice(1));
	} else if (command === "list") {
		await listTests();
	} else {
		console.log("Usage: tsx test/integration/cli.ts <command>");
		console.log("");
		console.log("Commands:");
		console.log("  run [patterns...]  Run integration tests");
		console.log("  list               List available tests");
		process.exit(1);
	}
}

/**
 * Run integration tests
 */
async function runTests(args: string[]) {
	// Parse flags
	const jsonOutput = args.includes("--json");
	const simpleOutput = args.includes("--simple");
	const verbose = args.includes("--verbose");

	// Get patterns (everything that's not a flag)
	const patterns = args.filter((arg) => !arg.startsWith("--"));

	// Default pattern if none provided
	const defaultPattern = "specs/**/*.yaml";
	const searchPatterns =
		patterns.length > 0 ? patterns : [defaultPattern];

	// Find test spec files
	const specsDir = join(__dirname, "specs");
	const files: string[] = [];

	for (const pattern of searchPatterns) {
		const matches = await glob(pattern, {
			cwd: specsDir,
			absolute: true,
		});
		files.push(...matches);
	}

	if (files.length === 0) {
		console.error("No test specs found");
		process.exit(1);
	}

	// Load test specs
	const specs = await loadTestSpecs(files);

	// Create client and runner
	const client = createClient();
	const runner = new TestRunner(client);

	try {
		// Connect to server
		await runner.connect();

		// Run tests
		const results = await runner.runTests(specs, DEFAULT_SERVER_URL);

		// Output results
		if (jsonOutput) {
			console.log(formatJsonReport(results));
		} else if (simpleOutput) {
			if (results.summary.failed === 0) {
				console.log(`✅ All ${results.summary.passed} tests passed`);
			} else {
				console.log(`❌ ${results.summary.failed} tests failed`);
			}
		} else {
			console.log(formatConsoleReport(results));
		}

		// Disconnect
		await runner.disconnect();

		// Exit with appropriate code
		process.exit(results.summary.failed > 0 ? 2 : 0);
	} catch (error) {
		console.error("Error running tests:", error);
		await runner.disconnect();
		process.exit(3);
	}
}

/**
 * List available tests
 */
async function listTests() {
	const specsDir = join(__dirname, "specs");
	const files = await glob("**/*.yaml", {
		cwd: specsDir,
		absolute: false,
	});

	console.log("Available test specs:");
	for (const file of files) {
		console.log(`  - ${file}`);
	}
}

// Run main
main().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(3);
});
