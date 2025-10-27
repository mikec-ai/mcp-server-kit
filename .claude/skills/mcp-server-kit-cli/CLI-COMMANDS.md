# CLI Commands - Complete Reference

Comprehensive documentation for every mcp-server-kit command.

---

## new server

**Purpose**: Scaffold a new MCP server project

**Syntax**:
```bash
mcp-server-kit new server --name <name> [options]
```

### Required Arguments

| Argument | Format | Example |
|----------|--------|---------|
| `--name` | kebab-case | `my-weather-server`, `user-management` |

### Optional Flags

#### --dev (Development Mode)

**Purpose**: Use local mcp-server-kit paths instead of npm package

**When to use**:
- ✅ You're testing changes to mcp-server-kit itself
- ✅ You're developing new templates
- ✅ You're working in the mcp-server-kit repository

**When NOT to use**:
- ❌ Building a production MCP server
- ❌ Following tutorials or documentation
- ❌ Creating servers for deployment

**What it does**:
1. Sets `DEV_MODE=true` in template variables
2. Sets `MCP_KIT_PATH` to local repository path
3. Generated files import from local `dist/` directory
4. package.json scripts use local CLI binary

**Examples**:
```bash
# ✅ Testing toolkit
mcp-server-kit new server --name test-static-resource --dev

# ✅ Production server
mcp-server-kit new server --name weather-api
```

#### --template <id>

**Purpose**: Choose which template to use

**Default**: `cloudflare-remote`

**Available templates**:
```bash
mcp-server-kit list templates
```

**Example**:
```bash
mcp-server-kit new server --name my-server --template cloudflare-remote
```

#### --output <path>

**Purpose**: Specify output directory for the new project

**Default**: Current directory

**When to use**:
- Creating projects in /tmp for testing
- Organizing projects in custom directories
- CI/CD pipelines with specific paths

**Examples**:
```bash
# Create in /tmp for testing
mcp-server-kit new server --name test-project --output /tmp --dev

# Create in custom directory
mcp-server-kit new server --name my-api --output ~/projects/mcp-servers

# Create with relative path
mcp-server-kit new server --name my-server --output ../other-directory
```

**Next Steps**: The "next steps" message will show the correct path to cd into.

#### --port <number>

**Purpose**: Set development server port

**Default**: `8788`

**Example**:
```bash
mcp-server-kit new server --name my-server --port 3000
```

#### --no-install

**Purpose**: Skip automatic `npm install`

**When to use**:
- CI/CD pipelines with custom install steps
- Offline environments
- Debugging scaffolding without dependencies

**Example**:
```bash
mcp-server-kit new server --name my-server --no-install
cd my-server
npm install  # Manual install
```

### Complete Examples

**Basic production server**:
```bash
mcp-server-kit new server --name my-weather-api
cd my-weather-api
# npm install and cf-typegen run automatically
npm run dev
```

**Testing toolkit locally**:
```bash
mcp-server-kit new server --name test-project --dev --no-install
cd test-project
npm install
# cf-typegen runs automatically
npm run type-check
npm run test:unit
```

**Custom output directory**:
```bash
mcp-server-kit new server \
  --name my-server \
  --output /tmp/test-servers \
  --dev
```

**Custom port and template**:
```bash
mcp-server-kit new server \
  --name custom-server \
  --port 9000 \
  --template cloudflare-remote
```

---

## add tool

**Purpose**: Add a new tool (action/operation) to your MCP server

**Syntax**:
```bash
mcp-server-kit add tool <name> [options]
```

### Arguments

| Argument | Format | Example |
|----------|--------|---------|
| `name` | kebab-case | `search-users`, `send-email` |

### Flags

| Flag | Default | Purpose |
|------|---------|---------|
| `--description <desc>` | "TODO: Add description" | Tool description |
| `--no-tests` | false | Skip test generation |
| `--no-register` | false | Skip auto-registration |

### What It Generates

