# Authentication Implementation Plan for MCP Server Kit

**Version**: 1.0
**Date**: October 27, 2025
**Status**: Design Phase
**Related**: [Research Findings](./auth-research-findings.md)

---

## Overview

This document outlines the complete implementation plan for adding OAuth 2.1 authentication support to mcp-server-kit, enabling developers to scaffold authenticated MCP servers with a single CLI command.

### Goals
1. Add `--auth <provider>` flag to `new server` command
2. Support multiple auth providers (Stytch, Auth0, WorkOS, Clerk)
3. Maintain backward compatibility (auth is opt-in)
4. Build for Cloudflare first, design for cross-platform extensibility
5. Provide excellent developer experience with clear documentation

### Non-Goals
- Building custom authorization UI
- Supporting OAuth 1.0 or proprietary auth protocols
- Replacing platform-specific auth solutions
- Managing user databases or identity storage

---

## Architecture Design

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│  mcp-server-kit CLI                                     │
├─────────────────────────────────────────────────────────┤
│  $ mcp-server-kit new server --name foo --auth stytch  │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Template Selection & Processing                        │
├─────────────────────────────────────────────────────────┤
│  IF --auth flag:                                        │
│    → Select cloudflare-remote-auth template            │
│    → Set AUTH_PROVIDER variable                        │
│    → Enable provider-specific scaffolding              │
│  ELSE:                                                  │
│    → Select cloudflare-remote template (no auth)       │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Generated Project Structure                            │
├─────────────────────────────────────────────────────────┤
│  project-name/                                          │
│  ├── src/                                               │
│  │   ├── index.ts          (OAuth provider wrapper)    │
│  │   ├── server.ts         (MCP server implementation) │
│  │   ├── auth/                                          │
│  │   │   ├── config.ts     (Auth configuration)        │
│  │   │   ├── providers/                                 │
│  │   │   │   └── <provider>.ts                         │
│  │   │   └── types.ts                                   │
│  │   └── tools/            (User's MCP tools)          │
│  ├── wrangler.toml         (With KV namespace)         │
│  ├── .env.example          (Auth credentials template) │
│  └── README.md             (Setup instructions)        │
└─────────────────────────────────────────────────────────┘
```

### Component Architecture

```typescript
// Core abstractions for multi-provider support

interface AuthProvider {
  name: string;
  validateToken(token: string, env: Env): Promise<UserContext>;
  getMetadata(env: Env): AuthServerMetadata;
  getRequiredEnvVars(): string[];
}

interface UserContext {
  userId: string;
  email?: string;
  name?: string;
  scopes?: string[];
  metadata?: Record<string, unknown>;
}

interface AuthServerMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  scopes_supported?: string[];
}

// Provider implementations
class StytchProvider implements AuthProvider { /* ... */ }
class Auth0Provider implements AuthProvider { /* ... */ }
class WorkOSProvider implements AuthProvider { /* ... */ }
```

---

## Implementation Phases

### Phase 1: Foundation (Cloudflare + Stytch)

**Duration**: 2 weeks
**Goal**: Working auth-enabled Cloudflare template with Stytch

#### 1.1 CLI Extensions

**File**: `src/core/commands/new-server.ts`

```typescript
// Add new options
.option("--auth <provider>", "Authentication provider (stytch, auth0, workos, none)", "none")

// Validation
const validAuthProviders = ["none", "stytch", "auth0", "workos"];
if (!validAuthProviders.includes(options.auth)) {
  throw new Error(`Invalid auth provider: ${options.auth}`);
}

// Template selection logic
const templateId = options.auth !== "none"
  ? `${options.template}-auth`
  : options.template;

// Pass to template variables
variables.AUTH_ENABLED = String(options.auth !== "none");
variables.AUTH_PROVIDER = options.auth;
```

**Testing**:
```bash
# Should work
mcp-server-kit new server --name test --auth stytch --dev
mcp-server-kit new server --name test --auth none --dev

# Should error
mcp-server-kit new server --name test --auth invalid
```

#### 1.2 Template Structure

**New Template**: `templates/cloudflare-remote-auth/`

```
cloudflare-remote-auth/
├── template.config.json       # Template metadata
├── files/
│   ├── package.json.hbs       # Additional dependencies
│   ├── wrangler.toml.hbs      # With KV namespace
│   ├── tsconfig.json          # Same as base template
│   ├── .env.example.hbs       # Auth credentials
│   ├── .gitignore             # Ignore .env
│   ├── README.md.hbs          # Auth setup guide
│   ├── src/
│   │   ├── index.ts.hbs       # OAuth wrapper entry point
│   │   ├── server.ts.hbs      # MCP server (extracted from index)
│   │   ├── auth/
│   │   │   ├── config.ts.hbs
│   │   │   ├── types.ts
│   │   │   └── providers/
│   │   │       ├── stytch.ts.hbs
│   │   │       ├── auth0.ts.hbs
│   │   │       └── workos.ts.hbs
│   │   └── tools/
│   │       ├── health.ts
│   │       └── echo.ts.hbs    # Modified to use user context
│   └── test/
│       ├── unit/
│       │   └── auth/          # Auth provider tests
│       └── integration/
```

**Dependencies to Add** (`package.json.hbs`):
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.20.2",
    "agents": "^0.2.17",
    "@cloudflare/workers-oauth-provider": "^0.0.12",
    {{#if AUTH_STYTCH}}
    "stytch": "^12.42.1",
    {{/if}}
    "zod": "^3.25.76"
  }
}
```

#### 1.3 Core Auth Files

**File**: `templates/cloudflare-remote-auth/files/src/auth/types.ts`

```typescript
/**
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
    this.name = 'AuthenticationError';
  }
}
```

