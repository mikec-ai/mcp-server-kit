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
npm install
npm run cf-typegen
npm run dev
```

**Testing toolkit locally**:
```bash
mcp-server-kit new server --name test-project --dev --no-install
cd test-project
npm install
npm run cf-typegen
npm run type-check
npm run test:unit
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
Lists all tools in the project

```bash
npm run tools:list
```

#### list templates
Lists available templates

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
# 1. Create project
mcp-server-kit new server --name my-api

# 2. Setup
cd my-api
npm install
npm run cf-typegen

# 3. Add components
npm run tools:add tool search
npm run tools:add prompt reviewer
npm run tools:add resource config --static

# 4. Validate
npm run validate

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

# 2. Setup and test
cd test-feature
npm install
npm run cf-typegen
npm run type-check
npm test
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
# Run type generation
npm run cf-typegen

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```
