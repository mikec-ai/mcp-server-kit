/**
 * Binding Scaffolding Integration Tests
 *
 * Regression tests for Phase 1 binding infrastructure:
 * 1. KV helper types compile without errors (fixes expirationTtl bug)
 * 2. D1 import is added to src/index.ts (fixes missing import bug)
 * 3. Multiple bindings can coexist
 *
 * Run with: npm run test:templates
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get path to mcp-server-kit CLI
 */
function getCliPath(): string {
	return join(__dirname, "../../bin/mcp-server-kit.js");
}

/**
 * Test KV binding scaffolding and type safety
 */
async function testKVBinding(): Promise<void> {
	console.log("\n🧪 Testing KV binding scaffolding...");

	const tempDir = await mkdtemp(join(tmpdir(), "mcp-kv-test-"));
	const projectName = "test-kv";
	const projectDir = join(tempDir, projectName);
	const cliPath = getCliPath();

	try {
		// Step 1: Scaffold project
		console.log("  [1/4] Scaffolding project...");
		await execAsync(
			`node "${cliPath}" new server --name ${projectName} --dev --output "${tempDir}"`,
			{ cwd: tempDir }
		);

		// Step 2: Add KV binding
		console.log("  [2/4] Adding KV binding...");
		await execAsync(`node "${cliPath}" add binding kv --name MY_CACHE`, {
			cwd: projectDir,
		});

		// Step 3: Verify helper file was created
		console.log("  [3/4] Verifying helper file...");
		const helperPath = join(
			projectDir,
			"src/utils/bindings/kv-my-cache.ts"
		);
		const helperContent = await readFile(helperPath, "utf-8");

		// Check for correct interface (expirationTtl, not ttl)
		if (!helperContent.includes("expirationTtl?: number")) {
			throw new Error(
				"KV helper missing expirationTtl property in KVPutOptions interface"
			);
		}

		// Check for expiration property
		if (!helperContent.includes("expiration?: number")) {
			throw new Error(
				"KV helper missing expiration property in KVPutOptions interface"
			);
		}

		// Check that old 'ttl' property is not present (should be removed)
		if (helperContent.match(/\bttl\?:\s*number/)) {
			throw new Error(
				"KV helper still contains old 'ttl' property (should be 'expirationTtl')"
			);
		}

		// Step 4: Run type-check (this was the critical bug - should not fail)
		console.log("  [4/4] Running type-check...");
		await execAsync("npm run type-check", { cwd: projectDir });

		console.log("  ✅ KV binding test passed!");
	} catch (error) {
		console.error("  ❌ KV binding test failed:");
		console.error(
			`     ${error instanceof Error ? error.message : String(error)}`
		);
		throw error;
	} finally {
		// Cleanup
		await rm(tempDir, { recursive: true, force: true });
	}
}

/**
 * Test D1 binding scaffolding and import addition
 */
async function testD1Binding(): Promise<void> {
	console.log("\n🧪 Testing D1 binding scaffolding...");

	const tempDir = await mkdtemp(join(tmpdir(), "mcp-d1-test-"));
	const projectName = "test-d1";
	const projectDir = join(tempDir, projectName);
	const cliPath = getCliPath();

	try {
		// Step 1: Scaffold project
		console.log("  [1/4] Scaffolding project...");
		await execAsync(
			`node "${cliPath}" new server --name ${projectName} --dev --output "${tempDir}"`,
			{ cwd: tempDir }
		);

		// Step 2: Add D1 binding
		console.log("  [2/4] Adding D1 binding...");
		await execAsync(
			`node "${cliPath}" add binding d1 --name USER_DB --database users`,
			{
				cwd: projectDir,
			}
		);

		// Step 3: Verify helper file was created
		console.log("  [3/4] Verifying helper file and import...");
		const helperPath = join(
			projectDir,
			"src/utils/bindings/d1-user-db.ts"
		);
		const helperContent = await readFile(helperPath, "utf-8");

		if (!helperContent.includes("export class UserDbD1")) {
			throw new Error("D1 helper class not found in generated file");
		}

		// Step 4: Verify import was added to src/index.ts (this was the critical bug)
		const indexPath = join(projectDir, "src/index.ts");
		const indexContent = await readFile(indexPath, "utf-8");

		if (!indexContent.includes('from "./utils/bindings/d1-user-db.js"')) {
			throw new Error(
				"D1 helper import not added to src/index.ts (critical bug!)"
			);
		}

		if (!indexContent.includes("UserDbD1")) {
			throw new Error(
				"D1 helper class name (UserDbD1) not found in import statement"
			);
		}

		// Step 5: Run type-check
		console.log("  [4/4] Running type-check...");
		await execAsync("npm run type-check", { cwd: projectDir });

		console.log("  ✅ D1 binding test passed!");
	} catch (error) {
		console.error("  ❌ D1 binding test failed:");
		console.error(
			`     ${error instanceof Error ? error.message : String(error)}`
		);
		throw error;
	} finally {
		// Cleanup
		await rm(tempDir, { recursive: true, force: true });
	}
}