1. **src/tools/{name}.ts** - Tool implementation
2. **test/unit/tools/{name}.test.ts** - Unit tests
3. **test/integration/specs/{name}.yaml** - Integration test
4. **Auto-registers** in `src/index.ts`

### Examples

**Basic tool**:
```bash
mcp-server-kit add tool weather --description "Get weather information"
```

**Skip tests** (manual testing):
```bash
mcp-server-kit add tool experimental-feature --no-tests
```

**Skip auto-registration** (custom setup):
```bash
mcp-server-kit add tool advanced-tool --no-register
```

### Tool Implementation Pattern

Generated file includes:
- Zod schema for parameter validation
- Async handler function
- Error handling template
- Response structure
- Example implementation comments

---

## add prompt

**Purpose**: Add a new prompt (AI behavior template) to your MCP server

**Syntax**:
```bash
mcp-server-kit add prompt <name> [options]
```

### Arguments

| Argument | Format | Example |
|----------|--------|---------|
| `name` | kebab-case | `code-review`, `explain-api` |

### Flags

| Flag | Default | Purpose |
|------|---------|---------|
| `--description <desc>` | "TODO: Add description" | Prompt description |
| `--no-tests` | false | Skip test generation |
| `--no-register` | false | Skip auto-registration |

### What It Generates

1. **src/prompts/{name}.ts** - Prompt implementation
2. **test/unit/prompts/{name}.test.ts** - Unit tests
3. **test/integration/specs/{name}.yaml** - Integration test
4. **Auto-registers** in `src/index.ts`

### ⚠️ Critical Limitation

**Prompt arguments MUST be strings only** (MCP SDK limitation)

❌ **Don't use**:
```typescript
const ArgsSchema = z.object({
  detailed: z.boolean(),  // ❌ Booleans don't work!
  level: z.number(),      // ❌ Numbers don't work!
});
```

✅ **Use instead**:
```typescript
const ArgsSchema = z.object({
  style: z.enum(["quick", "detailed"]),  // ✅ String enum
  language: z.string().optional(),        // ✅ Plain string
});
```

### Examples

**Basic prompt**:
```bash
mcp-server-kit add prompt code-review \
  --description "Provide code review feedback"
```

**API documentation prompt**:
```bash
mcp-server-kit add prompt api-explainer \
  --description "Explain API endpoint usage"
```

---

## add resource

**Purpose**: Add a new resource (data exposure) to your MCP server

**Syntax**:
```bash
mcp-server-kit add resource <name> [options]
```

### Arguments

| Argument | Format | Example |
|----------|--------|---------|
| `name` | kebab-case | `server-status`, `user-profile` |

### Flags

| Flag | Default | Purpose |
|------|---------|---------|
| `--description <desc>` | "TODO: Add description" | Resource description |
| `--static` | **Default** | Static resource (fixed URI) |
| `--dynamic` | false | Dynamic resource (URI with {variables}) |
| `--uri-pattern <pattern>` | auto | Custom URI pattern |
| `--no-tests` | false | Skip test generation |
| `--no-register` | false | Skip auto-registration |

### 🚨 CRITICAL: Static vs Dynamic

**Default is STATIC** (simpler, more common)

#### Static Resources (~70% of use cases)

**When to use**: Fixed URI, no template variables

**Examples**:
- `config://app` - Application configuration
- `status://server` - Server health status
- `docs://api` - API documentation
- `metrics://realtime` - Live metrics

**Command**:
```bash
# Default is static
mcp-server-kit add resource server-status

# Explicit static
mcp-server-kit add resource app-config --static

# Custom static URI
mcp-server-kit add resource docs --uri-pattern "docs://api/reference"
```

**Generated code**:
```typescript
server.resource(
  "server-status",
  "config://server-status",  // ← Plain string
  { description: "...", mimeType: "application/json" },
  async (uri) => {  // ← No variables parameter
    // Simple implementation
    return {
      contents: [{
        uri: uri.href,
        text: JSON.stringify({ status: "healthy" }),
        mimeType: "application/json"
      }]
    };
  }
);
```

#### Dynamic Resources (~30% of use cases)

