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
- Example tools showing all patterns (_example-simple.ts, _example-validated.ts, _example-async.ts)
- Optional utility helpers (mcp-helpers.ts, validation.ts, test-utils.ts)
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
- ✅ **Example Tools** - Three comprehensive example files (_example-simple.ts, _example-validated.ts, _example-async.ts)
- ✅ **Utility Libraries** - Optional helpers (mcp-helpers.ts, validation.ts)
- ✅ **Test Utilities** - Testing helpers for Vitest (test-utils.ts)
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
│       └── template-system/  # Extensible template system
│           ├── registry.ts   # Template discovery
│           ├── processor.ts  # Scaffolding engine
│           └── types.ts      # Template interfaces
│
└── templates/                # Template plugins
    ├── cloudflare-remote/    # Cloudflare Workers template
    ├── vercel-edge/          # (Future) Vercel Edge template
    └── node-stdio/           # (Future) Node.js stdio template
```

## Key Design Principles

### 1. **Template-Driven Extensibility**

Each MCP framework is a self-contained template plugin. Adding support for a new framework requires only creating a new template directory—no core code changes.

```
templates/my-framework/
├── template.config.json      # Template metadata
├── files/                    # Files to scaffold
│   ├── src/
│   ├── test/
│   └── package.json.hbs     # Handlebars templates
└── hooks/                    # Optional lifecycle hooks
    ├── pre-scaffold.js
    └── post-scaffold.js
```

### 2. **Framework-Agnostic Test Harness**

The test harness uses dependency injection (`IMCPTestClient` interface) to remain portable across different MCP implementations:

```typescript
// Use harness independently
import { TestRunner, loadTestSpec } from 'mcp-server-kit/harness';

const client = new MyMCPClient();
const runner = new TestRunner(client);
await runner.connect();

const spec = await loadTestSpec('test.yaml');
const result = await runner.runTest(spec);

console.log(result.passed ? 'PASS' : 'FAIL');
```

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

## Available Templates

### Cloudflare Workers (`cloudflare-remote`)

**Runtime**: Cloudflare Workers
**Transport**: SSE, HTTP
**Deployment**: Remote (Cloudflare Edge Network)

Features:
- Zero cold starts (edge deployment)
- Built-in TypeScript support
- Dual transport (SSE + HTTP)
- Integration test harness pre-configured

```bash
mcp-server-kit new server --template cloudflare-remote --name my-server
```

### Coming Soon

- **`vercel-edge`** - Vercel Edge Functions
- **`node-stdio`** - Node.js stdio server (local)
- **`deno-fresh`** - Deno Fresh server

## Using the Test Harness Independently

The test harness can be used in any MCP project:

```typescript
import { TestRunner, loadTestSpec } from 'mcp-server-kit/harness';

// 1. Implement IMCPTestClient interface
class MyMCPClient implements IMCPTestClient {
  async connect() { /* ... */ }
  async disconnect() { /* ... */ }
  async callTool(name, args) { /* ... */ }
  // ...
}

// 2. Create runner and load tests
const client = new MyMCPClient();
const runner = new TestRunner(client);
const specs = await loadTestSpec('tests/*.yaml');

// 3. Run tests
await runner.connect();
const results = await runner.runTests(specs);
console.log(results);
await runner.disconnect();
```

## Template System API

### Programmatic Scaffolding

```typescript
import { TemplateRegistry, TemplateProcessor } from 'mcp-server-kit';

// 1. Create registry and processor
const registry = new TemplateRegistry();
const processor = new TemplateProcessor(registry);

// 2. Scaffold a project
const result = await processor.scaffold({
  template: 'cloudflare-remote',
  targetDir: './my-server',
  variables: {
    PROJECT_NAME: 'my-server',
    DESCRIPTION: 'My MCP server',
    PORT: '8788',
  },
});

console.log(result.success ? 'Success!' : result.error);
```

### Template Discovery

```typescript
import { TemplateRegistry } from 'mcp-server-kit';

const registry = new TemplateRegistry();

// List all templates
const templates = await registry.listTemplates();

// Filter by capabilities
const remoteTemplates = await registry.listTemplates({
  deployment: 'remote',
  transport: 'sse',
});

