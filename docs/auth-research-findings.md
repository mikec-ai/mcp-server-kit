# Authentication Research Findings for MCP Server Kit
**Date:** October 27, 2025
**Purpose:** Technical spike to determine viability of adding authentication support to mcp-server-kit

---

## Executive Summary

**✅ VIABLE**: Adding authentication support to MCP server kit is technically feasible and well-supported by existing infrastructure.

**Key Finding**: Both Cloudflare and Vercel have production-ready OAuth libraries specifically designed for MCP servers, with Stytch emerging as the most agent/CLI-friendly authentication provider.

---

## Research Sources

### Documentation Reviewed
1. MCP Authorization Specification (OAuth 2.1 based)
2. Cloudflare Agents MCP Authorization docs
3. Stytch Connected Apps documentation
4. Stytch MCP server guides (Consumer & B2B)
5. `@cloudflare/workers-oauth-provider` package and types
6. `@vercel/mcp-adapter` package documentation
7. Stytch example repository: `mcp-stytch-consumer-todo-list`

### Packages Tested
- `stytch@12.42.1` - Stytch Node SDK
- `@cloudflare/workers-oauth-provider@0.0.12` - Cloudflare OAuth provider
- `@vercel/mcp-adapter@1.0.0` - Vercel MCP adapter with OAuth
- `@modelcontextprotocol/sdk@^1.7.0` - MCP SDK
- `agents@^0.0.88` - Cloudflare Agents SDK

---

## MCP Authorization Specification Requirements

### Core Standards
- **Protocol**: OAuth 2.1 (NOT OAuth 2.0)
- **PKCE**: MANDATORY using S256 code challenge method
- **Transport**: HTTP-based transports only
- **Authorization**: OPTIONAL but SHOULD conform when implemented

### Server Requirements
MCP servers act as **OAuth 2.1 Resource Servers**:
- Validate access tokens before processing requests
- Return 401 with WWW-Authenticate header for unauthorized requests
- Implement Protected Resource Metadata (RFC 9728)
- Support Authorization Server Metadata Discovery (RFC 8414)

### Client Requirements
MCP clients act as **OAuth 2.1 Clients**:
- MUST implement PKCE
- MUST include `resource` parameter (RFC 8707) in authorization requests
- SHOULD implement Dynamic Client Registration (RFC 7591)
- SHOULD request minimal scopes (principle of least privilege)

### Security Requirements
1. **Token Validation**: Every request must validate bearer token
2. **HTTPS Only**: All endpoints except localhost must use HTTPS
3. **Audience Validation**: Tokens must be issued specifically for the server
4. **Short-Lived Tokens**: Access tokens should have short TTL
5. **Refresh Token Rotation**: Public clients must rotate refresh tokens

### Discovery Mechanisms
1. **Protected Resource Metadata**:
   - `/.well-known/oauth-protected-resource` endpoint
   - WWW-Authenticate header with `resource_metadata` URL

2. **Authorization Server Metadata**:
   - `/.well-known/oauth-authorization-server` endpoint
   - OpenID Connect Discovery support

---

## Cloudflare Workers Implementation

### Package: `@cloudflare/workers-oauth-provider@0.0.12`

**Status**: Production-ready, actively maintained by Cloudflare
**License**: MIT
**Last Updated**: October 2025

#### Key Features
- OAuth 2.1 provider implementation with PKCE
- Automatic token management
- End-to-end encryption for user properties
- Dynamic client registration (RFC 7591)
- Refresh token rotation
- KV namespace for persistent storage

#### Architecture Pattern
```typescript
import { OAuthProvider } from '@cloudflare/workers-oauth-provider';

const provider = new OAuthProvider({
  // API routes that require authentication
  apiRoute: ["/api/", "/mcp"],

  // Handler for authenticated API requests
  apiHandler: ApiHandler,

  // Handler for non-API requests (UI, authorization flow)
  defaultHandler: DefaultHandler,

  // OAuth endpoints
  authorizeEndpoint: "https://your-domain.com/authorize",
  tokenEndpoint: "https://your-domain.com/oauth/token",
  clientRegistrationEndpoint: "https://your-domain.com/oauth/register",

  // Token lifetimes
  accessTokenTTL: 3600,        // 1 hour
  refreshTokenTTL: 2592000,    // 30 days

  // Optional scopes
  scopesSupported: ["read", "write"]
});

export default provider;
```

#### Integration with MCP Agents
The `agents` package provides `McpAgent` class that works seamlessly with the OAuth provider:

