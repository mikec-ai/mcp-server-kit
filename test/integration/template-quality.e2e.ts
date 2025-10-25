/**
 * Template Quality Integration Tests
 *
 * Ensures that all templates:
 * 1. Can be scaffolded successfully
 * 2. Have valid TypeScript code (no compilation errors)
 * 3. Pass unit tests
 * 4. Pass validation checks
 * 5. Example tools work correctly
 *
 * Run with: npm run test:templates
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Test result for a template
 */
interface TemplateTestResult {
	template: string;
	passed: boolean;
	steps: {
		scaffold: { passed: boolean; error?: string };
		install: { passed: boolean; error?: string };
		typeCheck: { passed: boolean; error?: string };
		unitTests: { passed: boolean; error?: string };
		validate: { passed: boolean; error?: string };
	};
}

/**
 * Get path to mcp-server-kit CLI
 */
function getCliPath(): string {
	return join(__dirname, "../../bin/mcp-server-kit.js");
}

/**
 * Test a single template
 */
async function testTemplate(
	templateId: string,
	projectName: string
): Promise<TemplateTestResult> {
	const result: TemplateTestResult = {
		template: templateId,
		passed: false,
		steps: {
			scaffold: { passed: false },
			install: { passed: false },
			typeCheck: { passed: false },
			unitTests: { passed: false },
			validate: { passed: false },
		},
	};

	// Create temp directory
	const tempDir = await mkdtemp(join(tmpdir(), "mcp-template-test-"));
	const projectDir = join(tempDir, projectName);
	const cliPath = getCliPath();

	try {
		// Step 1: Scaffold project
		console.log(`  [1/5] Scaffolding ${templateId}...`);
		try {
			await execAsync(
				`node "${cliPath}" new server --name ${projectName} --template ${templateId} --no-install`,
				{ cwd: tempDir }
			);
			result.steps.scaffold.passed = true;
		} catch (error) {
			result.steps.scaffold.error = error instanceof Error ? error.message : String(error);
			return result;
		}

		// Step 2: Install dependencies
		console.log(`  [2/5] Installing dependencies...`);
		try {
			// Remove mcp-server-kit from package.json for local testing
			const packageJsonPath = join(projectDir, "package.json");
			const packageJsonContent = await readFile(packageJsonPath, "utf-8");
			const packageJson = JSON.parse(packageJsonContent);
			if (packageJson.devDependencies && packageJson.devDependencies["mcp-server-kit"]) {
				delete packageJson.devDependencies["mcp-server-kit"];
				await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), "utf-8");
			}

			// Install dependencies
			await execAsync("npm install", {
				cwd: projectDir,
				env: { ...process.env, NODE_ENV: "test" },
			});

			// Link local mcp-server-kit for testing
			const mcpKitRoot = join(__dirname, "../..");
			await execAsync(`npm link "${mcpKitRoot}"`, {
				cwd: projectDir,
			});

			result.steps.install.passed = true;
		} catch (error) {
			result.steps.install.error = error instanceof Error ? error.message : String(error);
			return result;
		}

		// Step 2.5: Generate Cloudflare types (required before type-check)
		console.log(`  [2.5/5] Generating Cloudflare types...`);
		try {
			await execAsync("npm run cf-typegen", {
				cwd: projectDir,
			});
		} catch (error) {
			// Non-fatal - some templates might not have cf-typegen
			console.log(`    Note: cf-typegen not available or failed (this may be expected for non-Cloudflare templates)`);
		}

		// Step 3: Type check
		console.log(`  [3/5] Type checking...`);
		try {
			await execAsync("npm run type-check", {
				cwd: projectDir,
			});
			result.steps.typeCheck.passed = true;
		} catch (error) {
			result.steps.typeCheck.error = error instanceof Error ? error.message : String(error);
			// Continue - we want to see all errors
		}

		// Step 4: Run unit tests
		console.log(`  [4/5] Running unit tests...`);
		try {
			await execAsync("npm run test:unit", {
				cwd: projectDir,
			});
			result.steps.unitTests.passed = true;
		} catch (error) {
			result.steps.unitTests.error = error instanceof Error ? error.message : String(error);
			// Continue - we want to see all errors
		}

		// Step 5: Validate project
		console.log(`  [5/5] Validating project...`);
		try {
			await execAsync(`node "${cliPath}" validate`, {
				cwd: projectDir,
			});
			result.steps.validate.passed = true;
		} catch (error) {
			result.steps.validate.error = error instanceof Error ? error.message : String(error);
			// Continue - we want to see all errors
		}

		// Check if all steps passed
		result.passed = Object.values(result.steps).every((step) => step.passed);
	} finally {
		// Clean up
		await rm(tempDir, { recursive: true, force: true });
	}

	return result;
}

/**
 * Print test results
 */
function printResults(results: TemplateTestResult[]): void {
	console.log("\n" + "=".repeat(60));
	console.log("Template Quality Test Results");
	console.log("=".repeat(60) + "\n");

	for (const result of results) {
		const icon = result.passed ? "✅" : "❌";
		console.log(`${icon} Template: ${result.template}`);

		for (const [step, data] of Object.entries(result.steps)) {
			const stepIcon = data.passed ? "  ✓" : "  ✗";
			const stepName = step.replace(/([A-Z])/g, " $1").toLowerCase();
			console.log(`${stepIcon} ${stepName}`);
			if (data.error) {
				const errorLines = data.error.split("\n").slice(0, 3);
				for (const line of errorLines) {
					console.log(`      ${line}`);
				}
				if (data.error.split("\n").length > 3) {
					console.log("      ...");
				}
			}
		}
		console.log();
	}

	// Summary
	const passed = results.filter((r) => r.passed).length;
	const total = results.length;
	console.log("=".repeat(60));
	console.log(`Summary: ${passed}/${total} templates passed`);
	console.log("=".repeat(60) + "\n");
}

/**
 * Main test runner
 */
async function main() {
	console.log("🧪 Running Template Quality Tests\n");

	// List of templates to test
	const templates = [
		{ id: "cloudflare-remote", name: "test-cloudflare-remote" },
		// Add more templates here as they're created
	];

	const results: TemplateTestResult[] = [];

	for (const template of templates) {
		console.log(`\nTesting template: ${template.id}`);
		console.log("-".repeat(60));
		const result = await testTemplate(template.id, template.name);
		results.push(result);
	}

	// Print results
	printResults(results);

	// Exit with appropriate code
	const allPassed = results.every((r) => r.passed);
	process.exit(allPassed ? 0 : 1);
}

// Run tests
main().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