**When to use**: URI with template variables like `{id}`, `{userId}`, `{date}`

**Examples**:
- `user://{id}` - User profiles by ID
- `logs://{date}` - Logs by date
- `db://{table}/{id}` - Database records

**Command**:
```bash
# Explicit dynamic
mcp-server-kit add resource user-profile --dynamic

# Custom dynamic URI
mcp-server-kit add resource user --uri-pattern "user://{id}"
```

**Generated code**:
```typescript
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

server.resource(
  "user-profile",
  new ResourceTemplate("resource://{id}", {  // ← ResourceTemplate wrapper
    list: async () => {
      // Return available resources
      return { resources: [] };
    },
    complete: {
      id: async (value) => {
        // Autocomplete suggestions
        return [];
      }
    }
  }),
  { description: "...", mimeType: "application/json" },
  async (uri, variables) => {  // ← variables parameter
    const id = variables.id as string;  // ← Extract from variables
    return {
      contents: [{
        uri: uri.href,
        text: JSON.stringify({ id, data: "..." }),
        mimeType: "application/json"
      }]
    };
  }
);
```

### Complete Examples

**Static server status**:
```bash
mcp-server-kit add resource server-status \
  --description "Get server health and metrics"
```

**Dynamic user profiles**:
```bash
mcp-server-kit add resource user-profile \
  --dynamic \
  --description "Get user profile by ID"
```

**Custom URI patterns**:
```bash
# Static with custom URI
mcp-server-kit add resource api-docs \
  --uri-pattern "docs://api/v1/reference"

# Dynamic with custom URI
mcp-server-kit add resource database-record \
  --uri-pattern "db://{table}/{id}"
```

---

## add-auth

**Purpose**: Add authentication scaffolding to your MCP server

**Syntax**:
```bash
mcp-server-kit add-auth <provider> [options]
```

### Required Arguments

| Argument | Options | Purpose |
|----------|---------|---------|
| `provider` | `stytch`, `auth0`, `workos` | Authentication provider to integrate |

### Supported Providers

#### Stytch
Modern authentication platform with passwordless options, session management, and security features.

**Use when**:
- You want modern, passwordless authentication
- You need flexible authentication methods (magic links, OAuth, biometrics)
- You're building consumer-facing applications

#### Auth0
Enterprise-grade identity platform with extensive customization and integrations.

**Use when**:
- You need enterprise features (SSO, SAML, AD integration)
- You require extensive customization
- You're building B2B applications

#### WorkOS
B2B-focused authentication with SSO and directory sync.

**Use when**:
- You're building B2B SaaS applications
- You need enterprise SSO (SAML, OIDC)
- You require directory sync (SCIM)

### Optional Flags

| Flag | Default | Purpose |
|------|---------|---------|
| `--platform <platform>` | `cloudflare` | Target platform (currently only `cloudflare`) |
| `--force` | false | Overwrite existing auth files |
| `--backup` | true | Create backup before changes |
| `--dry-run` | false | Preview changes without modifying files |
| `--json` | false | Output results as JSON |

### What It Generates

**Auth Files Created**:
1. `src/auth/types.ts` - TypeScript interfaces and error classes
2. `src/auth/config.ts` - Provider configuration helpers
3. `src/auth/providers/<provider>.ts` - Provider-specific integration

**Code Modifications**:
1. **src/index.ts** - Adds auth imports and middleware to fetch handler
2. **wrangler.jsonc** - Adds required environment variables

**Configuration Variables** (added to wrangler.jsonc):

**Stytch**:
```json
{
  "vars": {
    "STYTCH_PROJECT_ID": "",
    "STYTCH_SECRET": "",
    "STYTCH_ENV": "test"
  }
}
```

**Auth0**:
```json
{
  "vars": {
    "AUTH0_DOMAIN": "",
    "AUTH0_CLIENT_ID": "",
    "AUTH0_CLIENT_SECRET": ""
  }
}
```

**WorkOS**:
```json
{
  "vars": {
    "WORKOS_API_KEY": "",
    "WORKOS_CLIENT_ID": ""
  }
}
```

