# Template System Guide

The template system provides an extensible plugin architecture for scaffolding MCP servers with different runtimes and deployment targets.

---

## Overview

**Key Principle**: Each MCP framework is a self-contained template plugin. Adding support for a new framework requires only creating a new template directory—no core code changes.

---

## Available Templates

### Cloudflare Workers (`cloudflare-remote`)

**Runtime**: Cloudflare Workers
**Transport**: SSE, HTTP
**Deployment**: Remote (Cloudflare Edge Network)

**Features:**
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

---

## Template Structure

Each template is a directory in `templates/` with this structure:

```
templates/my-template/
├── template.config.json      # Template metadata
├── files/                    # Files to scaffold
│   ├── src/
│   │   ├── index.ts.hbs     # Handlebars template
│   │   └── tools/
│   ├── test/
│   └── package.json.hbs
└── hooks/                    # Optional lifecycle hooks
    ├── pre-scaffold.js
    └── post-scaffold.js
```

### `template.config.json`

Defines template metadata and capabilities:

```json
{
  "id": "my-template",
  "version": "1.0.0",
  "name": "My MCP Template",
  "description": "Template description",

  "capabilities": {
    "runtime": "node",
    "transport": ["sse", "http"],
    "deployment": "local",
    "language": "typescript"
  },

  "dependencies": {
    "mcp_sdk": "^1.0.0"
  },

  "scaffolding": {
    "variables": [
      {
        "name": "PROJECT_NAME",
        "required": true,
        "prompt": "Project name?"
      },
      {
        "name": "PORT",
        "required": false,
        "default": "8788",
        "prompt": "Server port?"
      }
    ]
  },

  "cli": {
    "dev": "npm run dev",
    "test": "npm run test",
    "deploy": "npm run deploy"
  },

  "features": {
    "unitTesting": true,
    "integrationTesting": true,
    "exampleTools": ["echo", "health"],
    "documentation": true
  }
}
```

### `files/` Directory

Contains files to scaffold. Files with `.hbs` extension use Handlebars variable substitution.

**Variable Substitution:**

```handlebars
{
  "name": "{{PROJECT_NAME}}",
  "description": "{{DESCRIPTION}}",
  "version": "1.0.0"
}
```

**Standard Variables:**
- `PROJECT_NAME` - Project name
- `MCP_SERVER_NAME` - Display name
- `DESCRIPTION` - Project description
- `PORT` - Development port
- `DEV_MODE` - Boolean as string ("true"/"false")

### `hooks/` Directory (Optional)

Lifecycle hooks for custom logic:

**`pre-scaffold.js`:**
```javascript
export default async function preScaffold(context) {
  // context.template - Template config
  // context.variables - Variable values
  // context.targetDir - Target directory

  // Validate, modify variables, etc.

  return {
    success: true,
    modifiedVariables: context.variables
  };
}
```

**`post-scaffold.js`:**
```javascript
export default async function postScaffold(context) {
  // Run after scaffolding
  // Install dependencies, run commands, etc.

  return { success: true };
}
```

---

## Programmatic API

### Scaffolding Projects

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
    MCP_SERVER_NAME: 'My MCP Server',
    PORT: '8788',
    DEV_MODE: 'false',
  },
  packageManager: 'npm',
  noInstall: false,
});

if (result.success) {
  console.log('Success!');
} else {
  console.error('Error:', result.error);
}
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

### Template Validation

```typescript
const registry = new TemplateRegistry();
const template = await registry.getTemplate('my-template');

const validation = await registry.validateTemplate(template);

if (!validation.valid) {
  console.error('Errors:', validation.errors);
}
```

---

## Creating a New Template

### Step 1: Create Directory Structure

```bash
mkdir -p templates/my-template/files/src
mkdir -p templates/my-template/files/test
mkdir -p templates/my-template/hooks
```

### Step 2: Create `template.config.json`

Define template metadata (see structure above).

### Step 3: Add Template Files

Create files in `files/` directory. Use `.hbs` extension for files needing variable substitution.

**Example `files/package.json.hbs`:**

```json
{
  "name": "{{PROJECT_NAME}}",
  "version": "1.0.0",
  "description": "{{DESCRIPTION}}",
  "scripts": {
    "dev": "your-dev-command",
    "test": "vitest"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  }
}
```

### Step 4: Add Example Tools

Include example tool implementations in `files/src/tools/`:
- Simple tool example
- Validated tool example
- Async tool example

### Step 5: Add Tests

Include test infrastructure:
- Unit test examples (`files/test/unit/`)
- Integration test examples (`files/test/integration/`)
- Test utilities (`files/test/utils/`)

### Step 6: Add Documentation

Include `files/README.md.hbs` with:
- Quick start guide
- Development workflow
- Deployment instructions
- "For AI Agents" section

### Step 7: Test Your Template

```bash
# Scaffold a project using your template
mcp-server-kit new server \
  --template my-template \
  --name test-project

# Verify it works
cd test-project
npm install
npm run test
npm run dev
```

### Step 8: Validate Template

```bash
mcp-server-kit template validate my-template
```

---

## Variable Best Practices

### Required vs Optional

- **Required**: `PROJECT_NAME`, `MCP_SERVER_NAME`
- **Optional with defaults**: `PORT`, `DESCRIPTION`

### Type Constraints

**All variables must be strings** (not booleans or numbers):

```typescript
// ❌ Wrong
variables: { DEV_MODE: true }

// ✅ Right
variables: { DEV_MODE: 'true' }
```

### Naming Convention

- Use UPPERCASE_SNAKE_CASE for variable names
- Be descriptive but concise
- Document in template.config.json

---

## Template Capabilities

### Runtime Options

- `cloudflare-workers`
- `vercel-edge`
- `node`
- `deno`

### Transport Options

- `sse` - Server-Sent Events
- `http` - HTTP requests
- `stdio` - Standard input/output
- `websocket` - WebSocket

### Deployment Options

- `remote` - Cloud deployment
- `local` - Local development

---

## Advanced Features

### Conditional Files

Use hooks to conditionally include files:

```javascript
export default async function preScaffold(context) {
  // Remove files based on options
  if (!context.variables.INCLUDE_TESTS) {
    // Skip test files
  }

  return { success: true };
}
```

### Custom Validation

Add validation in pre-scaffold hooks:

```javascript
export default async function preScaffold(context) {
  const port = parseInt(context.variables.PORT);

  if (port < 1024 || port > 65535) {
    return {
      success: false,
      error: 'Port must be between 1024 and 65535'
    };
  }

  return { success: true };
}
```

### Post-Scaffold Commands

Run commands after scaffolding:

```javascript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function postScaffold(context) {
  // Generate types
  await execAsync('npm run generate-types', {
    cwd: context.targetDir
  });

  return { success: true };
}
```

---

## See Also

- [CLI Reference](./CLI.md) - Command-line usage
- [Testing Guide](./TESTING.md) - Writing tests
- [Main README](../README.md) - Project overview