**File**: `templates/cloudflare-remote-auth/files/src/auth/config.ts.hbs`

```typescript
/**
 * Authentication Configuration
 *
 * Provides the appropriate auth provider based on environment.
 */

import type { AuthProvider } from './types.js';
{{#if AUTH_STYTCH}}
import { StytchProvider } from './providers/stytch.js';
{{/if}}
{{#if AUTH_AUTH0}}
import { Auth0Provider } from './providers/auth0.js';
{{/if}}
{{#if AUTH_WORKOS}}
import { WorkOSProvider } from './providers/workos.js';
{{/if}}

export function getAuthProvider(env: Env): AuthProvider {
  const provider = env.AUTH_PROVIDER || '{{AUTH_PROVIDER}}';

  switch (provider) {
    {{#if AUTH_STYTCH}}
    case 'stytch':
      return new StytchProvider();
    {{/if}}
    {{#if AUTH_AUTH0}}
    case 'auth0':
      return new Auth0Provider();
    {{/if}}
    {{#if AUTH_WORKOS}}
    case 'workos':
      return new WorkOSProvider();
    {{/if}}
    default:
      throw new Error(`Unknown auth provider: ${provider}`);
  }
}

export function validateAuthEnv(env: Env): void {
  const provider = getAuthProvider(env);
  const required = provider.getRequiredEnvVars();

  for (const key of required) {
    if (!env[key]) {
      throw new Error(
        `Missing required environment variable: ${key}\n` +
        `Please set this in your .env file or wrangler.toml`
      );
    }
  }
}
```

**File**: `templates/cloudflare-remote-auth/files/src/auth/providers/stytch.ts.hbs`

```typescript
/**
 * Stytch Authentication Provider
 *
 * Uses Stytch Connected Apps for MCP server authentication.
 * Docs: https://stytch.com/docs/guides/connected-apps/mcp-servers
 */

import type { AuthProvider, UserContext, AuthServerMetadata } from '../types.js';
import { AuthenticationError } from '../types.js';

export class StytchProvider implements AuthProvider {
  name = 'stytch';

  async validateToken(token: string, env: Env): Promise<UserContext> {
    try {
      // Stytch session authentication
      const response = await fetch('https://api.stytch.com/v1/sessions/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${env.STYTCH_PROJECT_ID}:${env.STYTCH_SECRET}`)}`,
        },
        body: JSON.stringify({
          session_token: token,
        }),
      });

      if (!response.ok) {
        throw new AuthenticationError(
          'Invalid or expired token',
          'invalid_token'
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
        'Failed to validate token',
        'validation_failed'
      );
    }
  }

  getMetadata(env: Env): AuthServerMetadata {
    const baseUrl = env.STYTCH_ENV === 'live'
      ? 'https://api.stytch.com'
      : 'https://test.stytch.com';

    return {
      issuer: `${baseUrl}/v1/projects/${env.STYTCH_PROJECT_ID}`,
      authorization_endpoint: `${baseUrl}/v1/oauth/authorize`,
      token_endpoint: `${baseUrl}/v1/oauth/token`,
      registration_endpoint: `${baseUrl}/v1/oauth/register`,
      scopes_supported: ['openid', 'profile', 'email'],
    };
  }

  getRequiredEnvVars(): string[] {
    return ['STYTCH_PROJECT_ID', 'STYTCH_SECRET'];
  }
}
```

**File**: `templates/cloudflare-remote-auth/files/src/index.ts.hbs`

```typescript
/**
 * {{MCP_SERVER_NAME}} - Authenticated MCP Server
 *
 * This server uses OAuth 2.1 authentication via {{AUTH_PROVIDER}}.
 * Entry point that wraps the MCP server with OAuth provider.
 */

import { OAuthProvider } from '@cloudflare/workers-oauth-provider';
import { MCPServerAgent } from './server.js';
import { getAuthProvider, validateAuthEnv } from './auth/config.js';

/**
 * OAuth Provider Configuration
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint (no auth required)
    if (url.pathname === '/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: '{{MCP_SERVER_NAME}}',
          version: '1.0.0',
          auth: '{{AUTH_PROVIDER}}',
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate environment on first request
    try {
      validateAuthEnv(env);
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Configuration Error',
          message: error.message,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize OAuth provider
    const authProvider = getAuthProvider(env);
    const metadata = authProvider.getMetadata(env);

    const oauthProvider = new OAuthProvider({
      // API routes that require authentication
      apiRoute: ['/mcp', '/sse'],

      // MCP server handler (authenticated)
      apiHandler: MCPServerAgent,

      // Default handler for OAuth flow
      defaultHandler: {
        fetch: async (req: Request) => {
          const url = new URL(req.url);

          // OAuth metadata endpoint
          if (url.pathname === '/.well-known/oauth-authorization-server') {
            return new Response(JSON.stringify(metadata), {
              headers: { 'Content-Type': 'application/json' },
            });
          }

          // Default response
          return new Response('{{MCP_SERVER_NAME}} - OAuth 2.1 Enabled', {
            headers: { 'Content-Type': 'text/plain' },
          });
        },
      },

      // OAuth endpoints
      authorizeEndpoint: metadata.authorization_endpoint,
      tokenEndpoint: metadata.token_endpoint,
      clientRegistrationEndpoint: metadata.registration_endpoint,

      // Token lifetimes
      accessTokenTTL: 3600,        // 1 hour
      refreshTokenTTL: 2592000,    // 30 days

      // Supported scopes
      scopesSupported: metadata.scopes_supported,

      // Token exchange callback
      tokenExchangeCallback: async (opts) => {
        // Validate token with auth provider
        const context = await authProvider.validateToken(opts.props.token, env);

        return {
          accessTokenProps: context,
          newProps: context,
        };
      },
    });

    return oauthProvider.fetch(request, env, ctx);
  },
};
```

