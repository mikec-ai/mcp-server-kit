# CLI Command Reference

Complete reference for all `mcp-server-kit` CLI commands.

**Tip:** Run any command with `--help` to see detailed usage information:
```bash
mcp-server-kit new server --help
mcp-server-kit add tool --help
```

---

## Quick Reference

```bash
# Project Creation
mcp-server-kit new server --name <name> [--dev]

# Add Features
mcp-server-kit add tool <name> [--description <desc>]
mcp-server-kit add prompt <name> [--description <desc>]
mcp-server-kit add resource <name> [--static] [--uri-pattern <pattern>]

# Validation & Listing
mcp-server-kit validate [--strict] [--fix]
mcp-server-kit list tools [--filter <status>]

# Templates
mcp-server-kit template list
mcp-server-kit template info <id>
```

---

## Project Creation

### `new server`

Scaffold a new MCP server project from a template.

```bash
mcp-server-kit new server \
  --name <project-name> \
  --template <template-id> \
  [--description <desc>] \
  [--port <port>] \
  [--dev] \
  [--no-install] \
  [--pm npm|pnpm|yarn|bun]
```

**Options:**

- `--name <name>` **(required)** - Project name (lowercase with hyphens recommended)
- `--template <id>` - Template to use (default: `cloudflare-remote`)
- `--description <desc>` - Project description
- `--port <port>` - Development server port (default: `8788`)
- `--dev` - Use local mcp-server-kit for development/testing (recommended when testing toolkit itself)
- `--no-install` - Skip dependency installation
- `--pm <manager>` - Package manager to use (default: `npm`)

**Examples:**

```bash
# Basic usage
mcp-server-kit new server --name my-server

# Development mode (testing mcp-server-kit itself)
mcp-server-kit new server --name test-project --dev

# Full options
mcp-server-kit new server \
  --name weather-service \
  --template cloudflare-remote \
  --description "Weather data MCP server" \
  --port 3000 \
  --pm pnpm
```

---

## Development Commands

These commands help AI agents and developers add features to existing MCP server projects.

### `add tool`

Auto-scaffold a new tool with tests and registration.

```bash
mcp-server-kit add tool <tool-name> [options]
```

**Options:**

- `<tool-name>` **(required)** - Tool name (snake_case or camelCase)
- `--description <desc>` - Tool description (default: "TODO: Add description")
- `--no-tests` - Skip test file generation
- `--no-register` - Don't auto-register in index.ts

**What it does:**

1. Creates `src/tools/<tool-name>.ts` with TODO markers
2. Generates `test/unit/tools/<tool-name>.test.ts`
3. Generates `test/integration/specs/<tool-name>.yaml`
4. Registers tool in `src/index.ts` automatically
5. Updates `.mcp-template.json` metadata

**Examples:**

```bash
# Add weather tool
mcp-server-kit add tool weather --description "Get weather information"

# Add tool without tests
mcp-server-kit add tool helper --no-tests

# Add tool without auto-registration
mcp-server-kit add tool experimental --no-register
```

---

### `add prompt`

Auto-scaffold a new prompt with tests and registration.

```bash
mcp-server-kit add prompt <prompt-name> [options]
```

**Options:**

- `<prompt-name>` **(required)** - Prompt name (snake_case or camelCase)
- `--description <desc>` - Prompt description (default: "TODO: Add description")
- `--no-tests` - Skip test file generation
- `--no-register` - Don't auto-register in index.ts

**What it does:**

1. Creates `src/prompts/<prompt-name>.ts` with TODO markers
2. Generates `test/unit/prompts/<prompt-name>.test.ts`
3. Generates `test/integration/specs/prompts/<prompt-name>.yaml`
4. Registers prompt in `src/index.ts` automatically
5. Updates `.mcp-template.json` metadata

**Examples:**

```bash
# Add code reviewer prompt
mcp-server-kit add prompt code-reviewer --description "Review code quality"

# Add prompt without tests
mcp-server-kit add prompt helper --no-tests

# Add prompt without auto-registration
mcp-server-kit add prompt experimental --no-register
```

---

### `add resource`

Auto-scaffold a new resource with tests and registration.

```bash
mcp-server-kit add resource <resource-name> [options]
```

**Options:**

- `<resource-name>` **(required)** - Resource name (snake_case or camelCase)
- `--description <desc>` - Resource description (default: "TODO: Add description")
- `--uri-pattern <pattern>` - Custom URI pattern (e.g., "config://app-config" or "resource://{id}")
- `--static` - Create a static resource (fixed URI, no variables). Default is dynamic with variables.
- `--no-tests` - Skip test file generation
- `--no-register` - Don't auto-register in index.ts

**What it does:**

1. Creates `src/resources/<resource-name>.ts` with TODO markers
2. Generates `test/unit/resources/<resource-name>.test.ts`
3. Generates `test/integration/specs/resources/<resource-name>.yaml`
4. Registers resource in `src/index.ts` automatically
5. Updates `.mcp-template.json` metadata

**Static vs Dynamic Resources:**

- **Static:** Fixed URI, no variables (e.g., `config://app-config`)
  - Handler signature: `async (uri) => { ... }`
  - Use `--static` flag

- **Dynamic:** Variable URI with parameters (e.g., `resource://{id}`)
  - Handler signature: `async (uri, variables) => { ... }`
  - Uses `ResourceTemplate` wrapper (default)

**Examples:**

```bash
# Add dynamic resource (with variables)
mcp-server-kit add resource snippet --description "Get code snippet by ID"

# Add static resource (no variables)
mcp-server-kit add resource app-config --static --description "Application configuration"

# Custom URI pattern
mcp-server-kit add resource user --uri-pattern "users://{userId}"

# Without tests
mcp-server-kit add resource temp --no-tests
```

