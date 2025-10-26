# mcp-server-kit

**Extensible scaffolding tool and test harness for Model Context Protocol (MCP) servers**

Create production-ready MCP servers in seconds with built-in testing infrastructure. Supports multiple deployment targets (Cloudflare Workers, Vercel Edge, Node.js) through an extensible template system.

## Features

- 🚀 **Quick Scaffolding** - Generate complete MCP server projects with one command
- 🧪 **Built-in Testing** - Integrated test harness with declarative YAML test specs
- 🔌 **Extensible Templates** - Plugin architecture for multiple MCP frameworks
- 📦 **Production Ready** - Includes TypeScript, testing, linting, and deployment config
- 🤖 **Agent-Optimized** - Built specifically for AI agents with auto-scaffolding, examples, and validation
- 🛠️ **Development Tools** - Add tools/prompts/resources, validate projects, list components, all from CLI
- 📚 **Rich Examples** - Comprehensive example tools and utilities showing best practices

## For AI Agents 🤖

**This toolkit is specifically optimized for AI agent development.** It automates the mechanical tasks agents forget (file creation, registration, imports) while preserving flexibility for creative problem-solving.

### Agent Workflow

1. **Scaffold** - Let the CLI handle boilerplate
2. **Implement** - Focus on tool logic (the creative part)
3. **Validate** - Catch issues automatically
4. **Test** - Use provided test utilities

```bash
# 1. Create project
mcp-server-kit new server --template cloudflare-remote --name my-server

# 2. Add tools, prompts, and resources (auto-scaffolds everything)
cd my-server
mcp-server-kit add tool weather --description "Get weather data"
mcp-server-kit add prompt code-reviewer --description "Review code quality"
mcp-server-kit add resource snippet --description "Code snippet by ID"
mcp-server-kit add resource config --static --description "App configuration"

# 3. Implement (TODO markers show what to code)
# Edit src/tools/weather.ts, src/prompts/code-reviewer.ts, etc.

# 4. Validate (catches missed registrations, tests, etc.)
mcp-server-kit validate

# 5. Test
npm run test:unit
npm run integration:run
```

**What agents get:**
- Example tools showing all patterns
- Optional utility helpers
- Auto-registration (no manual import management)
- Validation catching common mistakes
- Comprehensive inline documentation

---

## Quick Start

### Installation

```bash
npm install -g mcp-server-kit
```

### Create Your First MCP Server

```bash
# Scaffold a new Cloudflare Workers MCP server
mcp-server-kit new server \
  --name my-mcp-server \
  --template cloudflare-remote \
  --description "My awesome MCP server"

# Navigate to the project
cd my-mcp-server

# Start development server
npm run dev

# Server runs at http://localhost:8788/sse
```

**Testing mcp-server-kit itself?** Use the `--dev` flag to use local mcp-server-kit paths:
```bash
mcp-server-kit new server --name test-project --dev
```

### Verify It Works

```bash
# Check health endpoint
curl http://localhost:8788/health

# Run unit tests
npm run test:unit

# Run integration tests
npm run integration:run

# Validate project structure
mcp-server-kit validate
```

## What's Included in a Scaffolded Project

Every scaffolded project includes:

- ✅ **MCP Server** - Complete server implementation with example tools
- ✅ **Unit Tests** - Test infrastructure with Vitest and test utilities
- ✅ **Integration Tests** - Declarative YAML test specs using the test harness
- ✅ **TypeScript** - Strict mode configuration with proper types
- ✅ **Code Quality** - Biome for formatting and linting
- ✅ **Deployment** - Ready to deploy (Cloudflare, Vercel, etc.)
- ✅ **Documentation** - README with "For AI Agents" section
- ✅ **Example Tools** - Comprehensive example files
- ✅ **Utility Libraries** - Optional helpers
- ✅ **Development Scripts** - npm shortcuts for common tasks

## Architecture