**File**: `templates/cloudflare-remote-auth/files/src/server.ts.hbs`

```typescript
/**
 * MCP Server Implementation
 *
 * This file contains the actual MCP server logic.
 * It receives authenticated user context from the OAuth wrapper.
 */

import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerHealthTool } from "./tools/health.js";
import { registerEchoTool } from "./tools/echo.js";

export class MCPServerAgent extends McpAgent<Env> {
  server = new McpServer({
    name: "{{MCP_SERVER_NAME}}",
    version: "1.0.0",
  });

  async init() {
    // User context is available in this.props
    const userId = this.props?.userId;
    const userEmail = this.props?.email;

    console.log(`[MCP] Initializing server for user: ${userId} (${userEmail})`);

    // Register tools (can use user context for authorization)
    registerHealthTool(this.server);
    registerEchoTool(this.server, this.props); // Pass user context
  }
}
```

#### 1.4 Configuration Files

**File**: `templates/cloudflare-remote-auth/files/wrangler.toml.hbs`

```toml
name = "{{PROJECT_NAME}}"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# OAuth token storage (required)
[[kv_namespaces]]
binding = "OAUTH_KV"
id = "YOUR_KV_NAMESPACE_ID"  # Replace with: wrangler kv:namespace create OAUTH_KV

# Development
[env.dev]
[[env.dev.kv_namespaces]]
binding = "OAUTH_KV"
preview_id = "YOUR_KV_PREVIEW_ID"  # Replace with: wrangler kv:namespace create OAUTH_KV --preview

# Authentication environment variables
# For development: Create .env file with these values
# For production: Use wrangler secret put <KEY>
[vars]
AUTH_PROVIDER = "{{AUTH_PROVIDER}}"
{{#if AUTH_STYTCH}}
STYTCH_ENV = "test"  # Change to "live" for production
{{/if}}
```

**File**: `templates/cloudflare-remote-auth/files/.env.example.hbs`

```bash
# Authentication Provider: {{AUTH_PROVIDER}}
# Copy this file to .env and fill in your credentials
# NEVER commit .env to version control!

{{#if AUTH_STYTCH}}
# Stytch Configuration
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
{{/if}}

{{#if AUTH_AUTH0}}
# Auth0 Configuration
# Get these from: https://manage.auth0.com/dashboard
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=xxxxxxxxxxxxxxxxxxxx
AUTH0_CLIENT_SECRET=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
AUTH0_AUDIENCE=https://your-api.example.com
{{/if}}

{{#if AUTH_WORKOS}}
# WorkOS Configuration
# Get these from: https://dashboard.workos.com/
WORKOS_API_KEY=sk_test_xxxxxxxxxxxxxxxxxxxx
WORKOS_CLIENT_ID=client_xxxxxxxxxxxxxxxxxxxx
{{/if}}

# KV Namespace
# Create with: wrangler kv:namespace create OAUTH_KV
# Then update wrangler.toml with the ID
```

**File**: `templates/cloudflare-remote-auth/files/README.md.hbs`

```markdown
# {{PROJECT_NAME}}

{{DESCRIPTION}}

This MCP server uses **{{AUTH_PROVIDER}}** for authentication.

## Authentication Setup

### 1. Create {{AUTH_PROVIDER}} Account

{{#if AUTH_STYTCH}}
1. Sign up at [Stytch](https://stytch.com)
2. Create a new "Consumer Authentication" project
3. Note your Project ID and Secret from the API Keys page

### 2. Configure Connected Apps

1. Go to Connected Apps in your Stytch dashboard
2. Enable "Allow dynamic client registration"
3. After deployment, add your Worker URL as an authorized application
{{/if}}

### 3. Set Up Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit .env and fill in your credentials
# IMPORTANT: Never commit .env to git!
```

### 4. Create KV Namespace

```bash
# Create production namespace
wrangler kv:namespace create OAUTH_KV

# Create preview namespace (for development)
wrangler kv:namespace create OAUTH_KV --preview

# Update wrangler.toml with the generated IDs
```

### 5. Update wrangler.toml

Replace the placeholder KV namespace IDs with your actual IDs from step 4.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# The server will be available at http://localhost:{{PORT}}
```

## Testing with MCP Inspector

1. Install [MCP Inspector](https://github.com/modelcontextprotocol/inspector)
2. Connect to your server: `http://localhost:{{PORT}}/mcp`
3. On first connect, you'll be redirected to authenticate
4. Approve the connection and return to Inspector

## Deployment

```bash
# Set production secrets
wrangler secret put STYTCH_PROJECT_ID
wrangler secret put STYTCH_SECRET

# Deploy to Cloudflare Workers
npm run deploy
```

After deployment:
1. Note your Worker URL
2. Add it to {{AUTH_PROVIDER}} as an authorized application
3. Test with MCP Inspector using your production URL

## Architecture

This project uses:
- `@cloudflare/workers-oauth-provider` for OAuth 2.1 support
- `{{AUTH_PROVIDER}}` for authentication and user management
- Cloudflare KV for secure token storage
- `@modelcontextprotocol/sdk` for MCP protocol implementation

## User Context in Tools

Authenticated user information is available in your tools:

```typescript
registerEchoTool(server, userContext);

// In your tool implementation:
function registerEchoTool(server: McpServer, user: UserContext) {
  server.tool("echo", { message: z.string() }, async ({ message }) => {
    return {
      content: [
        {
          type: "text",
          text: `User ${user.userId} (${user.email}) said: ${message}`
        }
      ]
    };
  });
}
```

## Security Notes

- ✅ All tokens are encrypted in KV storage
- ✅ Access tokens expire after 1 hour
- ✅ Refresh tokens rotate automatically
- ⚠️ Never commit .env or secrets to version control
- ⚠️ Use `wrangler secret` for production credentials