---

### `validate`

Check project structure and configuration for common issues.

```bash
mcp-server-kit validate [options]
```

**Options:**

- `--strict` - Fail on warnings (not just errors)
- `--fix` - Automatically fix issues where possible

**What it checks:**

- ✅ All tools are registered in index.ts
- ✅ Test files exist for all tools
- ✅ Integration test YAMLs are valid
- ✅ Metadata is in sync with actual code
- ✅ No orphaned test files
- ✅ Tool naming conventions

**Examples:**

```bash
# Basic validation
mcp-server-kit validate

# Strict mode (fail on warnings)
mcp-server-kit validate --strict

# Auto-fix issues
mcp-server-kit validate --fix
```

---

### `list tools`

Show all tools in the project with their status.

```bash
mcp-server-kit list tools [options]
```

**Options:**

- `--json` - Output as JSON
- `--filter <status>` - Filter by status (all, registered, unregistered, tested, untested)
- `--show-examples` - Include example tools in output

**Example output:**

```
NAME       | REG | UNIT | INT | FILE
====================================================
echo       |  ✓  |  ✓  |  ✓  | src/tools/echo.ts
weather    |  ✓  |  ✗  |  ✓  | src/tools/weather.ts
health     |  ✓  |  ✓  |  ✓  | src/tools/health.ts
```

**Status indicators:**
- `REG` - Registered in index.ts
- `UNIT` - Has unit test file
- `INT` - Has integration test YAML

**Examples:**

```bash
# List all tools
mcp-server-kit list tools

# Only show unregistered tools
mcp-server-kit list tools --filter unregistered

# Get JSON output for scripts
mcp-server-kit list tools --json

# Include example tools
mcp-server-kit list tools --show-examples
```

---

## Template Management

### `template list`

List all available templates.

```bash
mcp-server-kit template list [--json]
```

**Options:**

- `--json` - Output as JSON

**Example output:**

```
Available Templates:

cloudflare-remote
  Name: Cloudflare Remote MCP
  Runtime: cloudflare-workers
  Transport: sse, http
  Deployment: remote
```

---

### `template info`

Show detailed information about a specific template.

```bash
mcp-server-kit template info <template-id>
```

**Example:**

```bash
mcp-server-kit template info cloudflare-remote
```

**Shows:**
- Template metadata
- Supported features
- Required variables
- Deployment target
- Example usage

---

### `template validate`

Validate a template's structure and configuration.

```bash
mcp-server-kit template validate <template-id>
```

**What it checks:**

- ✅ `template.config.json` is valid
- ✅ Required files exist
- ✅ Variable substitutions are correct
- ✅ Hooks are properly formatted
- ✅ Package.json templates are valid

**Example:**

```bash
mcp-server-kit template validate cloudflare-remote
```

---

## Global Options

These options work with any command:

- `--help`, `-h` - Show help for a command
- `--version`, `-v` - Show version number

**Examples:**

```bash
# Show help for specific command
mcp-server-kit new server --help

# Show version
mcp-server-kit --version
```

---

## Exit Codes

- `0` - Success
- `1` - Error (validation failed, template not found, etc.)
- `2` - Invalid arguments

---

## Common Workflows

### Building a Complete MCP Server

```bash
# 1. Create new project
mcp-server-kit new server --name my-service --dev

# 2. Add tools, prompts, and resources
cd my-service
mcp-server-kit add tool weather --description "Get weather data"
mcp-server-kit add prompt code-reviewer --description "Review code quality"
mcp-server-kit add resource snippet --description "Code snippet by ID"
mcp-server-kit add resource config --static --description "App configuration"

# 3. Implement business logic
# Edit src/tools/weather.ts, src/prompts/code-reviewer.ts, etc.

# 4. Validate and test
mcp-server-kit validate
npm run test:unit
npm run type-check

# 5. Run integration tests
npm run integration:run
```

### Quick Feature Addition

```bash
# Add a new tool with description
mcp-server-kit add tool calculate --description "Perform calculations"

# Implement the tool logic in src/tools/calculate.ts
# Tests are auto-generated and ready to run

# Validate everything still works
mcp-server-kit validate && npm run test:unit
```

### Debugging Issues

```bash
# Check what's wrong
mcp-server-kit validate

# See current project status
mcp-server-kit list tools

# Auto-fix simple issues
mcp-server-kit validate --fix

# Check type errors
npm run type-check
```

### Tips for AI Agents

#### Recommended Workflow

1. **Create project:** `mcp-server-kit new server --name <name> [--dev]`
2. **Add features:** Use `add tool`, `add prompt`, `add resource` commands
3. **Implement logic:** Edit generated files (look for TODO markers)
4. **Validate:** Run `mcp-server-kit validate` frequently
5. **Test:** Run `npm run test:unit` and `npm run type-check`
6. **Deploy:** Follow deployment guide in generated README.md

#### Best Practices

- **Always use `--help`** when unsure about command options
- **Use `--dev` flag** when testing mcp-server-kit itself
- **Run `validate`** before committing or testing
- **Use `list tools`** to see project status at a glance
- **Let CLI handle scaffolding** - don't create files manually
- **Focus on business logic** - TODO markers show where to code
- **Use `--static` flag** for resources with fixed URIs (no variables)

---

## See Also

- [Template System Guide](./TEMPLATES.md) - Creating custom templates
- [Testing Guide](./TESTING.md) - Writing and running tests
- [Main README](../README.md) - Project overview
