/**
 * Auth Template Generators
 *
 * Generates TypeScript code for authentication files:
 * - Auth types and interfaces
 * - Provider configurations
 * - Provider implementations (Stytch, Auth0, WorkOS)
 */

export type AuthProvider = "stytch" | "auth0" | "workos";

/**
 * Generate auth types template (types.ts)
 */
export function generateAuthTypesTemplate(): string {
	return `/**
 * Authentication Types
 *
 * Common interfaces for all auth providers.
 */

export interface AuthProvider {
	name: string;
	validateToken(token: string, env: Env): Promise<UserContext>;
	getMetadata(env: Env): AuthServerMetadata;
	getRequiredEnvVars(): string[];
}

export interface UserContext {
	userId: string;
	email?: string;
	name?: string;
	scopes?: string[];
	metadata?: Record<string, unknown>;
}

export interface AuthServerMetadata {
	issuer: string;
	authorization_endpoint: string;
	token_endpoint: string;
	registration_endpoint?: string;
	scopes_supported?: string[];
}

export class AuthenticationError extends Error {
	constructor(message: string, public code: string) {
		super(message);
		this.name = "AuthenticationError";
	}
}
`;
}

/**
 * Generate auth config template (config.ts)
 */
export function generateAuthConfigTemplate(provider: AuthProvider): string {
	const capitalizedProvider = capitalizeFirst(provider);

	return `/**
 * Authentication Configuration
 *
 * Provides the appropriate auth provider based on environment.
 */

import type { AuthProvider } from "./types.js";
import { ${capitalizedProvider}Provider } from "./providers/${provider}.js";

export function getAuthProvider(env: Env): AuthProvider {
	return new ${capitalizedProvider}Provider();
}

export function validateAuthEnv(env: Env): void {
	const provider = getAuthProvider(env);
	const required = provider.getRequiredEnvVars();

	for (const key of required) {
		if (!env[key]) {
			throw new Error(
				\`Missing required environment variable: \${key}\\n\` +
					\`Please set this in your .env file or wrangler.toml\`,
			);
		}
	}
}
`;
}

/**
 * Generate Stytch provider template
 */
export function generateStytchProviderTemplate(): string {
	return `/**
 * Stytch Authentication Provider
 *
 * Uses Stytch Connected Apps for MCP server authentication.
 * Docs: https://stytch.com/docs/guides/connected-apps/mcp-servers
 */

import type {
	AuthProvider,
	UserContext,
	AuthServerMetadata,
} from "../types.js";
import { AuthenticationError } from "../types.js";

export class StytchProvider implements AuthProvider {
	name = "stytch";

	async validateToken(token: string, env: Env): Promise<UserContext> {
		try {
			// Stytch session authentication
			const response = await fetch(
				"https://api.stytch.com/v1/sessions/authenticate",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: \`Basic \${btoa(\`\${env.STYTCH_PROJECT_ID}:\${env.STYTCH_SECRET}\`)}\`,
					},
					body: JSON.stringify({
						session_token: token,
					}),
				},
			);

			if (!response.ok) {
				throw new AuthenticationError(
					"Invalid or expired token",
					"invalid_token",
				);
			}

			const data = await response.json();

			return {
				userId: data.session.user_id,
				email: data.session.attributes?.email,
				name: data.session.attributes?.name,
				metadata: {
					sessionId: data.session.session_id,
					authenticatedAt: data.session.authenticated_at,
				},
			};
		} catch (error) {
			if (error instanceof AuthenticationError) {
				throw error;
			}
			throw new AuthenticationError(
				"Failed to validate token",
				"validation_failed",
			);
		}
	}

	getMetadata(env: Env): AuthServerMetadata {
		const baseUrl =
			env.STYTCH_ENV === "live"
				? "https://api.stytch.com"
				: "https://test.stytch.com";

		return {
			issuer: \`\${baseUrl}/v1/projects/\${env.STYTCH_PROJECT_ID}\`,
			authorization_endpoint: \`\${baseUrl}/v1/oauth/authorize\`,
			token_endpoint: \`\${baseUrl}/v1/oauth/token\`,
			registration_endpoint: \`\${baseUrl}/v1/oauth/register\`,
			scopes_supported: ["openid", "profile", "email"],
		};
	}

	getRequiredEnvVars(): string[] {
		return ["STYTCH_PROJECT_ID", "STYTCH_SECRET"];
	}
}
`;
}

/**
 * Generate Auth0 provider template
 */