## Troubleshooting

### "Missing required environment variable"

Make sure all required variables are set in `.env` for development or as secrets for production.

### "Invalid or expired token"

Tokens expire after 1 hour. Reconnect with MCP Inspector to get a new token.

### "Failed to validate token"

Check that your {{AUTH_PROVIDER}} credentials are correct and that the environment (test/live) matches your configuration.

## Learn More

- [MCP Specification](https://modelcontextprotocol.io)
- [{{AUTH_PROVIDER}} Docs]({{#if AUTH_STYTCH}}https://stytch.com/docs{{/if}})
- [Cloudflare Workers](https://developers.cloudflare.com/workers)
- [OAuth 2.1 Spec](https://oauth.net/2.1/)
```

#### 1.5 Modified Tool Example

**File**: `templates/cloudflare-remote-auth/files/src/tools/echo.ts.hbs`

```typescript
/**
 * Echo Tool - Example with User Context
 *
 * Demonstrates how to access authenticated user information in tools.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { UserContext } from "../auth/types.js";

export function registerEchoTool(server: McpServer, user?: UserContext) {
  server.tool(
    "echo",
    {
      message: z.string().describe("The message to echo back"),
    },
    async ({ message }) => {
      const userInfo = user
        ? `User: ${user.email || user.userId}\n`
        : '';

      return {
        content: [
          {
            type: "text",
            text: `${userInfo}Echo: ${message}`,
          },
        ],
      };
    },
  );
}
```

#### 1.6 Template Configuration

**File**: `templates/cloudflare-remote-auth/template.config.json`

```json
{
  "id": "cloudflare-remote-auth",
  "version": "1.0.0",
  "name": "Cloudflare Workers MCP Server (Authenticated)",
  "description": "Remote MCP server with OAuth 2.1 authentication on Cloudflare Workers",
  "capabilities": {
    "runtime": "cloudflare-workers",
    "transport": ["sse", "http"],
    "deployment": "remote",
    "language": "typescript",
    "authentication": true
  },
  "dependencies": {
    "mcp_sdk": "^1.20.2",
    "agents": "^0.2.17",
    "oauth_provider": "^0.0.12",
    "runtime_specific": {
      "wrangler": "^4.44.0",
      "@cloudflare/vitest-pool-workers": "^0.9.14"
    },
    "auth_providers": {
      "stytch": "^12.42.1",
      "auth0": "^4.0.0",
      "workos": "^5.0.0"
    }
  },
  "scaffolding": {
    "variables": [
      {
        "name": "PROJECT_NAME",
        "required": true,
        "prompt": "Project name (lowercase with hyphens)"
      },
      {
        "name": "DESCRIPTION",
        "required": false,
        "default": "Authenticated MCP server on Cloudflare Workers",
        "prompt": "Project description"
      },
      {
        "name": "PORT",
        "required": false,
        "default": "8788",
        "prompt": "Development server port",
        "pattern": "^\\d+$"
      },
      {
        "name": "MCP_SERVER_NAME",
        "required": false,
        "default": "MCP Server",
        "prompt": "MCP server display name"
      },
      {
        "name": "AUTH_PROVIDER",
        "required": true,
        "prompt": "Authentication provider",
        "enum": ["stytch", "auth0", "workos"]
      }
    ],
    "postScaffold": {
      "install": true,
      "installCommand": "npm install",
      "postInstall": ["npm run cf-typegen"],
      "smokeTest": "npm run type-check"
    }
  },
  "cli": {
    "dev": "npm run dev",
    "test": "npm run test:all",
    "deploy": "npm run deploy",
    "typeCheck": "npm run type-check"
  },
  "features": {
    "unitTesting": true,
    "integrationTesting": true,
    "authentication": true,
    "authProviders": ["stytch", "auth0", "workos"],
    "exampleTools": ["health", "echo"],
    "documentation": true
  },
  "compatibility": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  },
  "notes": "Requires KV namespace setup for token storage. See README for authentication configuration."
}
```

---

### Phase 2: Multi-Provider Support

**Duration**: 2 weeks
**Goal**: Add Auth0 and WorkOS providers

#### 2.1 Auth0 Provider

**File**: `templates/cloudflare-remote-auth/files/src/auth/providers/auth0.ts.hbs`

```typescript
/**
 * Auth0 Authentication Provider
 *
 * Uses Auth0 for enterprise-grade authentication.
 * Docs: https://auth0.com/docs/quickstart/backend
 */

import type { AuthProvider, UserContext, AuthServerMetadata } from '../types.js';
import { AuthenticationError } from '../types.js';

export class Auth0Provider implements AuthProvider {
  name = 'auth0';

  async validateToken(token: string, env: Env): Promise<UserContext> {
    try {
      // Verify JWT with Auth0
      const response = await fetch(`https://${env.AUTH0_DOMAIN}/userinfo`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new AuthenticationError(
          'Invalid or expired token',
          'invalid_token'
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
        'Failed to validate token',
        'validation_failed'
      );
    }
  }

  getMetadata(env: Env): AuthServerMetadata {
    const domain = env.AUTH0_DOMAIN;

    return {
      issuer: `https://${domain}/`,
      authorization_endpoint: `https://${domain}/authorize`,
      token_endpoint: `https://${domain}/oauth/token`,
      registration_endpoint: `https://${domain}/oidc/register`,
      scopes_supported: ['openid', 'profile', 'email', 'offline_access'],
    };
  }

  getRequiredEnvVars(): string[] {
    return ['AUTH0_DOMAIN', 'AUTH0_CLIENT_ID', 'AUTH0_CLIENT_SECRET', 'AUTH0_AUDIENCE'];
  }
}
```

#### 2.2 WorkOS Provider

**File**: `templates/cloudflare-remote-auth/files/src/auth/providers/workos.ts.hbs`

```typescript
/**
 * WorkOS Authentication Provider
 *
 * Uses WorkOS for B2B/enterprise authentication with SSO support.
 * Docs: https://workos.com/docs
 */

import type { AuthProvider, UserContext, AuthServerMetadata } from '../types.js';
import { AuthenticationError } from '../types.js';

export class WorkOSProvider implements AuthProvider {
  name = 'workos';

  async validateToken(token: string, env: Env): Promise<UserContext> {
    try {
      // Get user profile from WorkOS
      const response = await fetch('https://api.workos.com/user_management/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new AuthenticationError(
          'Invalid or expired token',
          'invalid_token'
        );
      }

      const data = await response.json();

      return {
        userId: data.id,
        email: data.email,
        name: `${data.first_name} ${data.last_name}`.trim(),
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
        'Failed to validate token',
        'validation_failed'
      );
    }
  }

  getMetadata(env: Env): AuthServerMetadata {
    return {
      issuer: 'https://api.workos.com/',
      authorization_endpoint: 'https://api.workos.com/user_management/authorize',
      token_endpoint: 'https://api.workos.com/user_management/token',
      scopes_supported: ['openid', 'profile', 'email', 'organizations'],
    };
  }

  getRequiredEnvVars(): string[] {
    return ['WORKOS_API_KEY', 'WORKOS_CLIENT_ID'];
  }
}
```

---

### Phase 3: Vercel Support

**Duration**: 2 weeks
**Goal**: Cross-platform support with Vercel Edge Functions

#### 3.1 Vercel Template Structure

**New Template**: `templates/vercel-remote-auth/`

```
vercel-remote-auth/
├── template.config.json
├── files/
│   ├── package.json.hbs       # Next.js dependencies
│   ├── next.config.js
│   ├── tsconfig.json
│   ├── .env.local.example.hbs
│   ├── app/
│   │   └── api/
│   │       └── mcp/
│   │           └── route.ts.hbs    # MCP endpoint with auth
│   ├── lib/
│   │   ├── auth/
│   │   │   ├── config.ts.hbs
│   │   │   └── providers/
│   │   │       └── stytch.ts.hbs
│   │   └── mcp/
│   │       └── server.ts           # MCP server logic
│   └── README.md.hbs
```

**File**: `templates/vercel-remote-auth/files/app/api/mcp/route.ts.hbs`

```typescript
/**
 * MCP Endpoint with Authentication
 *
 * Uses @vercel/mcp-adapter with OAuth support
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMcpHandler, experimental_withMcpAuth } from '@vercel/mcp-adapter';
import { getAuthProvider } from '@/lib/auth/config';

const server = new McpServer({
  name: '{{MCP_SERVER_NAME}}',
  version: '1.0.0',
});

// Register tools...

const mcpHandler = createMcpHandler({ server });

export const POST = experimental_withMcpAuth({
  authHandler: async (req) => {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const provider = getAuthProvider();
    const user = await provider.validateToken(token, process.env);

    return {
      userId: user.userId,
      props: user,
    };
  },
  handler: mcpHandler,
});
```

---

### Phase 4: Enhanced Developer Experience

**Duration**: 1 week
**Goal**: Improve setup workflow and validation

#### 4.1 Auth Validation Command

**File**: `src/core/commands/auth-validate.ts`

```typescript
/**
 * Auth Validate Command
 *
 * Validates authentication configuration in an existing project.
 */

import { Command } from "commander";
import * as fs from "node:fs";
import * as path from "node:path";

export function createAuthValidateCommand(): Command {
  return new Command("validate")
    .description("Validate authentication configuration")
    .option("--strict", "Fail on warnings")
    .action(async (options) => {
      console.log("🔍 Validating authentication configuration...\n");

      // Check for auth files
      const authFiles = [
        "src/auth/config.ts",
        "src/auth/types.ts",
        "src/auth/providers",
      ];

      let hasAuth = true;
      for (const file of authFiles) {
        if (!fs.existsSync(file)) {
          console.log(`❌ Missing: ${file}`);
          hasAuth = false;
        }
      }

      if (!hasAuth) {
        console.log("\n❌ This project doesn't appear to have authentication enabled.");
        console.log("   Create a new project with: mcp-server-kit new server --auth <provider>");
        process.exit(1);
      }

      // Check environment variables
      const envExample = fs.readFileSync(".env.example", "utf-8");
      const requiredVars = envExample
        .split("\n")
        .filter((line) => line.match(/^[A-Z_]+=/))
        .map((line) => line.split("=")[0]);

      const envFile = fs.existsSync(".env") ? fs.readFileSync(".env", "utf-8") : "";
      const missingVars = requiredVars.filter((v) => !envFile.includes(`${v}=`));

      if (missingVars.length > 0) {
        console.log("⚠️  Missing environment variables in .env:");
        for (const v of missingVars) {
          console.log(`   - ${v}`);
        }
        console.log("\n   Copy .env.example to .env and fill in the values.");

        if (options.strict) {
          process.exit(1);
        }
      }

      // Check KV namespace
      const wranglerToml = fs.readFileSync("wrangler.toml", "utf-8");
      if (wranglerToml.includes("YOUR_KV_NAMESPACE_ID")) {
        console.log("⚠️  KV namespace not configured in wrangler.toml");
        console.log("   Run: wrangler kv:namespace create OAUTH_KV");

        if (options.strict) {
          process.exit(1);
        }
      }

      console.log("\n✅ Authentication configuration looks good!");
    });
}
```

**Integration**: Add to main CLI

```typescript
// src/core/cli/index.ts
import { createAuthValidateCommand } from "../commands/auth-validate.js";

const authCommand = program
  .command("auth")
  .description("Authentication-related commands");

authCommand.addCommand(createAuthValidateCommand());
```

#### 4.2 Auth Providers List Command

**File**: `src/core/commands/auth-providers.ts`

```typescript
/**
 * Auth Providers Command
 *
 * Lists available authentication providers.
 */

import { Command } from "commander";

interface AuthProviderInfo {
  id: string;
  name: string;
  description: string;
  platforms: string[];
  features: string[];
  docs: string;
}

const providers: AuthProviderInfo[] = [
  {
    id: "stytch",
    name: "Stytch",
    description: "Developer-first auth with Connected Apps for CLI/agent workflows",
    platforms: ["cloudflare", "vercel"],
    features: [
      "Dynamic client registration",
      "Device code flow",
      "Email + OAuth (Google, Microsoft, etc.)",
      "Magic links",
    ],
    docs: "https://stytch.com/docs/guides/connected-apps/mcp-servers",
  },
  {
    id: "auth0",
    name: "Auth0",
    description: "Enterprise-grade authentication and authorization",
    platforms: ["cloudflare", "vercel"],
    features: [
      "Universal login",
      "Social connections",
      "MFA",
      "Enterprise SSO",
    ],
    docs: "https://auth0.com/docs",
  },
  {
    id: "workos",
    name: "WorkOS",
    description: "B2B authentication with SSO and directory sync",
    platforms: ["vercel"],
    features: [
      "SAML SSO",
      "Directory sync (SCIM)",
      "Admin portal",
      "Audit logs",
    ],
    docs: "https://workos.com/docs",
  },
];

export function createAuthProvidersCommand(): Command {
  return new Command("providers")
    .description("List available authentication providers")
    .option("--platform <platform>", "Filter by platform (cloudflare, vercel)")
    .option("--json", "Output as JSON")
    .action((options) => {
      let filtered = providers;

      if (options.platform) {
        filtered = providers.filter((p) => p.platforms.includes(options.platform));
      }

      if (options.json) {
        console.log(JSON.stringify(filtered, null, 2));
        return;
      }

      console.log("Available Authentication Providers:\n");

      for (const provider of filtered) {
        console.log(`📦 ${provider.name} (${provider.id})`);
        console.log(`   ${provider.description}`);
        console.log(`   Platforms: ${provider.platforms.join(", ")}`);
        console.log(`   Features: ${provider.features.join(", ")}`);
        console.log(`   Docs: ${provider.docs}`);
        console.log();
      }
    });
}
```

---

## Testing Strategy

### Unit Tests

**File**: `test/unit/auth/providers/stytch.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StytchProvider } from '../../../../templates/cloudflare-remote-auth/files/src/auth/providers/stytch';

describe('StytchProvider', () => {
  let provider: StytchProvider;
  let mockEnv: Env;

  beforeEach(() => {
    provider = new StytchProvider();
    mockEnv = {
      STYTCH_PROJECT_ID: 'project-test-123',
      STYTCH_SECRET: 'secret-test-456',
      STYTCH_ENV: 'test',
    } as Env;
  });

  describe('validateToken', () => {
    it('should validate a valid token', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          session: {
            user_id: 'user-123',
            session_id: 'session-456',
            authenticated_at: '2025-01-01T00:00:00Z',
            attributes: {
              email: 'test@example.com',
              name: 'Test User',
            },
          },
        }),
      });

      const result = await provider.validateToken('valid-token', mockEnv);

      expect(result.userId).toBe('user-123');
      expect(result.email).toBe('test@example.com');
      expect(result.name).toBe('Test User');
    });

    it('should throw on invalid token', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
      });

      await expect(
        provider.validateToken('invalid-token', mockEnv)
      ).rejects.toThrow('Invalid or expired token');
    });
  });

  describe('getMetadata', () => {
    it('should return correct metadata for test environment', () => {
      const metadata = provider.getMetadata(mockEnv);

      expect(metadata.issuer).toContain('test.stytch.com');
      expect(metadata.authorization_endpoint).toBeDefined();
      expect(metadata.token_endpoint).toBeDefined();
    });
  });

  describe('getRequiredEnvVars', () => {
    it('should return required environment variables', () => {
      const vars = provider.getRequiredEnvVars();

      expect(vars).toContain('STYTCH_PROJECT_ID');
      expect(vars).toContain('STYTCH_SECRET');
    });
  });
});
```

### Integration Tests

**File**: `test/integration/auth-flow.e2e.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Auth-enabled project scaffolding', () => {
  const testDir = '/tmp/mcp-auth-test';

  it('should scaffold project with stytch auth', () => {
    // Clean up
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }

    // Scaffold
    execSync(
      `node bin/mcp-server-kit.js new server --name auth-test --auth stytch --output ${testDir} --dev --no-install`,
      { stdio: 'inherit' }
    );

    // Verify structure
    expect(fs.existsSync(path.join(testDir, 'auth-test'))).toBe(true);
    expect(fs.existsSync(path.join(testDir, 'auth-test/src/auth'))).toBe(true);
    expect(fs.existsSync(path.join(testDir, 'auth-test/src/auth/providers/stytch.ts'))).toBe(true);
    expect(fs.existsSync(path.join(testDir, 'auth-test/.env.example'))).toBe(true);

    // Verify content
    const envExample = fs.readFileSync(path.join(testDir, 'auth-test/.env.example'), 'utf-8');
    expect(envExample).toContain('STYTCH_PROJECT_ID');
    expect(envExample).toContain('STYTCH_SECRET');

    const wranglerToml = fs.readFileSync(path.join(testDir, 'auth-test/wrangler.toml'), 'utf-8');
    expect(wranglerToml).toContain('OAUTH_KV');
  });
});
```

---

## Documentation

### User Documentation

#### Quick Start Guide

**File**: `docs/authentication/quick-start.md`

```markdown
# Authentication Quick Start