### Platform Support

**✅ Cloudflare Workers** (production-ready)
- Anchor-based code transformation
- Comprehensive validation with rollback
- Tested and production-ready

**⏳ Vercel Edge** (planned)
- Not yet implemented
- Will be added in future release

### How It Works

**1. Pre-Validation**
- Checks project structure
- Verifies no existing auth code
- Creates backup if requested

**2. Code Transformation**
- Uses anchor-based insertion (not regex)
- Adds auth imports to src/index.ts
- Inserts middleware at correct location
- Updates wrangler.jsonc with environment variables

**3. Post-Validation**
- Verifies all auth files exist
- Checks imports properly added
- Validates middleware placement
- Ensures environment variables configured
- Runs TypeScript type checking

**4. Automatic Rollback**
If any validation fails, automatically restores from backup.

### Examples

**Add Stytch auth**:
```bash
mcp-server-kit add-auth stytch
```

**Add Auth0 with force overwrite**:
```bash
mcp-server-kit add-auth auth0 --force
```

**Preview WorkOS changes without applying**:
```bash
mcp-server-kit add-auth workos --dry-run
```

**Add auth with JSON output**:
```bash
mcp-server-kit add-auth stytch --json
```

### After Adding Auth

**1. Configure Credentials**

Edit `wrangler.jsonc` and add your actual credentials:

```jsonc
{
  "vars": {
    "STYTCH_PROJECT_ID": "project-test-...",
    "STYTCH_SECRET": "secret_test_...",
    "STYTCH_ENV": "test"
  }
}
```

**2. Customize Middleware** (optional)

Edit `src/index.ts` to customize authentication behavior:
- Add role-based access control
- Customize error responses
- Add custom claims validation

**3. Test Authentication**

```bash
# Start dev server
npm run dev

# Test with auth header
curl http://localhost:8788/sse \
  -H "Authorization: Bearer <token>"
```

### Common Errors and Fixes

**Error: "Auth already exists"**
```bash
# Use --force to overwrite
mcp-server-kit add-auth stytch --force
```

**Error: "Platform not supported"**
- Currently only Cloudflare Workers is supported
- Vercel Edge support coming in future release

**Error: "Validation failed"**
- Changes are automatically rolled back
- Check error messages for specific issues
- Run `mcp-server-kit validate` for details

### Best Practices

✅ **DO**:
- Use `--dry-run` first to preview changes
- Keep backup enabled (default)
- Configure actual credentials after scaffolding
- Test authentication before deploying

❌ **DON'T**:
- Don't commit credentials to git (use .env or secrets)
- Don't skip validation by forcing changes
- Don't manually modify generated auth files unless necessary

---

## validate

**Purpose**: Validate project structure and configuration

**Syntax**:
```bash
mcp-server-kit validate [options]
```

### Flags

| Flag | Purpose |
|------|---------|
| `--strict` | Fail on warnings (not just errors) |

### What It Checks

1. **Project Structure**
   - package.json exists and valid
   - Required directories present
   - .mcp-template.json valid (if exists)

2. **wrangler.jsonc Configuration**
   - Valid JSONC syntax
   - Durable Objects bindings configured
   - MCP_OBJECT binding exists
   - Migrations configured

3. **Source Files**
   - src/index.ts exists
   - Tools properly exported
   - Prompts properly exported
   - Resources properly exported

### Examples

**Basic validation**:
```bash
npm run validate
```

**Strict mode** (fail on warnings):
```bash
npm run validate -- --strict
```

### Common Errors and Fixes

**Error: ".mcp-template.json not found"**
- Not critical (optional file)
- Generated automatically when using `add` commands

**Error: "MCP_OBJECT binding missing"**
```bash
# Fix wrangler.jsonc:
{
  "durable_objects": {
    "bindings": [
      { "name": "MCP_OBJECT", "class_name": "McpAgent" }
    ]
  }
}
```

**Error: "src/index.ts not found"**
- Scaffolding incomplete
- Re-run `mcp-server-kit new server`