export function generateAuth0ProviderTemplate(): string {
	return `/**
 * Auth0 Authentication Provider
 *
 * Uses Auth0 for enterprise-grade authentication.
 * Docs: https://auth0.com/docs
 */

import type {
	AuthProvider,
	UserContext,
	AuthServerMetadata,
} from "../types.js";
import { AuthenticationError } from "../types.js";

export class Auth0Provider implements AuthProvider {
	name = "auth0";

	async validateToken(token: string, env: Env): Promise<UserContext> {
		try {
			// Verify JWT with Auth0
			const response = await fetch(\`https://\${env.AUTH0_DOMAIN}/userinfo\`, {
				headers: {
					Authorization: \`Bearer \${token}\`,
				},
			});

			if (!response.ok) {
				throw new AuthenticationError(
					"Invalid or expired token",
					"invalid_token",
				);
			}

			const data = await response.json();

			return {
				userId: data.sub,
				email: data.email,
				name: data.name,
				metadata: {
					emailVerified: data.email_verified,
					picture: data.picture,
				},
			};
		} catch (error) {
			if (error instanceof AuthenticationError) {
				throw error;
			}
			throw new AuthenticationError(
				"Failed to validate token",
				"validation_failed",
			);
		}
	}

	getMetadata(env: Env): AuthServerMetadata {
		const domain = env.AUTH0_DOMAIN;

		return {
			issuer: \`https://\${domain}/\`,
			authorization_endpoint: \`https://\${domain}/authorize\`,
			token_endpoint: \`https://\${domain}/oauth/token\`,
			registration_endpoint: \`https://\${domain}/oidc/register\`,
			scopes_supported: ["openid", "profile", "email", "offline_access"],
		};
	}

	getRequiredEnvVars(): string[] {
		return ["AUTH0_DOMAIN", "AUTH0_CLIENT_ID", "AUTH0_CLIENT_SECRET", "AUTH0_AUDIENCE"];
	}
}
`;
}

/**
 * Generate WorkOS provider template
 */
export function generateWorkOSProviderTemplate(): string {
	return `/**
 * WorkOS Authentication Provider
 *
 * Uses WorkOS for B2B/enterprise authentication with SSO support.
 * Docs: https://workos.com/docs
 */

import type {
	AuthProvider,
	UserContext,
	AuthServerMetadata,
} from "../types.js";
import { AuthenticationError } from "../types.js";

export class WorkosProvider implements AuthProvider {
	name = "workos";

	async validateToken(token: string, env: Env): Promise<UserContext> {
		try {
			// Get user profile from WorkOS
			const response = await fetch(
				"https://api.workos.com/user_management/users/me",
				{
					headers: {
						Authorization: \`Bearer \${token}\`,
					},
				},
			);

			if (!response.ok) {
				throw new AuthenticationError(
					"Invalid or expired token",
					"invalid_token",
				);
			}

			const data = await response.json();

			return {
				userId: data.id,
				email: data.email,
				name: \`\${data.first_name} \${data.last_name}\`.trim(),
				metadata: {
					organizationId: data.organization_id,
					emailVerified: data.email_verified,
				},
			};
		} catch (error) {
			if (error instanceof AuthenticationError) {
				throw error;
			}
			throw new AuthenticationError(
				"Failed to validate token",
				"validation_failed",
			);
		}
	}

	getMetadata(env: Env): AuthServerMetadata {
		return {
			issuer: "https://api.workos.com/",
			authorization_endpoint:
				"https://api.workos.com/user_management/authorize",
			token_endpoint: "https://api.workos.com/user_management/token",
			scopes_supported: ["openid", "profile", "email", "organizations"],
		};
	}

	getRequiredEnvVars(): string[] {
		return ["WORKOS_API_KEY", "WORKOS_CLIENT_ID"];
	}
}
`;
}

/**
 * Generate .env.example template for a provider
 */
export function generateEnvExampleTemplate(provider: AuthProvider): string {
	const templates: Record<AuthProvider, string> = {
		stytch: `# Stytch Configuration
# Get these from: https://stytch.com/dashboard/api-keys
STYTCH_PROJECT_ID=project-test-00000000-0000-0000-0000-000000000000
STYTCH_SECRET=secret-test-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STYTCH_ENV=test  # Use "live" for production

# Stytch Setup Instructions:
# 1. Create a Stytch account at https://stytch.com
# 2. Create a new "Consumer Authentication" project
# 3. Go to API Keys and copy your Project ID and Secret
# 4. In Connected Apps settings:
#    - Enable "Allow dynamic client registration"
#    - Add your Worker URL (after deployment)
# 5. Update this file with your credentials
`,
		auth0: `# Auth0 Configuration
# Get these from: https://manage.auth0.com/dashboard
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=xxxxxxxxxxxxxxxxxxxx
AUTH0_CLIENT_SECRET=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
AUTH0_AUDIENCE=https://your-api.example.com

# Auth0 Setup Instructions:
# 1. Create an Auth0 account at https://auth0.com
# 2. Create a new application (Machine to Machine or Regular Web App)
# 3. Copy your Domain, Client ID, and Client Secret
# 4. Set your API Audience (API identifier)
# 5. Update this file with your credentials
`,
		workos: `# WorkOS Configuration
# Get these from: https://dashboard.workos.com/
WORKOS_API_KEY=sk_test_xxxxxxxxxxxxxxxxxxxx
WORKOS_CLIENT_ID=client_xxxxxxxxxxxxxxxxxxxx

# WorkOS Setup Instructions:
# 1. Create a WorkOS account at https://workos.com
# 2. Go to API Keys in the dashboard
# 3. Create a new API key
# 4. Copy your Client ID from the application settings
# 5. Update this file with your credentials
`,
	};

	return templates[provider];
}

/**
 * Capitalize first letter of a string
 */
function capitalizeFirst(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}
