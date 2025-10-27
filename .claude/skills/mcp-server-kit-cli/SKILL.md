---
name: mcp-server-kit-cli
description: Use mcp-server-kit CLI to scaffold and manage MCP servers. Provides command syntax, flag usage, and critical decision guidance for --dev, --static/--dynamic, and other context-dependent options. Use when creating servers, adding components, testing the toolkit, or troubleshooting CLI issues.
allowed-tools: Bash, Read, Write, Grep, Glob
---

# mcp-server-kit CLI

Complete guidance for using the mcp-server-kit command-line interface.

---

## 🚨 CRITICAL Decision Trees

### Decision 1: Are you testing mcp-server-kit itself?

**Question**: Are you developing/testing the mcp-server-kit toolkit, or building a production MCP server?

| Scenario | Use `--dev` Flag? | Why |
|----------|-------------------|-----|
| **Testing mcp-server-kit** | ✅ YES | Uses local paths instead of npm package |
| **Building production server** | ❌ NO | References published npm package |

**Examples**:
```bash
# ✅ Testing the toolkit
mcp-server-kit new server --name test-project --dev

# ✅ Production MCP server
mcp-server-kit new server --name my-weather-server
```

**What `--dev` does**:
- Generated `package.json`: Uses local mcp-server-kit path
- Generated `test/integration/cli.ts`: Imports from local dist/
- Validation scripts: Use local CLI binary
- Prevents "Cannot find package 'mcp-server-kit'" errors

---

### Decision 2: Static or Dynamic Resource?

**Question**: Does your resource URI have `{template variables}`?

| URI Pattern | Use Flag | Example |
|-------------|----------|---------|
| **No {variables}** | Default (static) | `config://app`, `status://server` |
| **Has {variables}** | `--dynamic` | `user://{id}`, `logs://{date}` |

**Why this matters**:
- Static (70% of cases): Simpler, no ResourceTemplate needed
- Dynamic (30% of cases): Requires ResourceTemplate wrapper + list callbacks

**Examples**:
```bash
# ✅ Static resource (default)
mcp-server-kit add resource server-status

# ✅ Dynamic resource (explicit)
mcp-server-kit add resource user-profile --dynamic

# ✅ Custom URI (auto-detects)
mcp-server-kit add resource config --uri-pattern "config://app"
mcp-server-kit add resource user --uri-pattern "user://{id}"
```

---

## Quick Command Reference

### Scaffolding

```bash
# Create new MCP server
mcp-server-kit new server --name <name> [--dev] [--template <id>]

# Add tool (action/operation)
mcp-server-kit add tool <name> --description "<desc>"

# Add prompt (AI behavior template)
mcp-server-kit add prompt <name> --description "<desc>"

# Add resource (data exposure)
mcp-server-kit add resource <name> [--static|--dynamic]

# Add authentication
mcp-server-kit add-auth <provider> [--platform cloudflare]
# Providers: stytch, auth0, workos
```

### Validation & Discovery

```bash
# Validate project structure
mcp-server-kit validate [--strict]

# List components
mcp-server-kit list tools
mcp-server-kit list prompts
mcp-server-kit list resources
mcp-server-kit list templates
```

---

## Common Workflows

### Workflow 1: Create Production MCP Server
```bash
# 1. Scaffold project
mcp-server-kit new server --name my-weather-server

# 2. Navigate (npm install runs automatically with cf-typegen)
cd my-weather-server

# 3. Add components
npm run tools:add tool weather --description "Get weather data"
npm run tools:add resource config --static

# 4. Develop
npm run dev
npm test
npm run validate
```

### Workflow 2: Test mcp-server-kit Toolkit
```bash
# 1. Scaffold test project with --dev flag
mcp-server-kit new server --name test-project --dev

# 2. Navigate (cf-typegen runs automatically)
cd test-project

# 3. Verify everything works
npm run type-check
npm run test:unit
npm run validate
```