/**
 * Test multiple bindings can coexist
 */
async function testMultipleBindings(): Promise<void> {
	console.log("\n🧪 Testing multiple bindings...");

	const tempDir = await mkdtemp(join(tmpdir(), "mcp-multi-test-"));
	const projectName = "test-multi";
	const projectDir = join(tempDir, projectName);
	const cliPath = getCliPath();

	try {
		// Step 1: Scaffold project
		console.log("  [1/5] Scaffolding project...");
		await execAsync(
			`node "${cliPath}" new server --name ${projectName} --dev --output "${tempDir}"`,
			{ cwd: tempDir }
		);

		// Step 2: Add KV binding
		console.log("  [2/5] Adding KV binding...");
		await execAsync(
			`node "${cliPath}" add binding kv --name CACHE_ONE`,
			{
				cwd: projectDir,
			}
		);

		// Step 3: Add another KV binding
		console.log("  [3/5] Adding second KV binding...");
		await execAsync(
			`node "${cliPath}" add binding kv --name CACHE_TWO`,
			{
				cwd: projectDir,
			}
		);

		// Step 4: Add D1 binding
		console.log("  [4/5] Adding D1 binding...");
		await execAsync(
			`node "${cliPath}" add binding d1 --name MAIN_DB --database main`,
			{
				cwd: projectDir,
			}
		);

		// Step 5: Verify all imports are present
		console.log("  [5/5] Verifying all imports and running type-check...");
		const indexPath = join(projectDir, "src/index.ts");
		const indexContent = await readFile(indexPath, "utf-8");

		// Check all imports present
		const expectedImports = [
			"CacheOneKV",
			"CacheTwoKV",
			"MainDbD1",
		];

		for (const importName of expectedImports) {
			if (!indexContent.includes(importName)) {
				throw new Error(
					`Import for ${importName} not found in src/index.ts`
				);
			}
		}

		// Run type-check
		await execAsync("npm run type-check", { cwd: projectDir });

		console.log("  ✅ Multiple bindings test passed!");
	} catch (error) {
		console.error("  ❌ Multiple bindings test failed:");
		console.error(
			`     ${error instanceof Error ? error.message : String(error)}`
		);
		throw error;
	} finally {
		// Cleanup
		await rm(tempDir, { recursive: true, force: true });
	}
}

/**
 * Run all binding tests
 */
async function runTests(): Promise<void> {
	console.log("🚀 Running Binding Scaffolding Tests\n");
	console.log("=" .repeat(60));

	let passed = 0;
	let failed = 0;

	const tests = [
		{ name: "KV Binding", fn: testKVBinding },
		{ name: "D1 Binding", fn: testD1Binding },
		{ name: "Multiple Bindings", fn: testMultipleBindings },
	];

	for (const test of tests) {
		try {
			await test.fn();
			passed++;
		} catch (error) {
			failed++;
		}
	}

	console.log("\n" + "=".repeat(60));
	console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);

	if (failed > 0) {
		process.exit(1);
	}
}

// Run tests
runTests().catch((error) => {
	console.error("\n💥 Test suite failed:", error);
	process.exit(1);
});
