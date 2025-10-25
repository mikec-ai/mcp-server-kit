# CLI Command Reference

Complete reference for all `mcp-server-kit` CLI commands.

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
  [--no-install] \
  [--pm npm|pnpm|yarn|bun]
```

**Options:**

- `--name <name>` **(required)** - Project name (lowercase with hyphens recommended)
- `--template <id>` - Template to use (default: `cloudflare-remote`)
- `--description <desc>` - Project description
- `--port <port>` - Development server port (default: `8788`)
- `--no-install` - Skip dependency installation
- `--pm <manager>` - Package manager to use (default: `npm`)

**Examples:**

```bash
# Basic usage
mcp-server-kit new server --name my-server

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

## Tips for AI Agents

### Recommended Workflow

1. **Create project:** `mcp-server-kit new server --name <name>`
2. **Add tools:** `mcp-server-kit add tool <name> --description "<desc>"`
3. **Implement logic:** Edit generated `src/tools/<name>.ts` file
4. **Validate:** `mcp-server-kit validate`
5. **Fix issues:** Address any validation errors
6. **Test:** Run `npm run test:unit`

### Best Practices

- Always run `validate` before testing
- Use `list tools` to see project status
- Let CLI handle file creation and registration
- Focus on implementing tool logic (TODO markers show where)
- Use `--fix` flag to auto-correct simple issues

---

## See Also

- [Template System Guide](./TEMPLATES.md) - Creating custom templates
- [Testing Guide](./TESTING.md) - Writing and running tests
- [Main README](../README.md) - Project overview