```typescript
import { McpAgent } from "agents/mcp";
import { OAuthProvider } from '@cloudflare/workers-oauth-provider';

export class MCPServerAgent extends McpAgent<Env> {
  server = new McpServer({
    name: "My MCP Server",
    version: "1.0.0",
  });

  async init() {
    // Register tools - can access this.props.claims for user context
    const userId = this.props.claims.sub;
    // ... tool registration
  }
}

// Wrap with OAuth provider
export default OAuthProvider.wrap({
  apiRoute: ["/mcp", "/sse"],
  apiHandler: MCPServerAgent,
  // ... other OAuth config
});
```

#### User Context Access
Authenticated user information is available via `this.props`:
- `this.props.claims.sub` - User ID
- `this.props.claims` - Full JWT claims
- `this.props` - Custom application properties

#### Storage Requirements
Requires Cloudflare KV namespace binding:
```toml
# wrangler.toml
[[kv_namespaces]]
binding = "OAUTH_KV"
id = "your-kv-namespace-id"
```

#### API Surface (Type Definitions)
```typescript
interface OAuthProviderOptions {
  apiRoute?: string | string[];
  apiHandler?: ExportedHandler | WorkerEntrypoint;
  apiHandlers?: Record<string, ExportedHandler | WorkerEntrypoint>;
  defaultHandler: ExportedHandler | WorkerEntrypoint;
  authorizeEndpoint: string;
  tokenEndpoint: string;
  clientRegistrationEndpoint?: string;
  accessTokenTTL?: number;        // Default: 3600 (1 hour)
  refreshTokenTTL?: number;       // Default: 2592000 (30 days)
  scopesSupported?: string[];
  tokenExchangeCallback?: (opts: TokenExchangeCallbackOptions) =>
    Promise<TokenExchangeCallbackResult>;
  resolveExternalToken?: (input: ResolveExternalTokenInput) =>
    Promise<ResolveExternalTokenResult>;
}

interface TokenExchangeCallbackOptions {
  grantType: 'authorization_code' | 'refresh_token';
  clientId: string;
  userId: string;
  scope: string[];
  props: any;
}

interface TokenExchangeCallbackResult {
  accessTokenProps?: any;
  newProps?: any;
  accessTokenTTL?: number;
  refreshTokenTTL?: number;
}
```

### Cloudflare Integration Advantages
- ✅ Native Workers integration
- ✅ Existing `agents` package compatibility
- ✅ Built by Cloudflare specifically for MCP
- ✅ KV storage for token persistence
- ✅ Edge deployment for global availability
- ✅ Free tier friendly (KV + Workers)

### Cloudflare Integration Challenges
- ⚠️ Requires KV namespace setup (adds deployment step)
- ⚠️ Early version (0.0.12) - may have undocumented quirks
- ⚠️ Less documentation than mature auth platforms
- ⚠️ Manual implementation of authorization UI

---

## Vercel Edge Functions Implementation

### Package: `@vercel/mcp-adapter@1.0.0`

**Status**: Production v1.0, actively maintained by Vercel
**License**: Apache-2.0
**Last Updated**: July 2025

#### Key Features
- MCP protocol adapter for Next.js and other frameworks
- Built-in OAuth 2.1 support
- SSE and Streamable HTTP transport support
- Pre-built integrations with major auth providers
- One-click deployment templates

#### Supported Auth Providers
Out-of-the-box integrations:
- **Better Auth** - Open source auth
- **Clerk** - Modern auth platform
- **Descope** - Passwordless auth
- **Stytch** - Developer-first auth
- **WorkOS** - Enterprise auth (SSO, SAML)

#### Architecture Pattern
```typescript
import { createMcpHandler, experimental_withMcpAuth } from '@vercel/mcp-adapter';

// Basic MCP handler
const mcpHandler = createMcpHandler({
  server: mcpServer,
  // ... MCP configuration
});

// Wrap with auth
export const POST = experimental_withMcpAuth({
  authHandler: async (req) => {
    // Validate token with your auth provider
    const user = await validateToken(req.headers.get('authorization'));
    return { userId: user.id, props: user };
  },
  handler: mcpHandler,
});
```

#### Integration Pattern (Next.js App Router)
```typescript
// app/api/mcp/route.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMcpHandler, experimental_withMcpAuth } from '@vercel/mcp-adapter';

const server = new McpServer({
  name: "My MCP Server",
  version: "1.0.0",
});

// Register tools...

const mcpHandler = createMcpHandler({ server });

export const POST = experimental_withMcpAuth({
  authHandler: yourAuthValidation,
  handler: mcpHandler,
});
```