---

## list

**Purpose**: List project components or available templates

**Syntax**:
```bash
mcp-server-kit list <type>
```

### Available Types

#### list tools

Lists all tools in the project with registration and test status.

**Syntax**:
```bash
mcp-server-kit list tools [--json] [--filter <status>]
```

**Flags**:
- `--json` - Output as JSON
- `--filter registered|unregistered|tested|untested` - Filter by status

**Example output**:
```
Found 3 tools:

NAME              | REG | UNIT | INT | FILE
=====================================================================
api-client        |  ✓  |  ✓  |  ✓  | src/tools/api-client.ts
                    API client for external services
weather-api       |  ✓  |  ✓  |  ✓  | src/tools/weather-api.ts
                    Get weather information

Summary:
  Registered:       2/2
  Unit tests:       2/2
  Integration tests: 2/2
```

#### list prompts

Lists all prompts in the project with registration and test status.

**Syntax**:
```bash
mcp-server-kit list prompts [--json] [--filter <status>]
```

**Flags**:
- `--json` - Output as JSON
- `--filter registered|unregistered|tested|untested` - Filter by status
- `--show-examples` - Include example prompts (prefixed with _example)

**Example output**:
```
Found 2 prompts:

NAME            | REG | UNIT | INT | FILE
================================================================
code-reviewer   |  ✓  |  ✓  |  ✓  | src/prompts/code-reviewer.ts
                  Review code quality
test-generator  |  ✓  |  ✓  |  ✓  | src/prompts/test-generator.ts
                  Generate unit tests

Summary:
  Registered:       2/2
  Unit tests:       2/2
  Integration tests: 2/2
```

#### list resources

Lists all resources in the project with registration and test status.

**Syntax**:
```bash
mcp-server-kit list resources [--json] [--filter <status>]
```

**Flags**:
- `--json` - Output as JSON
- `--filter registered|unregistered|tested|untested` - Filter by status
- `--show-examples` - Include example resources (prefixed with _example)

**Example output**:
```
Found 2 resources:

NAME       | REG | UNIT | INT | FILE
=========================================================
config     |  ✓  |  ✓  |  ✓  | src/resources/config.ts
             Application configuration
user-data  |  ✓  |  ✓  |  ✓  | src/resources/user-data.ts
             User data by ID

Summary:
  Registered:       2/2
  Unit tests:       2/2
  Integration tests: 2/2
```

#### list templates

Lists available templates for creating new servers.

**Syntax**:
```bash
mcp-server-kit list templates
```

**Example output**:
```
Available templates:
  - cloudflare-remote (default)
```

---

## Common Command Combinations

### Complete Project Setup
```bash
# 1. Create project (npm install and cf-typegen run automatically)
mcp-server-kit new server --name my-api

# 2. Navigate to project
cd my-api

# 3. Add components
npm run tools:add tool search
npm run tools:add prompt reviewer
npm run tools:add resource config --static

# 4. Validate and verify registration
npm run validate
mcp-server-kit list tools
mcp-server-kit list prompts
mcp-server-kit list resources

# 5. Test
npm run type-check
npm run test:unit

# 6. Run
npm run dev
```

### Quick Testing Workflow
```bash
# 1. Create test project
mcp-server-kit new server --name test-feature --dev

# 2. Navigate (cf-typegen runs automatically)
cd test-feature

# 3. Verify and test
npm run type-check
npm test
mcp-server-kit list tools
```

---

## Troubleshooting

### Command Not Found
```bash
# Check installation
npm list -g mcp-server-kit

# Or use npx
npx mcp-server-kit --help
```

### Permission Denied
```bash
# Fix permissions
chmod +x ./bin/mcp-server-kit.js

# Or use node directly
node ./bin/mcp-server-kit.js --help
```

### Import Errors After Scaffolding
```bash
# cf-typegen runs automatically, but if you need to re-run it:
npm run cf-typegen

# Or reinstall dependencies (which will re-run cf-typegen)
rm -rf node_modules package-lock.json
npm install
```