// Get specific template
const template = await registry.getTemplate('cloudflare-remote');
console.log(template.config);
```

## Development

### Building from Source

```bash
git clone https://github.com/YOUR_USERNAME/mcp-server-kit.git
cd mcp-server-kit
npm install
npm run build
```

### Project Structure

- **`src/harness/`** - Portable test harness (zero dependencies on core)
- **`src/core/template-system/`** - Template registry and processor
- **`templates/`** - Template plugins
- **`test/unit/`** - Unit tests
- **`docs/`** - Documentation

### Adding a New Template

1. Create `templates/my-template/` directory
2. Add `template.config.json` with metadata
3. Create `files/` directory with template files
4. Use `.hbs` extension for files needing variable substitution
5. Optionally add `hooks/` for custom lifecycle logic
6. Test with `mcp-server-kit new server --template my-template`

See [CREATING-TEMPLATES.md](./docs/CREATING-TEMPLATES.md) for full guide.

## CLI Commands

### Project Creation

#### `new server`

Scaffold a new MCP server:

```bash
mcp-server-kit new server \
  --name <project-name> \
  --template <template-id> \
  [--description <desc>] \
  [--port <port>] \
  [--no-install] \
  [--pm npm|pnpm|yarn]
```

### Development Commands (For AI Agents)

#### `add tool`

Auto-scaffold a new tool with tests and registration:

```bash
mcp-server-kit add tool weather --description "Get weather information"

# This automatically:
# - Creates src/tools/weather.ts with TODO markers
# - Generates test/unit/tools/weather.test.ts
# - Generates test/integration/specs/weather.yaml
# - Registers tool in src/index.ts
# - Updates .mcp-template.json metadata
```

Options:
- `--description` - Tool description (default: "TODO: Add description")
- `--no-tests` - Skip test file generation
- `--no-register` - Don't auto-register in index.ts

#### `validate`

Check project structure and configuration:

```bash
mcp-server-kit validate [--strict] [--fix]

# Checks:
# - All tools are registered in index.ts
# - Test files exist for all tools
# - Integration test YAMLs are valid
# - Metadata is in sync
```

Options:
- `--strict` - Fail on warnings (not just errors)
- `--fix` - Automatically fix issues where possible

#### `list tools`

Show all tools with status:

```bash
mcp-server-kit list tools [--json] [--filter <status>] [--show-examples]

# Example output:
# NAME       | REG | UNIT | INT | FILE
# ====================================================
# echo       |  ✓  |  ✓  |  ✓  | src/tools/echo.ts
# weather    |  ✓  |  ✗  |  ✓  | src/tools/weather.ts
```

Options:
- `--json` - Output as JSON
- `--filter` - Filter by status (all, registered, unregistered, tested, untested)
- `--show-examples` - Include example tools in output

### Template Management

#### `template list`

List available templates:

```bash
mcp-server-kit template list [--json]
```

#### `template info`

Show template details:

```bash
mcp-server-kit template info <template-id>
```

#### `template validate`

Validate a template:

```bash
mcp-server-kit template validate <template-id>
```

## Testing

### Test Assertion Types

The harness supports 7 assertion types:

- `success` - Verifies no error
- `error` - Verifies error occurred
- `contains_text` - Text search
- `not_contains_text` - Negative text search
- `response_time_ms` - Performance check
- `json_path` - JSONPath queries
- `regex_match` - Regex pattern matching

Example:

```yaml
assertions:
  - type: "success"
  - type: "json_path"
    path: "$.data.id"
    expected: "123"
  - type: "regex_match"
    pattern: "^\\d+ items"
```

## Contributing

We welcome contributions! Areas we'd love help with:

- **New Templates** - Add support for Vercel, Deno, etc.
- **Test Harness Features** - New assertion types, reporters
- **Documentation** - Guides, examples, tutorials
- **Bug Fixes** - See [issues](https://github.com/YOUR_USERNAME/mcp-server-kit/issues)

## License

MIT

## Resources

- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Test Harness Documentation](./src/harness/README.md)
- [Template System Guide](./docs/TEMPLATES.md)

---

**Built for Agents, by Agents** 🤖