#### Example Deployments
- **WorkOS Template**: Deploy secure MCP servers in 5 minutes
- **Better Auth Template**: Minimal 10 lines of code for auth
- **Clerk Template**: Modern OAuth with enterprise support

### Vercel Integration Advantages
- ✅ Mature v1.0 release
- ✅ Multiple auth provider integrations
- ✅ Next.js ecosystem familiarity
- ✅ One-click deployment templates
- ✅ SSO and enterprise auth support
- ✅ Better documentation and examples

### Vercel Integration Challenges
- ⚠️ Requires Next.js (adds framework dependency)
- ⚠️ Edge functions have different constraints than Workers
- ⚠️ Less control over OAuth flow implementation
- ⚠️ Vercel platform lock-in

---

## Stytch Authentication Provider

### Why Stytch?

**CLI-First Design**: Stytch's Connected Apps feature was specifically built for CLI tools and developer workflows.

#### Key Advantages
1. **Device Code Flow** - Optimized for CLI authentication
2. **Dynamic Client Registration** - No manual client setup
3. **Connected Apps** - Native support for agent authorization
4. **Fast Integration** - Reference implementations in < 15 days
5. **MCP Documentation** - Explicit guides for MCP servers
6. **Cross-Platform** - Works with Cloudflare and Vercel
7. **Free Tier** - Generous limits for development

### Stytch Connected Apps Architecture

#### Flow Overview
1. **Client Connects**: MCP client attempts connection without token
2. **401 Response**: Server returns with OAuth metadata URL
3. **Discovery**: Client fetches `/.well-known/oauth-authorization-server`
4. **Dynamic Registration**: Client auto-registers (no manual config)
5. **Browser Auth**: User authenticates via Stytch-hosted UI
6. **Token Issuance**: Stytch issues access token
7. **Authenticated Requests**: Client includes token in subsequent requests

#### Configuration (Stytch Dashboard)
```yaml
Project Setup:
  - Record Project ID and Public Token
  - Enable Frontend SDK for localhost:3000
  - Connected Apps → Enable "Allow dynamic client registration"
  - Add deployed Worker URL as authorized application
```

#### Integration Code (Cloudflare Example)
```typescript
import { StytchClient } from 'stytch';

// Initialize Stytch
const stytch = new StytchClient({
  project_id: env.STYTCH_PROJECT_ID,
  secret: env.STYTCH_SECRET,
});

// Validate session in middleware
async function validateStytchToken(token: string) {
  const result = await stytch.sessions.authenticate({
    session_token: token,
  });

  return {
    userId: result.session.user_id,
    email: result.session.attributes.email,
  };
}

// Use in OAuth provider
const provider = new OAuthProvider({
  // ... other config
  tokenExchangeCallback: async (opts) => {
    // Optionally enrich user data from Stytch
    const user = await stytch.users.get(opts.userId);
    return {
      accessTokenProps: {
        email: user.emails[0].email,
        name: user.name,
      },
    };
  },
});
```

### Stytch SDK Details
- **Package**: `stytch@12.42.1`
- **Type**: CommonJS (Node.js backend only)
- **Supported Node**: 18, 20 LTS
- **API**: Promise-based, fully typed

### Example Repository Analysis

**Repository**: `stytchauth/mcp-stytch-consumer-todo-list`
- **Stack**: Cloudflare Workers + Hono + React
- **MCP SDK**: `@modelcontextprotocol/sdk@^1.7.0`
- **Agents**: `agents@^0.0.88`
- **Stytch**: `@stytch/react@^19.4.1` + `@stytch/vanilla-js@^5.18.6`
- **Deploy**: `npm run deploy` (Wrangler)

**Architecture**:
```
src/
├── TodoAPI.ts         # REST API for TODO operations
├── TodoMCP.ts         # MCP server for TODO operations
├── TodoService.ts     # Business logic + data storage
└── components/        # React UI components
```

**Key Patterns**:
1. **Dual Protocol**: Same service layer serves REST and MCP
2. **Middleware Auth**: Centralized credential validation
3. **User Scoping**: Data namespaced by user ID for isolation
4. **Dynamic Registration**: Zero manual client configuration

### Stytch Pricing
- **Free Tier**: 1,000 MAU (Monthly Active Users)
- **Pro**: $99/month for 5,000 MAU
- **Enterprise**: Custom pricing for SSO, SAML, etc.

---

## Alternative Auth Providers

### Auth0
- **Pros**: Enterprise-grade, extensive documentation, broad OAuth support
- **Cons**: More complex setup, higher pricing, over-featured for simple use cases
- **Best For**: Large organizations, complex IAM requirements

