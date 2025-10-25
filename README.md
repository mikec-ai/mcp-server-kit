# mcp-server-kit

**Extensible scaffolding tool and test harness for Model Context Protocol (MCP) servers**

Create production-ready MCP servers in seconds with built-in testing infrastructure. Supports multiple deployment targets (Cloudflare Workers, Vercel Edge, Node.js) through an extensible template system.

## Features

- 🚀 **Quick Scaffolding** - Generate complete MCP server projects with one command
- 🧪 **Built-in Testing** - Integrated test harness with declarative YAML test specs
- 🔌 **Extensible Templates** - Plugin architecture for multiple MCP frameworks
- 📦 **Production Ready** - Includes TypeScript, testing, linting, and deployment config
- 🤖 **Agent-Optimized** - Built specifically for AI agents with auto-scaffolding, examples, and validation
- 🛠️ **Development Tools** - Add tools, validate projects, list tools, all from CLI
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

# 2. Add tools (auto-scaffolds everything)
cd my-server
mcp-server-kit add tool weather --description "Get weather data"

# 3. Implement (TODO markers show what to code)
# Edit src/tools/weather.ts - implement the actual logic

# 4. Validate (catches missed registrations, tests, etc.)
mcp-server-kit validate

# 5. Test
npm run test:unit
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

### Verify It Works

```bash
# Check health endpoint
curl http://localhost:8788/health

# Run integration tests (in another terminal)
npm run test:integration
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

- **[CLI Reference](./docs/CLI.md)** - Complete command-line documentation
- **[Template System Guide](./docs/TEMPLATES.md)** - Creating and using templates
- **[Testing Guide](./docs/TESTING.md)** - Writing and running tests
- **[Test Harness API](./src/harness/README.md)** - Detailed test harness documentation

## CLI Commands

Quick reference (see [CLI.md](./docs/CLI.md) for details):

```bash
# Project creation
mcp-server-kit new server --name <name> --template <template>

# Development commands (for AI agents)
mcp-server-kit add tool <name> --description "<desc>"
mcp-server-kit validate [--strict] [--fix]
mcp-server-kit list tools [--json]

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
- **`docs/`** - Documentation

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
- [CLI Reference](./docs/CLI.md)
- [Template System Guide](./docs/TEMPLATES.md)
- [Testing Guide](./docs/TESTING.md)

---

**Built for Agents, by Agents** 🤖