Add OAuth 2.1 authentication to your MCP server in 3 steps.

## Step 1: Create Authenticated Server

```bash
mcp-server-kit new server --name my-app --auth stytch
```

## Step 2: Configure Provider

```bash
cd my-app
cp .env.example .env

# Edit .env with your credentials
# Get credentials from https://stytch.com/dashboard
```

## Step 3: Create KV Namespace

```bash
wrangler kv:namespace create OAUTH_KV
wrangler kv:namespace create OAUTH_KV --preview

# Update wrangler.toml with the generated IDs
```

## Deploy

```bash
npm run deploy
```

Your MCP server now requires authentication!
```

#### Provider Setup Guides

**File**: `docs/authentication/providers/stytch.md`

```markdown
# Stytch Authentication Setup

Complete guide for integrating Stytch with your MCP server.

## Why Stytch?

- ✅ Built for CLI/agent workflows
- ✅ Dynamic client registration
- ✅ Free tier: 1,000 MAU
- ✅ MCP-specific documentation

## Prerequisites

- Stytch account (free at stytch.com)
- Cloudflare account
- wrangler CLI installed

## Step 1: Create Stytch Project

1. Go to https://stytch.com/dashboard
2. Create new "Consumer Authentication" project
3. Note your Project ID and Secret

## Step 2: Configure Connected Apps

