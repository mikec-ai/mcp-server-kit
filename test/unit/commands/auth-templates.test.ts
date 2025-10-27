/**
 * Auth Template Generator Tests
 *
 * Tests for generating authentication code templates.
 */

import { describe, it, expect } from "vitest";
import {
	generateAuthTypesTemplate,
	generateAuthConfigTemplate,
	generateStytchProviderTemplate,
	generateAuth0ProviderTemplate,
	generateWorkOSProviderTemplate,
	generateEnvExampleTemplate,
} from "../../../src/core/commands/shared/auth-templates.js";

describe("Auth Template Generators", () => {
	describe("generateAuthTypesTemplate", () => {
		it("should generate valid TypeScript types", () => {
			const template = generateAuthTypesTemplate();

			expect(template).toContain("export interface AuthProvider");
			expect(template).toContain("export interface UserContext");
			expect(template).toContain("export interface AuthServerMetadata");
			expect(template).toContain("export class AuthenticationError");
		});

		it("should include all required methods in AuthProvider interface", () => {
			const template = generateAuthTypesTemplate();

			expect(template).toContain("validateToken");
			expect(template).toContain("getMetadata");
			expect(template).toContain("getRequiredEnvVars");
		});

		it("should include user context properties", () => {
			const template = generateAuthTypesTemplate();

			expect(template).toContain("userId");
			expect(template).toContain("email?");
			expect(template).toContain("name?");
			expect(template).toContain("scopes?");
			expect(template).toContain("metadata?");
		});

		it("should include auth server metadata properties", () => {
			const template = generateAuthTypesTemplate();

			expect(template).toContain("issuer");
			expect(template).toContain("authorization_endpoint");
			expect(template).toContain("token_endpoint");
			expect(template).toContain("registration_endpoint?");
			expect(template).toContain("scopes_supported?");
		});

		it("should include AuthenticationError class", () => {
			const template = generateAuthTypesTemplate();

			expect(template).toContain("class AuthenticationError");
			expect(template).toContain("extends Error");
			expect(template).toContain("public code: string");
		});
	});

	describe("generateAuthConfigTemplate", () => {
		it("should generate config for Stytch", () => {
			const template = generateAuthConfigTemplate("stytch");

			expect(template).toContain("StytchProvider");
			expect(template).toContain('from "./providers/stytch.js"');
			expect(template).toContain("new StytchProvider()");
		});

		it("should generate config for Auth0", () => {
			const template = generateAuthConfigTemplate("auth0");

			expect(template).toContain("Auth0Provider");
			expect(template).toContain('from "./providers/auth0.js"');
			expect(template).toContain("new Auth0Provider()");
		});

		it("should generate config for WorkOS", () => {
			const template = generateAuthConfigTemplate("workos");

			expect(template).toContain("WorkosProvider");
			expect(template).toContain('from "./providers/workos.js"');
			expect(template).toContain("new WorkosProvider()");
		});

		it("should include getAuthProvider function", () => {
			const template = generateAuthConfigTemplate("stytch");

			expect(template).toContain("export function getAuthProvider");
			expect(template).toContain("return new");
		});

		it("should include validateAuthEnv function", () => {
			const template = generateAuthConfigTemplate("stytch");

			expect(template).toContain("export function validateAuthEnv");
			expect(template).toContain("getRequiredEnvVars()");
			expect(template).toContain("Missing required environment variable");
		});
	});

	describe("generateStytchProviderTemplate", () => {
		it("should implement AuthProvider interface", () => {
			const template = generateStytchProviderTemplate();

			expect(template).toContain("export class StytchProvider");
			expect(template).toContain("implements AuthProvider");
		});

		it("should have name property", () => {
			const template = generateStytchProviderTemplate();

			expect(template).toContain('name = "stytch"');
		});

		it("should implement validateToken method", () => {
			const template = generateStytchProviderTemplate();

			expect(template).toContain("async validateToken");
			expect(template).toContain("token: string");
			expect(template).toContain("env: Env");
			expect(template).toContain("Promise<UserContext>");
		});

		it("should use Stytch API endpoint", () => {
			const template = generateStytchProviderTemplate();

			expect(template).toContain("api.stytch.com");
			expect(template).toContain("/v1/sessions/authenticate");
		});

		it("should implement getMetadata method", () => {
			const template = generateStytchProviderTemplate();

			expect(template).toContain("getMetadata(env: Env)");
			expect(template).toContain("AuthServerMetadata");
			expect(template).toContain("STYTCH_PROJECT_ID");
		});

		it("should implement getRequiredEnvVars method", () => {
			const template = generateStytchProviderTemplate();

			expect(template).toContain("getRequiredEnvVars()");
			expect(template).toContain("STYTCH_PROJECT_ID");
			expect(template).toContain("STYTCH_SECRET");
		});

		it("should throw AuthenticationError on invalid token", () => {
			const template = generateStytchProviderTemplate();

			expect(template).toContain("AuthenticationError");
			expect(template).toContain("Invalid or expired token");
			expect(template).toContain("invalid_token");
		});

		it("should handle test and live environments", () => {
			const template = generateStytchProviderTemplate();

			expect(template).toContain("STYTCH_ENV");
			expect(template).toContain("live");
			expect(template).toContain("test.stytch.com");
		});
	});

	describe("generateAuth0ProviderTemplate", () => {
		it("should implement AuthProvider interface", () => {
			const template = generateAuth0ProviderTemplate();

			expect(template).toContain("export class Auth0Provider");
			expect(template).toContain("implements AuthProvider");
		});

		it("should have name property", () => {
			const template = generateAuth0ProviderTemplate();

			expect(template).toContain('name = "auth0"');
		});

		it("should use Auth0 API endpoint", () => {
			const template = generateAuth0ProviderTemplate();

			expect(template).toContain("AUTH0_DOMAIN");
			expect(template).toContain("/userinfo");
		});

		it("should require Auth0 environment variables", () => {
			const template = generateAuth0ProviderTemplate();

			expect(template).toContain("AUTH0_DOMAIN");
			expect(template).toContain("AUTH0_CLIENT_ID");
			expect(template).toContain("AUTH0_CLIENT_SECRET");
			expect(template).toContain("AUTH0_AUDIENCE");
		});
	});

	describe("generateWorkOSProviderTemplate", () => {
		it("should implement AuthProvider interface", () => {
			const template = generateWorkOSProviderTemplate();

			expect(template).toContain("export class WorkosProvider");
			expect(template).toContain("implements AuthProvider");
		});

		it("should have name property", () => {
			const template = generateWorkOSProviderTemplate();

			expect(template).toContain('name = "workos"');
		});

		it("should use WorkOS API endpoint", () => {
			const template = generateWorkOSProviderTemplate();

			expect(template).toContain("api.workos.com");
			expect(template).toContain("/user_management/users/me");
		});

		it("should require WorkOS environment variables", () => {
			const template = generateWorkOSProviderTemplate();

			expect(template).toContain("WORKOS_API_KEY");
			expect(template).toContain("WORKOS_CLIENT_ID");
		});
	});

	describe("generateEnvExampleTemplate", () => {
		describe("Stytch", () => {
			it("should generate Stytch .env.example", () => {
				const template = generateEnvExampleTemplate("stytch");

				expect(template).toContain("STYTCH_PROJECT_ID");
				expect(template).toContain("STYTCH_SECRET");
				expect(template).toContain("STYTCH_ENV");
			});

			it("should include setup instructions", () => {
				const template = generateEnvExampleTemplate("stytch");

				expect(template).toContain("Stytch Setup Instructions");
				expect(template).toContain("stytch.com");
				expect(template).toContain("Connected Apps");
			});

			it("should show placeholder values", () => {
				const template = generateEnvExampleTemplate("stytch");

				expect(template).toContain("project-test-");
				expect(template).toContain("secret-test-");
			});
		});

		describe("Auth0", () => {
			it("should generate Auth0 .env.example", () => {
				const template = generateEnvExampleTemplate("auth0");

				expect(template).toContain("AUTH0_DOMAIN");
				expect(template).toContain("AUTH0_CLIENT_ID");
				expect(template).toContain("AUTH0_CLIENT_SECRET");
				expect(template).toContain("AUTH0_AUDIENCE");
			});

			it("should include setup instructions", () => {
				const template = generateEnvExampleTemplate("auth0");

				expect(template).toContain("Auth0 Setup Instructions");
				expect(template).toContain("auth0.com");
			});

			it("should show placeholder format", () => {
				const template = generateEnvExampleTemplate("auth0");

				expect(template).toContain("your-tenant.auth0.com");
				expect(template).toContain("xxxxxxxxxxxxxxxxxxxx");
			});
		});

		describe("WorkOS", () => {
			it("should generate WorkOS .env.example", () => {
				const template = generateEnvExampleTemplate("workos");

				expect(template).toContain("WORKOS_API_KEY");
				expect(template).toContain("WORKOS_CLIENT_ID");
			});

			it("should include setup instructions", () => {
				const template = generateEnvExampleTemplate("workos");

				expect(template).toContain("WorkOS Setup Instructions");
				expect(template).toContain("workos.com");
			});

			it("should show placeholder format", () => {
				const template = generateEnvExampleTemplate("workos");

				expect(template).toContain("sk_test_");
				expect(template).toContain("client_");
			});
		});
	});

	describe("Template Consistency", () => {
		it("all providers should implement same interface", () => {
			const stytch = generateStytchProviderTemplate();
			const auth0 = generateAuth0ProviderTemplate();
			const workos = generateWorkOSProviderTemplate();

			// All should implement AuthProvider
			expect(stytch).toContain("implements AuthProvider");
			expect(auth0).toContain("implements AuthProvider");
			expect(workos).toContain("implements AuthProvider");

			// All should have required methods
			for (const template of [stytch, auth0, workos]) {
				expect(template).toContain("validateToken");
				expect(template).toContain("getMetadata");
				expect(template).toContain("getRequiredEnvVars");
			}
		});

		it("all providers should throw AuthenticationError", () => {
			const stytch = generateStytchProviderTemplate();
			const auth0 = generateAuth0ProviderTemplate();
			const workos = generateWorkOSProviderTemplate();

			for (const template of [stytch, auth0, workos]) {
				expect(template).toContain("AuthenticationError");
			}
		});

		it("all providers should import from types", () => {
			const stytch = generateStytchProviderTemplate();
			const auth0 = generateAuth0ProviderTemplate();
			const workos = generateWorkOSProviderTemplate();

			for (const template of [stytch, auth0, workos]) {
				expect(template).toContain('from "../types.js"');
				expect(template).toContain("AuthProvider");
				expect(template).toContain("UserContext");
				expect(template).toContain("AuthServerMetadata");
			}
		});
	});
});