### Workflow 3: Add Components Efficiently
```bash
# Tools (execute actions)
npm run tools:add tool search-users --description "Search users by query"
npm run tools:add tool send-email --description "Send email notification"

# Prompts (AI templates)
npm run tools:add prompt code-review --description "Review code quality"

# Resources (expose data)
npm run tools:add resource api-docs --static
npm run tools:add resource user-profile --dynamic
```

### Workflow 4: Add Authentication to Existing Project
```bash
# 1. Navigate to your MCP server project
cd my-server

# 2. Add authentication (choose provider)
mcp-server-kit add-auth stytch    # or auth0, workos

# 3. Verify scaffolding
# - Check src/auth/ directory created
# - Check auth imports added to src/index.ts
# - Check environment variables in wrangler.jsonc

# 4. Validate
npm run validate

# 5. Configure environment
# Add actual credentials to wrangler.jsonc or .env
```

### Workflow 5: Scaffold at Git Repository Root
```bash
# Problem: Creating nested subdirectories instead of at git root
# Solution: Navigate to git root first

# 1. Find and navigate to git root
cd $(git rev-parse --show-toplevel)

# 2. Scaffold project (will create at current directory)
mcp-server-kit new server --name my-server --dev

# 3. Result: Project created at /repo-root/my-server/
cd my-server

# Alternative: Use --output with git root
mcp-server-kit new server --name my-server --output $(git rev-parse --show-toplevel) --dev
```

---

## Flag Quick Reference

### Global Flags

| Flag | Purpose | When to Use |
|------|---------|-------------|
| `--dev` | Use local mcp-server-kit | Testing toolkit itself |
| `--help` | Show command help | Learning command options |

### new server Flags

| Flag | Default | Purpose |
|------|---------|---------|
| `--name <name>` | Required | Project name (kebab-case) |
| `--template <id>` | cloudflare-remote | Template to use |
| `--output <path>` | current directory | Output directory for project |
| `--dev` | false | Local development mode |
| `--port <port>` | 8788 | Dev server port |
| `--no-install` | false | Skip npm install |

### add resource Flags

| Flag | Default | Purpose |
|------|---------|---------|
| `--static` | Default | Static resource (fixed URI) |
| `--dynamic` | false | Dynamic resource (URI with {variables}) |
| `--uri-pattern <pattern>` | auto | Custom URI pattern |
| `--no-tests` | false | Skip test generation |

### add tool/prompt Flags

| Flag | Default | Purpose |
|------|---------|---------|
| `--description <desc>` | TODO | Component description |
| `--no-tests` | false | Skip test generation |
| `--no-register` | false | Skip auto-registration |

---

## When Things Go Wrong

### Error: "Cannot find package 'mcp-server-kit'"

**Cause**: Scaffolded without `--dev` flag but testing toolkit locally

**Fix**:
```bash
# Delete old project
rm -rf test-project

# Recreate with --dev flag
mcp-server-kit new server --name test-project --dev
```

### Error: "Resource not found" for dynamic resource

**Cause**: Used `{variables}` in URI without `--dynamic` flag or ResourceTemplate

**Fix**: See [CLI-COMMANDS.md](CLI-COMMANDS.md) resource section

---

## Detailed Documentation

For comprehensive command documentation, see:

- **[CLI-COMMANDS.md](CLI-COMMANDS.md)** - Every command with examples
- **[TESTING.md](TESTING.md)** - Testing the toolkit itself

---

## Best Practices

✅ **Always use `--dev` when testing mcp-server-kit**
✅ **Check your directory before scaffolding** - navigate to git root first
✅ **cf-typegen runs automatically - no manual step needed**
✅ **Use `validate` command to catch issues early**
✅ **Default to static resources (simpler)**
✅ **Check `--help` when unsure about flags**
✅ **Use `list` commands to verify registration status**

❌ **Don't commit without running `validate`**
❌ **Don't scaffold without considering `--dev`**
❌ **Don't create projects in nested subdirectories**
❌ **Don't use dynamic resources for fixed URIs**