1. Navigate to Connected Apps in Stytch dashboard
2. Enable "Allow dynamic client registration"
3. (After deployment) Add your Worker URL

## Step 3: Scaffold Project

```bash
mcp-server-kit new server --name my-app --auth stytch
cd my-app
```

## Step 4: Configure Environment

```bash
cp .env.example .env

# Edit .env:
STYTCH_PROJECT_ID=project-test-xxxxx
STYTCH_SECRET=secret-test-xxxxx
STYTCH_ENV=test  # Use 'live' for production
```

## Step 5: Set Up KV Storage

```bash
# Create namespaces
wrangler kv:namespace create OAUTH_KV
wrangler kv:namespace create OAUTH_KV --preview

# Update wrangler.toml with the IDs
```

## Step 6: Test Locally

```bash
npm install
npm run dev

# Test at http://localhost:8788
```

## Step 7: Deploy

```bash
# Set production secrets
wrangler secret put STYTCH_PROJECT_ID
wrangler secret put STYTCH_SECRET

# Deploy
npm run deploy
```

## Step 8: Configure Worker URL

1. Copy your Worker URL from deployment output
2. Add to Stytch Connected Apps as authorized application

## Testing

Use MCP Inspector to test authentication:

```bash
npx @modelcontextprotocol/inspector
```

