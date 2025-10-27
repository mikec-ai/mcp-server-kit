/**
 * Configuration Updater Tests
 *
 * Tests for updating platform-specific configuration files with auth env vars.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
	getRequiredEnvVars,
	updateWranglerConfig,
	updateVercelConfig,
	updateEnvExample,
	removeWranglerAuthConfig,
	removeVercelAuthConfig,
	removeEnvExampleAuthVars,
} from "../../../src/core/commands/shared/config-updater.js";

describe("Configuration Updater", () => {
	const testDir = "/tmp/config-updater-test";

	beforeEach(async () => {
		await mkdir(testDir, { recursive: true });
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	describe("getRequiredEnvVars", () => {
		it("should return Stytch environment variables", () => {
			const vars = getRequiredEnvVars("stytch");

			expect(vars).toEqual(["STYTCH_PROJECT_ID", "STYTCH_SECRET", "STYTCH_ENV"]);
		});

		it("should return Auth0 environment variables", () => {
			const vars = getRequiredEnvVars("auth0");

			expect(vars).toEqual([
				"AUTH0_DOMAIN",
				"AUTH0_CLIENT_ID",
				"AUTH0_CLIENT_SECRET",
				"AUTH0_AUDIENCE",
			]);
		});

		it("should return WorkOS environment variables", () => {
			const vars = getRequiredEnvVars("workos");

			expect(vars).toEqual(["WORKOS_API_KEY", "WORKOS_CLIENT_ID"]);
		});
	});

	describe("updateWranglerConfig", () => {
		const wranglerPath = join(testDir, "wrangler.toml");

		it("should add auth vars to wrangler.toml without [vars] section", async () => {
			const content = `name = "my-mcp-server"
main = "src/index.ts"
compatibility_date = "2024-01-01"
`;
			await writeFile(wranglerPath, content);

			const modified = await updateWranglerConfig(testDir, "stytch");

			expect(modified).toBe(true);

			const result = await readFile(wranglerPath, "utf-8");
			expect(result).toContain("# Authentication Configuration");
			expect(result).toContain('STYTCH_PROJECT_ID = ""');
			expect(result).toContain('STYTCH_SECRET = ""');
			expect(result).toContain('STYTCH_ENV = ""');
		});

		it("should add auth vars to existing [vars] section", async () => {
			const content = `name = "my-mcp-server"

[vars]
PORT = "8080"
`;
			await writeFile(wranglerPath, content);

			const modified = await updateWranglerConfig(testDir, "stytch");

			expect(modified).toBe(true);

			const result = await readFile(wranglerPath, "utf-8");
			expect(result).toContain("[vars]");
			expect(result).toContain('STYTCH_PROJECT_ID = ""');
			expect(result).toContain('PORT = "8080"');
		});

		it("should not modify if auth vars already present", async () => {
			const content = `name = "my-mcp-server"

[vars]
STYTCH_PROJECT_ID = "project-123"
STYTCH_SECRET = "secret-456"
STYTCH_ENV = "test"
`;
			await writeFile(wranglerPath, content);

			const modified = await updateWranglerConfig(testDir, "stytch");

			expect(modified).toBe(false);
		});

		it("should add Auth0 vars", async () => {
			const content = `name = "my-mcp-server"
`;
			await writeFile(wranglerPath, content);

			await updateWranglerConfig(testDir, "auth0");

			const result = await readFile(wranglerPath, "utf-8");
			expect(result).toContain('AUTH0_DOMAIN = ""');
			expect(result).toContain('AUTH0_CLIENT_ID = ""');
			expect(result).toContain('AUTH0_CLIENT_SECRET = ""');
			expect(result).toContain('AUTH0_AUDIENCE = ""');
		});

		it("should add WorkOS vars", async () => {
			const content = `name = "my-mcp-server"
`;
			await writeFile(wranglerPath, content);

			await updateWranglerConfig(testDir, "workos");

			const result = await readFile(wranglerPath, "utf-8");
			expect(result).toContain('WORKOS_API_KEY = ""');
			expect(result).toContain('WORKOS_CLIENT_ID = ""');
		});

		it("should return false if wrangler.toml not found", async () => {
			const modified = await updateWranglerConfig(testDir, "stytch");

			expect(modified).toBe(false);
		});

		it("should preserve existing config", async () => {
			const content = `name = "my-mcp-server"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
API_KEY = "test123"
`;
			await writeFile(wranglerPath, content);

			await updateWranglerConfig(testDir, "stytch");

			const result = await readFile(wranglerPath, "utf-8");
			expect(result).toContain('name = "my-mcp-server"');
			expect(result).toContain('main = "src/index.ts"');
			expect(result).toContain('API_KEY = "test123"');
		});
	});

	describe("updateWranglerConfig - JSONC format", () => {
		const wranglerPath = join(testDir, "wrangler.jsonc");

		it("should add auth vars to wrangler.jsonc without vars section", async () => {
			const content = `{
	"name": "my-mcp-server",
	"main": "src/index.ts",
	"compatibility_date": "2024-01-01"
}`;
			await writeFile(wranglerPath, content);

			const modified = await updateWranglerConfig(testDir, "stytch");

			expect(modified).toBe(true);

			const result = await readFile(wranglerPath, "utf-8");
			const config = JSON.parse(result);
			expect(config.vars).toBeDefined();
			expect(config.vars.STYTCH_PROJECT_ID).toBe("");
			expect(config.vars.STYTCH_SECRET).toBe("");
			expect(config.vars.STYTCH_ENV).toBe("");
		});

		it("should add auth vars to existing vars section", async () => {
			const content = `{
	"name": "my-mcp-server",
	"vars": {
		"PORT": "8080"
	}
}`;
			await writeFile(wranglerPath, content);

			const modified = await updateWranglerConfig(testDir, "stytch");

			expect(modified).toBe(true);

			const result = await readFile(wranglerPath, "utf-8");
			const config = JSON.parse(result);
			expect(config.vars).toBeDefined();
			expect(config.vars.STYTCH_PROJECT_ID).toBe("");
			expect(config.vars.PORT).toBe("8080");
		});

		it("should not modify if auth vars already present", async () => {
			const content = `{
	"name": "my-mcp-server",
	"vars": {
		"STYTCH_PROJECT_ID": "test123"
	}
}`;
			await writeFile(wranglerPath, content);

			const modified = await updateWranglerConfig(testDir, "stytch");

			expect(modified).toBe(false);
		});

		it("should add Auth0 vars", async () => {
			const content = `{
	"name": "my-mcp-server"
}`;
			await writeFile(wranglerPath, content);

			await updateWranglerConfig(testDir, "auth0");

			const result = await readFile(wranglerPath, "utf-8");
			const config = JSON.parse(result);
			expect(config.vars.AUTH0_DOMAIN).toBe("");
			expect(config.vars.AUTH0_CLIENT_ID).toBe("");
			expect(config.vars.AUTH0_CLIENT_SECRET).toBe("");
			expect(config.vars.AUTH0_AUDIENCE).toBe("");
		});

		it("should add WorkOS vars", async () => {
			const content = `{
	"name": "my-mcp-server"
}`;
			await writeFile(wranglerPath, content);

			await updateWranglerConfig(testDir, "workos");

			const result = await readFile(wranglerPath, "utf-8");
			const config = JSON.parse(result);
			expect(config.vars.WORKOS_API_KEY).toBe("");
			expect(config.vars.WORKOS_CLIENT_ID).toBe("");
		});

		it("should preserve existing config", async () => {
			const content = `{
	"name": "my-mcp-server",
	"main": "src/index.ts",
	"compatibility_date": "2024-01-01",
	"vars": {
		"API_KEY": "test123"
	}
}`;
			await writeFile(wranglerPath, content);

			await updateWranglerConfig(testDir, "stytch");

			const result = await readFile(wranglerPath, "utf-8");
			const config = JSON.parse(result);
			expect(config.name).toBe("my-mcp-server");
			expect(config.main).toBe("src/index.ts");
			expect(config.vars.API_KEY).toBe("test123");
			expect(config.vars.STYTCH_PROJECT_ID).toBe("");
		});

		it("should prefer wrangler.jsonc over wrangler.toml", async () => {
			// Create both files
			const tomlPath = join(testDir, "wrangler.toml");
			await writeFile(tomlPath, 'name = "toml-project"');
			await writeFile(wranglerPath, '{"name": "jsonc-project"}');

			await updateWranglerConfig(testDir, "stytch");

			// Should have modified the jsonc file, not toml
			const jsoncResult = await readFile(wranglerPath, "utf-8");
			const config = JSON.parse(jsoncResult);
			expect(config.vars).toBeDefined();

			const tomlResult = await readFile(tomlPath, "utf-8");
			expect(tomlResult).not.toContain("STYTCH");
		});
	});

	describe("updateVercelConfig", () => {
		const vercelPath = join(testDir, "vercel.json");

		it("should create vercel.json if not exists", async () => {
			const modified = await updateVercelConfig(testDir, "stytch");

			expect(modified).toBe(true);
			expect(existsSync(vercelPath)).toBe(true);

			const result = JSON.parse(await readFile(vercelPath, "utf-8"));
			expect(result.env).toHaveProperty("STYTCH_PROJECT_ID");
			expect(result.env).toHaveProperty("STYTCH_SECRET");
			expect(result.env).toHaveProperty("STYTCH_ENV");
		});

		it("should use Vercel secret references", async () => {
			await updateVercelConfig(testDir, "stytch");

			const result = JSON.parse(await readFile(vercelPath, "utf-8"));
			expect(result.env.STYTCH_PROJECT_ID).toBe("@stytch_project_id");
			expect(result.env.STYTCH_SECRET).toBe("@stytch_secret");
			expect(result.env.STYTCH_ENV).toBe("@stytch_env");
		});

		it("should add to existing vercel.json", async () => {
			const config = {
				buildCommand: "npm run build",
				framework: "nextjs",
			};
			await writeFile(vercelPath, JSON.stringify(config));

			await updateVercelConfig(testDir, "auth0");

			const result = JSON.parse(await readFile(vercelPath, "utf-8"));
			expect(result.buildCommand).toBe("npm run build");
			expect(result.framework).toBe("nextjs");
			expect(result.env).toHaveProperty("AUTH0_DOMAIN");
		});

		it("should not modify if auth vars already present", async () => {
			const config = {
				env: {
					STYTCH_PROJECT_ID: "@stytch_project_id",
					STYTCH_SECRET: "@stytch_secret",
				},
			};
			await writeFile(vercelPath, JSON.stringify(config));

			const modified = await updateVercelConfig(testDir, "stytch");

			expect(modified).toBe(false);
		});

		it("should preserve existing env vars", async () => {
			const config = {
				env: {
					DATABASE_URL: "@database_url",
					API_KEY: "@api_key",
				},
			};
			await writeFile(vercelPath, JSON.stringify(config));

			await updateVercelConfig(testDir, "workos");

			const result = JSON.parse(await readFile(vercelPath, "utf-8"));
			expect(result.env.DATABASE_URL).toBe("@database_url");
			expect(result.env.API_KEY).toBe("@api_key");
			expect(result.env.WORKOS_API_KEY).toBe("@workos_api_key");
		});

		it("should format JSON with proper indentation", async () => {
			await updateVercelConfig(testDir, "stytch");

			const content = await readFile(vercelPath, "utf-8");
			expect(content).toContain("  ");
			expect(content).toMatch(/\{\n  "env"/);
		});
	});

	describe("updateEnvExample", () => {
		const envPath = join(testDir, ".env.example");

		it("should create .env.example if not exists", async () => {
			const content = "STYTCH_PROJECT_ID=project-test-123\nSTYTCH_SECRET=secret-test-456";

			const modified = await updateEnvExample(testDir, "stytch", content);

			expect(modified).toBe(true);
			expect(existsSync(envPath)).toBe(true);

			const result = await readFile(envPath, "utf-8");
			expect(result).toContain("STYTCH_PROJECT_ID");
			expect(result).toContain("STYTCH_SECRET");
		});

		it("should append to existing .env.example", async () => {
			await writeFile(envPath, "DATABASE_URL=postgres://localhost\n");

			const authContent = "# Stytch\nSTYTCH_PROJECT_ID=project-test-123";
			await updateEnvExample(testDir, "stytch", authContent);

			const result = await readFile(envPath, "utf-8");
			expect(result).toContain("DATABASE_URL");
			expect(result).toContain("STYTCH_PROJECT_ID");
		});

		it("should not modify if auth vars already present", async () => {
			await writeFile(envPath, "STYTCH_PROJECT_ID=project-123\n");

			const modified = await updateEnvExample(
				testDir,
				"stytch",
				"STYTCH_PROJECT_ID=project-456",
			);

			expect(modified).toBe(false);
		});

		it("should preserve existing content", async () => {
			const existing = "# Database\nDATABASE_URL=postgres://localhost\n\n# API Keys\nAPI_KEY=test123\n";
			await writeFile(envPath, existing);

			await updateEnvExample(testDir, "auth0", "AUTH0_DOMAIN=tenant.auth0.com");

			const result = await readFile(envPath, "utf-8");
			expect(result).toContain("DATABASE_URL");
			expect(result).toContain("API_KEY");
			expect(result).toContain("AUTH0_DOMAIN");
		});
	});

	describe("removeWranglerAuthConfig", () => {
		const wranglerPath = join(testDir, "wrangler.toml");

		it("should remove auth vars from wrangler.toml", async () => {
			const content = `name = "my-server"

[vars]
STYTCH_PROJECT_ID = "project-123"
STYTCH_SECRET = "secret-456"
STYTCH_ENV = "test"
PORT = "8080"
`;
			await writeFile(wranglerPath, content);

			const modified = await removeWranglerAuthConfig(testDir, "stytch");

			expect(modified).toBe(true);

			const result = await readFile(wranglerPath, "utf-8");
			expect(result).not.toContain("STYTCH_PROJECT_ID");
			expect(result).not.toContain("STYTCH_SECRET");
			expect(result).toContain('PORT = "8080"');
		});

		it("should remove auth comment sections", async () => {
			const content = `name = "my-server"

# Authentication Configuration
# Add your stytch credentials here or use wrangler secrets
[vars]
STYTCH_PROJECT_ID = "project-123"
`;
			await writeFile(wranglerPath, content);

			await removeWranglerAuthConfig(testDir, "stytch");

			const result = await readFile(wranglerPath, "utf-8");
			expect(result).not.toContain("Authentication Configuration");
			expect(result).not.toContain("Add your stytch credentials");
		});

		it("should return false if file not found", async () => {
			const modified = await removeWranglerAuthConfig(testDir, "stytch");

			expect(modified).toBe(false);
		});

		it("should return false if no auth vars present", async () => {
			const content = `name = "my-server"

[vars]
PORT = "8080"
`;
			await writeFile(wranglerPath, content);

			const modified = await removeWranglerAuthConfig(testDir, "stytch");

			expect(modified).toBe(false);
		});
	});

	describe("removeWranglerAuthConfig - JSONC format", () => {
		const wranglerPath = join(testDir, "wrangler.jsonc");

		it("should remove auth vars from wrangler.jsonc", async () => {
			const content = `{
	"name": "my-server",
	"vars": {
		"STYTCH_PROJECT_ID": "project-123",
		"STYTCH_SECRET": "secret-456",
		"STYTCH_ENV": "test",
		"DATABASE_URL": "postgres://localhost"
	}
}`;
			await writeFile(wranglerPath, content);

			await removeWranglerAuthConfig(testDir, "stytch");

			const result = await readFile(wranglerPath, "utf-8");
			const config = JSON.parse(result);
			expect(config.vars.STYTCH_PROJECT_ID).toBeUndefined();
			expect(config.vars.STYTCH_SECRET).toBeUndefined();
			expect(config.vars.STYTCH_ENV).toBeUndefined();
			expect(config.vars.DATABASE_URL).toBe("postgres://localhost");
		});

		it("should preserve other vars", async () => {
			const content = `{
	"name": "my-server",
	"vars": {
		"AUTH0_DOMAIN": "example.auth0.com",
		"DATABASE_URL": "postgres://localhost",
		"API_KEY": "test123"
	}
}`;
			await writeFile(wranglerPath, content);

			await removeWranglerAuthConfig(testDir, "auth0");

			const result = await readFile(wranglerPath, "utf-8");
			const config = JSON.parse(result);
			expect(config.vars.AUTH0_DOMAIN).toBeUndefined();
			expect(config.vars.DATABASE_URL).toBe("postgres://localhost");
			expect(config.vars.API_KEY).toBe("test123");
		});

		it("should remove vars section if empty", async () => {
			const content = `{
	"name": "my-server",
	"vars": {
		"WORKOS_API_KEY": "key-123",
		"WORKOS_CLIENT_ID": "client-456"
	}
}`;
			await writeFile(wranglerPath, content);

			await removeWranglerAuthConfig(testDir, "workos");

			const result = await readFile(wranglerPath, "utf-8");
			const config = JSON.parse(result);
			expect(config.vars).toBeUndefined();
		});

		it("should return false if file not found", async () => {
			const modified = await removeWranglerAuthConfig(testDir, "stytch");

			expect(modified).toBe(false);
		});

		it("should return false if no auth vars present", async () => {
			const content = `{
	"name": "my-server",
	"vars": {
		"PORT": "8080"
	}
}`;
			await writeFile(wranglerPath, content);

			const modified = await removeWranglerAuthConfig(testDir, "stytch");

			expect(modified).toBe(false);
		});
	});

	describe("removeVercelAuthConfig", () => {
		const vercelPath = join(testDir, "vercel.json");

		it("should remove auth vars from vercel.json", async () => {
			const config = {
				env: {
					STYTCH_PROJECT_ID: "@stytch_project_id",
					STYTCH_SECRET: "@stytch_secret",
					STYTCH_ENV: "@stytch_env",
					DATABASE_URL: "@database_url",
				},
			};
			await writeFile(vercelPath, JSON.stringify(config));

			const modified = await removeVercelAuthConfig(testDir, "stytch");

			expect(modified).toBe(true);

			const result = JSON.parse(await readFile(vercelPath, "utf-8"));
			expect(result.env.STYTCH_PROJECT_ID).toBeUndefined();
			expect(result.env.STYTCH_SECRET).toBeUndefined();
			expect(result.env.DATABASE_URL).toBe("@database_url");
		});

		it("should remove env section if empty", async () => {
			const config = {
				env: {
					WORKOS_API_KEY: "@workos_api_key",
					WORKOS_CLIENT_ID: "@workos_client_id",
				},
			};
			await writeFile(vercelPath, JSON.stringify(config));

			await removeVercelAuthConfig(testDir, "workos");

			const result = JSON.parse(await readFile(vercelPath, "utf-8"));
			expect(result.env).toBeUndefined();
		});

		it("should return false if file not found", async () => {
			const modified = await removeVercelAuthConfig(testDir, "stytch");

			expect(modified).toBe(false);
		});

		it("should return false if no auth vars present", async () => {
			const config = {
				env: {
					DATABASE_URL: "@database_url",
				},
			};
			await writeFile(vercelPath, JSON.stringify(config));

			const modified = await removeVercelAuthConfig(testDir, "stytch");

			expect(modified).toBe(false);
		});
	});

	describe("removeEnvExampleAuthVars", () => {
		const envPath = join(testDir, ".env.example");

		it("should remove auth vars from .env.example", async () => {
			const content = `DATABASE_URL=postgres://localhost
STYTCH_PROJECT_ID=project-test-123
STYTCH_SECRET=secret-test-456
API_KEY=test123
`;
			await writeFile(envPath, content);

			const modified = await removeEnvExampleAuthVars(testDir, "stytch");

			expect(modified).toBe(true);

			const result = await readFile(envPath, "utf-8");
			expect(result).not.toContain("STYTCH_PROJECT_ID");
			expect(result).not.toContain("STYTCH_SECRET");
			expect(result).toContain("DATABASE_URL");
			expect(result).toContain("API_KEY");
		});

		it("should remove provider comment sections", async () => {
			const content = `# Stytch Configuration
STYTCH_PROJECT_ID=project-123

# Database
DATABASE_URL=postgres://localhost
`;
			await writeFile(envPath, content);

			await removeEnvExampleAuthVars(testDir, "stytch");

			const result = await readFile(envPath, "utf-8");
			expect(result).not.toContain("Stytch Configuration");
			expect(result).toContain("Database");
		});

		it("should remove setup instructions", async () => {
			const content = `# Stytch Setup Instructions:
# 1. Create account at stytch.com
# 2. Copy credentials

STYTCH_PROJECT_ID=project-123
`;
			await writeFile(envPath, content);

			await removeEnvExampleAuthVars(testDir, "stytch");

			const result = await readFile(envPath, "utf-8");
			expect(result).not.toContain("Setup Instructions");
			expect(result).not.toContain("Create account");
		});

		it("should clean up extra blank lines", async () => {
			const content = `DATABASE_URL=postgres://localhost


STYTCH_PROJECT_ID=project-123


API_KEY=test123
`;
			await writeFile(envPath, content);

			await removeEnvExampleAuthVars(testDir, "stytch");

			const result = await readFile(envPath, "utf-8");
			expect(result).not.toMatch(/\n{3,}/);
		});

		it("should return false if file not found", async () => {
			const modified = await removeEnvExampleAuthVars(testDir, "stytch");

			expect(modified).toBe(false);
		});

		it("should return false if no auth vars present", async () => {
			await writeFile(envPath, "DATABASE_URL=postgres://localhost\n");

			const modified = await removeEnvExampleAuthVars(testDir, "stytch");

			expect(modified).toBe(false);
		});
	});

	describe("Integration: Config Update and Removal", () => {
		it("should add and remove Cloudflare config", async () => {
			const wranglerPath = join(testDir, "wrangler.toml");
			const content = `name = "my-server"
main = "src/index.ts"
`;
			await writeFile(wranglerPath, content);

			// Add config
			await updateWranglerConfig(testDir, "auth0");

			let result = await readFile(wranglerPath, "utf-8");
			expect(result).toContain("AUTH0_DOMAIN");

			// Remove config
			await removeWranglerAuthConfig(testDir, "auth0");

			result = await readFile(wranglerPath, "utf-8");
			expect(result).not.toContain("AUTH0_DOMAIN");
			expect(result).toContain('name = "my-server"');
		});

		it("should add and remove Vercel config", async () => {
			const vercelPath = join(testDir, "vercel.json");

			// Add config
			await updateVercelConfig(testDir, "workos");

			let result = JSON.parse(await readFile(vercelPath, "utf-8"));
			expect(result.env.WORKOS_API_KEY).toBeDefined();

			// Remove config
			await removeVercelAuthConfig(testDir, "workos");

			result = JSON.parse(await readFile(vercelPath, "utf-8"));
			expect(result.env).toBeUndefined();
		});

		it("should add and remove .env.example vars", async () => {
			const envPath = join(testDir, ".env.example");

			// Add config
			await updateEnvExample(testDir, "stytch", "STYTCH_PROJECT_ID=test\nSTYTCH_SECRET=secret");

			let result = await readFile(envPath, "utf-8");
			expect(result).toContain("STYTCH_PROJECT_ID");

			// Remove config
			await removeEnvExampleAuthVars(testDir, "stytch");

			result = await readFile(envPath, "utf-8");
			expect(result).not.toContain("STYTCH_PROJECT_ID");
		});
	});
});