```
mcp-server-kit/
├── src/
│   ├── harness/              # Portable test harness (framework-agnostic)
│   │   ├── types/            # TypeScript interfaces
│   │   ├── assertions/       # Test assertion implementations
│   │   ├── reporters/        # Output formatters
│   │   ├── validation/       # Zod schemas
│   │   └── runner.ts         # Test execution engine
│   │
│   └── core/
│       ├── cli/              # CLI commands
│       ├── commands/         # Command implementations
│       └── template-system/  # Extensible template system
│
└── templates/                # Template plugins
    ├── cloudflare-remote/    # Cloudflare Workers template
    ├── vercel-edge/          # (Coming soon)
    └── node-stdio/           # (Coming soon)
```

## Key Design Principles

### 1. **Template-Driven Extensibility**

Each MCP framework is a self-contained template plugin. Adding support for a new framework requires only creating a new template directory—no core code changes.

### 2. **Framework-Agnostic Test Harness**

The test harness uses dependency injection (`IMCPTestClient` interface) to remain portable across different MCP implementations.

### 3. **Declarative Testing**

Write tests in simple YAML files instead of code:

```yaml
name: "Test echo tool"
tool: "echo"
arguments:
  message: "Hello, MCP!"

assertions:
  - type: "success"
  - type: "response_time_ms"
    max: 3000
  - type: "contains_text"
    text: "Hello, MCP!"
```

## Documentation

**For AI Agents:**
- **[CLI Guide](./.claude/skills/mcp-server-kit-cli/SKILL.md)** - Quick reference with decision trees
- **[CLI Commands](./.claude/skills/mcp-server-kit-cli/CLI-COMMANDS.md)** - Complete command documentation
- **[Testing Guide](./.claude/skills/mcp-server-kit-cli/TESTING.md)** - Testing the toolkit

**For MCP Development** (in generated projects):
- **[Test Harness API](./src/harness/README.md)** - Detailed test harness documentation

## CLI Commands

Quick reference (see [CLI Guide](./.claude/skills/mcp-server-kit-cli/SKILL.md) for details):

```bash
# Project creation
mcp-server-kit new server --name <name> --template <template> [--output <path>]

# Development commands (for AI agents)
mcp-server-kit add tool <name> --description "<desc>"
mcp-server-kit add prompt <name> --description "<desc>"
mcp-server-kit add resource <name> --description "<desc>" [--static]
mcp-server-kit validate [--strict] [--fix]
mcp-server-kit list tools [--json]
mcp-server-kit list prompts [--json]
mcp-server-kit list resources [--json]

# Template management
mcp-server-kit template list
mcp-server-kit template info <template-id>
mcp-server-kit template validate <template-id>
```

## Development

### Building from Source

```bash
git clone https://github.com/MikeC-A6/mcp-server-kit.git
cd mcp-server-kit
npm install
npm run build
```

### Project Structure

- **`src/harness/`** - Portable test harness (zero dependencies on core)
- **`src/core/`** - CLI and template system
- **`templates/`** - Template plugins
- **`test/`** - Unit and integration tests
- **`.claude/skills/`** - Agent guidance and documentation

### Running Tests

```bash
# Unit tests (fast)
npm run test:unit

# E2E template tests (slow)
npm run test:e2e

# Type checking
npm run type-check
```

## Contributing

We welcome contributions! Areas we'd love help with:

- **New Templates** - Add support for Vercel, Deno, etc.
- **Test Harness Features** - New assertion types, reporters
- **Documentation** - Guides, examples, tutorials
- **Bug Fixes** - See [issues](https://github.com/MikeC-A6/mcp-server-kit/issues)

## License

MIT

## Resources

- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [CLI Guide](./.claude/skills/mcp-server-kit-cli/SKILL.md)
- [CLI Commands](./.claude/skills/mcp-server-kit-cli/CLI-COMMANDS.md)
- [Testing Guide](./.claude/skills/mcp-server-kit-cli/TESTING.md)

---

**Built for Agents, by Agents** 🤖