Connect to your server - you'll be redirected to Stytch for authentication.

## Troubleshooting

### "Missing required environment variable"

Check that all variables in `.env.example` are set in your `.env` file.

### "Invalid or expired token"

Tokens expire after 1 hour. Reconnect to get a new token.

### "Failed to validate token"

Verify your Stytch credentials and that STYTCH_ENV matches your environment.

## Next Steps

- [Add custom scopes](./scopes.md)
- [Implement role-based access](./rbac.md)
- [Monitor auth events](./monitoring.md)
```

---

## Migration Guide

### Existing Projects

For users with existing unauthenticated servers:

**File**: `docs/authentication/migration.md`

```markdown
# Migrating Existing Servers to Use Authentication

This guide shows how to add authentication to an existing MCP server.

## Option 1: Scaffold New Project (Recommended)

The easiest approach is to create a new project and migrate your tools:

```bash
# 1. Create auth-enabled project
mcp-server-kit new server --name my-app-auth --auth stytch

# 2. Copy your tools
cp -r my-app/src/tools/* my-app-auth/src/tools/

# 3. Update tool registrations in my-app-auth/src/server.ts
```

## Option 2: Manual Migration

If you prefer to upgrade in-place:

### 1. Install Dependencies

```bash
npm install @cloudflare/workers-oauth-provider stytch
```

### 2. Add Auth Structure

```bash
mkdir -p src/auth/providers
```

Copy auth files from template:
- `src/auth/types.ts`
- `src/auth/config.ts`
- `src/auth/providers/stytch.ts`

### 3. Update Entry Point

Rename `src/index.ts` to `src/server.ts` and create new `src/index.ts`:

```typescript
// src/index.ts
import { OAuthProvider } from '@cloudflare/workers-oauth-provider';
import { MCPServerAgent } from './server.js';
import { getAuthProvider } from './auth/config.js';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    // OAuth wrapper logic here
  }
};
```

### 4. Update Tools

Modify tools to accept user context:

```typescript
// Before
export function registerMyTool(server: McpServer) { /* ... */ }

// After
export function registerMyTool(server: McpServer, user?: UserContext) {
  // Use user.userId, user.email, etc.
}
```

### 5. Configure KV & Environment

Follow steps from Quick Start guide.

## Testing Migration

1. Test locally without auth by temporarily disabling OAuth wrapper
2. Verify all tools work
3. Enable OAuth wrapper
4. Test with MCP Inspector
5. Deploy and test in production

## Rollback Plan