### WorkOS
- **Pros**: B2B focused, SSO/SAML out-of-box, good Vercel integration
- **Cons**: B2B specific, less suited for consumer apps
- **Best For**: SaaS products, enterprise customers

### Clerk
- **Pros**: Modern UI, Next.js integration, great DX
- **Cons**: Next.js heavy, less flexibility for custom flows
- **Best For**: Next.js applications, modern web apps

### Descope
- **Pros**: Passwordless focused, drag-drop UI builder
- **Cons**: Newer platform, smaller community
- **Best For**: Passwordless auth, visual workflow design

### Better Auth
- **Pros**: Open source, minimal code, self-hosted option
- **Cons**: Less managed, more DIY, fewer features
- **Best For**: Open source projects, self-hosting preference

---

## Technical Validation - Experimental Spike

### Test Setup
```bash
mkdir /tmp/auth-spike
cd /tmp/auth-spike
npm init -y
npm install stytch @cloudflare/workers-oauth-provider \
  @modelcontextprotocol/sdk agents
```

### Installation Results
✅ All packages installed successfully:
- `stytch@12.42.1`
- `@cloudflare/workers-oauth-provider@0.0.12`
- `@modelcontextprotocol/sdk@^1.20.2`
- `agents@^0.2.17`

### Package Inspection
✅ `@cloudflare/workers-oauth-provider` structure:
- Main: `dist/oauth-provider.js` (ES Module)
- Types: `dist/oauth-provider.d.ts` (20,850 bytes)
- Complete type definitions for all interfaces
- Cloudflare Workers runtime dependencies

✅ `stytch` structure:
- Main: `dist/index.js` (CommonJS)
- Types: `types/lib/index.d.ts`
- Backend SDK (server-side only)
- Separate frontend packages available

### Key Findings
1. **Module Compatibility**: OAuth provider is ESM, Stytch is CommonJS
   - Solution: Use dynamic import for Stytch or separate worker
2. **Runtime Environment**: OAuth provider uses `cloudflare:workers` imports
   - Solution: Must run in Workers environment, not Node
3. **Type Safety**: Full TypeScript support across all packages
   - Solution: Can generate proper types for scaffolded projects

---

## Implementation Complexity Analysis

### Low Complexity ✅
- Adding `--auth` flag to CLI
- Generating environment variable templates
- Documenting auth setup in scaffolded projects
- Creating example auth implementations

### Medium Complexity ⚠️
- Integrating OAuth provider with existing templates
- Managing KV namespace creation/configuration
- Creating auth-specific template variants
- Writing integration tests for auth flows

### High Complexity ⛔
- Building custom authorization UI (if not using provider)
- Handling multiple auth provider variations
- Managing secrets/credentials in development
- Testing with real OAuth providers

---

## Security Considerations

### Credential Management
- ❌ **Never commit secrets**: Use .env files, add to .gitignore
- ✅ **Environment variables**: Document required vars in README
- ✅ **Development mode**: Support local development without real auth
- ✅ **Production checklist**: Validate all secrets before deployment

### Token Storage
- ✅ **KV Encryption**: OAuth provider encrypts tokens at rest
- ✅ **Short-lived tokens**: 1-hour default for access tokens
- ✅ **Refresh rotation**: Automatic refresh token rotation
- ⚠️ **KV Costs**: Monitor KV usage, set up alerts

### Access Control
- ✅ **Scope-based**: Support fine-grained permissions
- ✅ **User isolation**: Namespace data by user ID
- ✅ **Audit logging**: Log authentication events
- ⚠️ **Rate limiting**: Consider adding rate limits

---

## Recommended Architecture

### Template Structure
```
templates/
├── cloudflare-remote/           # Existing (no auth)
├── cloudflare-remote-auth/      # NEW: With OAuth
│   ├── files/
│   │   ├── src/
│   │   │   ├── index.ts         # OAuth provider integration
│   │   │   ├── auth/
│   │   │   │   ├── config.ts    # Auth configuration
│   │   │   │   ├── providers/   # Provider adapters
│   │   │   │   │   ├── stytch.ts
│   │   │   │   │   ├── auth0.ts
│   │   │   │   │   └── workos.ts
│   │   │   │   └── middleware.ts
│   │   │   └── tools/           # Existing tools
│   │   ├── wrangler.toml        # With KV binding
│   │   ├── .env.example         # Auth credentials template
│   │   └── README.md            # Auth setup guide
│   └── template.config.json
└── vercel-remote-auth/          # Future: Vercel with OAuth
```