Keep your original project until authentication is fully tested. You can switch back by updating your deployment.
```

---

## Rollout Plan

### Phase 1: Internal Testing (Week 1)
- Create auth-enabled project locally
- Test with Stytch test environment
- Verify all flows work
- Document any issues

### Phase 2: Beta Release (Week 2-3)
- Tag as `v2.0.0-beta.1`
- Announce in Discord/GitHub
- Gather feedback from early adopters
- Fix critical bugs

### Phase 3: Stable Release (Week 4)
- Address all feedback
- Complete documentation
- Release `v2.0.0`
- Publish blog post/tutorial

### Phase 4: Additional Providers (Week 5-6)
- Add Auth0 support
- Add WorkOS support
- Update documentation

### Phase 5: Vercel Support (Week 7-8)
- Create Vercel template
- Test cross-platform
- Document platform differences

---

## Success Metrics

### Technical Metrics
- ✅ Zero breaking changes to existing templates
- ✅ < 5 minutes from scaffold to authenticated server (with docs)
- ✅ 100% test coverage for auth providers
- ✅ All CI/CD tests passing

### User Experience Metrics
- ✅ Clear error messages for misconfiguration
- ✅ Complete setup documentation
- ✅ Example projects for each provider
- ✅ < 10 minute tutorial from zero to deployed

### Adoption Metrics
- Track `--auth` flag usage
- Monitor GitHub issues for auth-related problems
- Survey users on setup experience
- Measure time-to-first-authenticated-request

---

## Open Questions

### 1. Template Naming
**Options:**
- A: `cloudflare-remote-auth` (separate template)
- B: `cloudflare-remote` (detect `--auth` flag and modify template)

**Recommendation**: Option A (separate template) for clarity

### 2. Default Auth Provider
**Options:**
- A: Require explicit `--auth <provider>`
- B: Default to `stytch` if `--auth` with no arg

**Recommendation**: Option A (explicit) to avoid confusion

### 3. Mock Auth for Development
**Options:**
- A: Require real auth provider even in dev
- B: Support `--auth mock` for local development
- C: Auto-detect and bypass auth on localhost

**Recommendation**: Option B (mock mode) for better DX

### 4. CLI vs Environment Variables
**Options:**
- A: Pass credentials via CLI args (insecure)
- B: Always use .env files
- C: Support both with .env preferred

**Recommendation**: Option B (.env only) for security

---

## Risk Assessment

### High Risk ⛔
**Complexity Explosion**
- Risk: Supporting many providers increases maintenance burden
- Mitigation: Start with 2-3 providers, validate approach, then expand
- Mitigation: Abstract providers behind interface for consistency

### Medium Risk ⚠️
**Provider API Changes**
- Risk: Auth providers change APIs without notice
- Mitigation: Pin SDK versions, monitor changelogs
- Mitigation: Abstract providers so changes are localized

**User Confusion**
- Risk: Auth setup is complex, users get stuck
- Mitigation: Excellent documentation with screenshots
- Mitigation: Setup validation command to catch errors
- Mitigation: Mock auth mode for testing

### Low Risk ✅
**KV Storage Costs**
- Risk: KV usage increases Cloudflare costs
- Mitigation: Document KV pricing clearly
- Mitigation: Implement token cleanup for expired grants

**Security Vulnerabilities**
- Risk: OAuth implementation has security issues
- Mitigation: Use battle-tested libraries (@cloudflare/workers-oauth-provider)
- Mitigation: Follow OAuth 2.1 spec strictly
- Mitigation: Regular security audits

---

## Appendix

### A. Package Versions

```json
{
  "@cloudflare/workers-oauth-provider": "^0.0.12",
  "@modelcontextprotocol/sdk": "^1.20.2",
  "@vercel/mcp-adapter": "^1.0.0",
  "agents": "^0.2.17",
  "stytch": "^12.42.1",
  "auth0": "^4.0.0",
  "workos": "^5.0.0"
}
```

### B. File Checklist

Auth-enabled template must include:

- [ ] `src/index.ts` - OAuth provider wrapper
- [ ] `src/server.ts` - MCP server implementation
- [ ] `src/auth/types.ts` - Type definitions
- [ ] `src/auth/config.ts` - Provider configuration
- [ ] `src/auth/providers/<provider>.ts` - Provider implementation
- [ ] `wrangler.toml` - With KV namespace
- [ ] `.env.example` - Credential template
- [ ] `.gitignore` - Ignore .env
- [ ] `README.md` - Setup instructions
- [ ] `package.json` - Auth dependencies
- [ ] `test/unit/auth/` - Unit tests
- [ ] `test/integration/` - Integration tests

### C. Environment Variables

Stytch:
```bash
STYTCH_PROJECT_ID=project-test-xxxxx
STYTCH_SECRET=secret-test-xxxxx
STYTCH_ENV=test|live
```

Auth0:
```bash
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=xxxxx
AUTH0_CLIENT_SECRET=xxxxx
AUTH0_AUDIENCE=https://your-api.com
```

WorkOS:
```bash
WORKOS_API_KEY=sk_test_xxxxx
WORKOS_CLIENT_ID=client_xxxxx
```

### D. Resources

- [MCP Authorization Spec](https://modelcontextprotocol.io/specification/draft/basic/authorization)
- [OAuth 2.1 Spec](https://oauth.net/2.1/)
- [Cloudflare OAuth Provider](https://github.com/cloudflare/workers-oauth-provider)
- [Vercel MCP Adapter](https://github.com/vercel/mcp-adapter)
- [Stytch Connected Apps](https://stytch.com/docs/guides/connected-apps/mcp-servers)
- [Stytch Example Repo](https://github.com/stytchauth/mcp-stytch-consumer-todo-list)

---

## Conclusion

This implementation plan provides a clear path to adding authentication support to mcp-server-kit while maintaining backward compatibility and excellent developer experience.

**Key Principles:**
1. Auth is opt-in (existing projects unaffected)
2. Provider abstraction enables multi-provider support
3. Excellent documentation reduces friction
4. Validation tools catch configuration errors early
5. Security best practices baked in

**Next Step**: Review and approve this plan, then begin Phase 1 implementation.