### Provider Abstraction
```typescript
// auth/providers/base.ts
export interface AuthProvider {
  name: string;
  validateToken(token: string): Promise<UserContext>;
  getMetadata(): AuthMetadata;
}

// auth/providers/stytch.ts
export class StytchProvider implements AuthProvider {
  constructor(config: StytchConfig) { /* ... */ }
  async validateToken(token: string): Promise<UserContext> { /* ... */ }
  getMetadata(): AuthMetadata { /* ... */ }
}

// auth/config.ts
export function getAuthProvider(env: Env): AuthProvider {
  switch (env.AUTH_PROVIDER) {
    case 'stytch':
      return new StytchProvider({ /* ... */ });
    case 'auth0':
      return new Auth0Provider({ /* ... */ });
    default:
      throw new Error(`Unknown provider: ${env.AUTH_PROVIDER}`);
  }
}
```

### CLI Interface
```bash
# Create server without auth (existing)
mcp-server-kit new server --name my-server

# Create server with auth (new)
mcp-server-kit new server --name my-server --auth stytch

# List available auth providers
mcp-server-kit auth providers

# Validate auth configuration
mcp-server-kit auth validate
```

---

## Testing Strategy

### Unit Tests
- ✅ Auth provider interface implementations
- ✅ Token validation logic
- ✅ User context extraction
- ✅ Error handling for invalid tokens

### Integration Tests
- ✅ Mock OAuth flows (no real providers)
- ✅ Token exchange simulation
- ✅ Protected endpoint access
- ✅ 401/403 response handling

### E2E Tests (Optional)
- ⚠️ Real Stytch test project
- ⚠️ Full OAuth flow with browser
- ⚠️ Token refresh scenarios
- ⚠️ Multi-user scenarios

### Manual Testing Checklist
```markdown
- [ ] Create project with --auth flag
- [ ] Verify .env.example generated correctly
- [ ] Set up auth provider credentials
- [ ] Deploy to Cloudflare/Vercel
- [ ] Test OAuth flow in MCP Inspector
- [ ] Verify user context in tools
- [ ] Test token expiration/refresh
- [ ] Verify user data isolation
```

---

## Risk Mitigation

### Risk: Complex setup process
**Mitigation**:
- Provide clear documentation
- Create setup wizard command
- Include example .env files
- Link to provider-specific guides

### Risk: Provider API changes
**Mitigation**:
- Abstract providers behind interface
- Pin provider SDK versions
- Monitor provider changelogs
- Test with multiple providers

### Risk: Security vulnerabilities
**Mitigation**:
- Follow OAuth 2.1 spec strictly
- Use provider-managed libraries
- Regular security audits
- Dependabot for dependency updates

### Risk: Development friction
**Mitigation**:
- Support auth-free development mode
- Mock auth for testing
- Local OAuth emulator option
- Clear error messages

---

## Next Steps for Implementation

### Phase 1: Foundation (Week 1-2)
1. Add `--auth` flag to CLI
2. Create auth provider interface
3. Implement Stytch provider for Cloudflare
4. Create cloudflare-remote-auth template
5. Write documentation

### Phase 2: Enhancement (Week 3-4)
6. Add additional providers (Auth0, WorkOS)
7. Create Vercel auth template
8. Write integration tests
9. Create example applications

### Phase 3: Polish (Week 5-6)
10. Add auth validation command
11. Create setup wizard
12. Write comprehensive guides
13. Publish blog post/tutorial

---

## Questions for Decision

1. **Default behavior**: Should auth be opt-in or opt-out?
   - Recommendation: Opt-in (existing templates remain simple)

2. **Provider priority**: Which provider to implement first?
   - Recommendation: Stytch (best CLI/agent experience)

3. **Template strategy**: Separate templates or flag-based?
   - Recommendation: Separate templates (clearer mental model)

4. **Credential management**: How to handle secrets in dev?
   - Recommendation: .env files + wrangler secrets for production

5. **Testing depth**: How much real provider testing?
   - Recommendation: Mock for CI, optional real provider tests

---

## Conclusion

**RECOMMENDATION: Proceed with implementation**

The research confirms that adding authentication to mcp-server-kit is:
- ✅ Technically viable
- ✅ Well-supported by platforms
- ✅ Agent/CLI-friendly (especially Stytch)
- ✅ Extensible to multiple providers
- ✅ Aligned with MCP specification

**Suggested Priority Order**:
1. Cloudflare + Stytch (best agent experience)
2. Cloudflare + Auth0 (enterprise option)
3. Vercel + Stytch (cross-platform validation)
4. Additional providers as needed

**Estimated Effort**: 4-6 weeks for full implementation with tests and documentation

**Risk Level**: Low-Medium (well-documented patterns, proven libraries)