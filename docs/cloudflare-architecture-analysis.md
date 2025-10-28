# Cloudflare Primitives - Architecture Integration Analysis

**How Cloudflare binding support integrates with mcp-server-kit's existing architecture**

This document analyzes how to extend mcp-server-kit to support Cloudflare primitives (KV, D1, R2, Queues, Workers AI, Vectorize, Hyperdrive) while maintaining architectural consistency with existing patterns.

---

## Executive Summary

The mcp-server-kit architecture is exceptionally well-suited for adding Cloudflare binding support:

✅ **Anchor-based transformation** - Proven with auth scaffolding
✅ **Template system** - Flexible, Handlebars-based code generation
✅ **Service-oriented** - Reusable services for scaffolding tasks
✅ **Validation framework** - Extensible for binding checks
✅ **Multi-target support** - Platform-agnostic core

**Recommendation**: Follow the auth scaffolding pattern (`add-auth` command) to implement `add binding` command with similar architecture.

---

## Current Cloudflare Support

### What's Already Configured

The cloudflare-remote template currently includes:

#### 1. Durable Objects (via Agents SDK)

**File**: `templates/cloudflare-remote/files/src/index.ts.hbs`

```typescript
import { McpAgent } from "agents/mcp";

export class MCPServerAgent extends McpAgent<Env> {
  server = new McpServer({
    name: "{{MCP_SERVER_NAME}}",
    version: "1.0.0",
  });

  async init() {
    // Register tools, prompts, resources
  }
}
```

**File**: `templates/cloudflare-remote/files/wrangler.jsonc.hbs`

```jsonc
{
  "durable_objects": {
    "bindings": [
      {
        "name": "MCP_OBJECT",
        "class_name": "MCPServerAgent"
      }
    ]
  },
  "migrations": [
    {
      "tag": "v1",
      "new_sqlite_classes": ["MCPServerAgent"]
    }
  ]
}
```

#### 2. Type Generation

**Automated**: `npm run cf-typegen` runs automatically after `npm install` (via `postInstall` hook in template config)

**Generates**: `worker-configuration.d.ts` with type-safe binding access

#### 3. Agent SDK Dependency

**File**: `templates/cloudflare-remote/template.config.json`

```json
{
  "dependencies": {
    "agents": "^0.2.17",
    "mcp_sdk": "^1.20.2",
    "runtime_specific": {
      "wrangler": "^4.44.0",
      "@cloudflare/vitest-pool-workers": "^0.9.14"
    }
  }
}
```

### What's Missing

- **No KV/D1/R2/Queue bindings** - Must be added manually
- **No helper utilities** - Raw binding APIs require boilerplate
- **No validation** - Can't detect unused bindings or configuration errors
- **No examples** - Resource/tool templates don't show binding usage
- **No agent guidance** - No skill documentation for binding patterns

---

## Architecture Pattern: Auth Scaffolding

The `add-auth` command provides an excellent blueprint for implementing binding support.

### Auth Scaffolding Architecture

**Command**: `src/core/commands/add-auth.ts`
- Orchestrates auth scaffolding workflow
- Validates inputs (provider, platform)
- Calls AuthScaffolder service

**Service**: `src/core/commands/shared/auth-scaffolder.ts`
- Main orchestration logic
- Coordinates template generation, config updates, anchor transformations
- Implements rollback on failure

**Template Service**: Uses Handlebars templates for code generation
- `templates/scaffolding/auth/<provider>-<platform>/` - Provider-specific templates
- Variables: `{{PROVIDER}}`, `{{PLATFORM}}`, etc.

**Config Updater**: `src/core/commands/shared/config-updater.ts`
- Updates `wrangler.jsonc` with environment variables
- Uses JSON parsing (not regex)

**Anchor Service**: `src/core/commands/shared/anchor-service.ts`
- Robust code transformation via anchors
- Anchors: `<mcp-auth:imports>`, `<mcp-auth:middleware>`, `<mcp-auth:vars>`
- Automatic rollback support

### Key Learnings from Auth

1. **Anchor-Based = Robust** - No regex, predictable insertion points
2. **Service Separation** - Each service has single responsibility
3. **Template Variables** - Must be `Record<string, string>` (convert booleans)
4. **Validation Early** - Check inputs before making changes
5. **Rollback Support** - Critical for production reliability
6. **Type Generation** - Run `cf-typegen` after config changes

---

## Proposed Architecture: Binding Support

### Command Structure

```
src/core/commands/
├── add-binding.ts              [NEW] - CLI command entry point
└── shared/
    ├── binding-scaffolder.ts   [NEW] - Orchestration service
    ├── binding-templates.ts    [NEW] - Template generation service
    ├── config-updater.ts       [EXTEND] - Add binding config methods
    ├── anchor-service.ts       [EXTEND] - Add binding anchors
    └── validation-service.ts   [EXTEND] - Add binding validation
```

### Flow Diagram

```
User runs: mcp-server-kit add binding kv --name MY_CACHE
                    ↓
         ┌──────────────────────┐
         │  add-binding.ts      │
         │  - Parse arguments   │
         │  - Validate inputs   │
         └──────────┬───────────┘
                    ↓
         ┌──────────────────────┐
         │ BindingScaffolder    │
         │  - Orchestrate steps │
         │  - Handle rollback   │
         └──────────┬───────────┘
                    ↓
         ┌──────────────────────────────────────┐
         │  1. Validate (no existing binding)   │
         └──────────┬───────────────────────────┘
                    ↓
         ┌──────────────────────────────────────┐
         │  2. Generate Helper Utility          │
         │     - BindingTemplates.generate()    │
         │     - Output: src/utils/bindings/    │
         └──────────┬───────────────────────────┘
                    ↓
         ┌──────────────────────────────────────┐
         │  3. Update wrangler.jsonc            │
         │     - ConfigUpdater.addBinding()     │
         │     - Use anchors: <mcp-bindings:kv> │
         └──────────┬───────────────────────────┘
                    ↓
         ┌──────────────────────────────────────┐
         │  4. Run cf-typegen                   │
         │     - Generate worker-configuration  │
         │     - Update Env interface types     │
         └──────────┬───────────────────────────┘
                    ↓
         ┌──────────────────────────────────────┐
         │  5. Output Next Steps                │
         │     - wrangler command to create     │
         │     - Example usage in tools         │
         └──────────────────────────────────────┘
```

---

## Anchor System Extension

### Current Anchors (Auth)

**File**: `templates/cloudflare-remote/files/src/index.ts.hbs`

```typescript
// <mcp-auth:imports>
// Auth imports will be added here by add-auth command
// </mcp-auth:imports>

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // <mcp-auth:middleware>
    // Auth middleware will be added here by add-auth command
    // </mcp-auth:middleware>
  }
}
```

**File**: `templates/cloudflare-remote/files/wrangler.jsonc.hbs`

```jsonc
{
  // <mcp-auth:vars>
  // Auth environment variables will be added here by add-auth command
  // </mcp-auth:vars>
}
```

### Proposed Anchors (Bindings)

**File**: `templates/cloudflare-remote/files/wrangler.jsonc.hbs`

```jsonc
{
  "name": "{{PROJECT_NAME}}",
  "main": "src/index.ts",
  "compatibility_date": "2025-03-10",

  // <mcp-bindings:kv>
  // KV namespace bindings managed by mcp-server-kit
  // </mcp-bindings:kv>

  // <mcp-bindings:d1>
  // D1 database bindings managed by mcp-server-kit
  // </mcp-bindings:d1>

  // <mcp-bindings:r2>
  // R2 bucket bindings managed by mcp-server-kit
  // </mcp-bindings:r2>

  // <mcp-bindings:queues>
  // Queue bindings (producers and consumers) managed by mcp-server-kit
  // </mcp-bindings:queues>

  // <mcp-bindings:ai>
  // Workers AI binding managed by mcp-server-kit
  // </mcp-bindings:ai>

  // <mcp-bindings:vectorize>
  // Vectorize index bindings managed by mcp-server-kit
  // </mcp-bindings:vectorize>

  // <mcp-bindings:hyperdrive>
  // Hyperdrive configuration bindings managed by mcp-server-kit
  // </mcp-bindings:hyperdrive>

  "durable_objects": {
    "bindings": [
      {
        "name": "MCP_OBJECT",
        "class_name": "MCPServerAgent"
      }
    ]
  },
  "migrations": [
    {
      "tag": "v1",
      "new_sqlite_classes": ["MCPServerAgent"]
    }
  ]
}
```

**File**: `templates/cloudflare-remote/files/src/index.ts.hbs`

```typescript
// <mcp-bindings:imports>
// Helper imports for bindings will be added here by add binding command
// import { MyCacheKV } from './utils/bindings/kv-my-cache.js';
// </mcp-bindings:imports>
```

**File**: `templates/cloudflare-remote/files/.env.example.hbs`

```bash
# <mcp-bindings:env-examples>
# Binding configuration examples
# KV_NAMESPACE_ID="your-kv-namespace-id"
# D1_DATABASE_ID="your-database-id"
# </mcp-bindings:env-examples>
```

### Anchor Service Extension

**File**: `src/core/commands/shared/anchor-service.ts`

```typescript
export const BINDING_ANCHORS = {
  KV: {
    type: "bindings:kv",
    startMarker: "// <mcp-bindings:kv>",
    endMarker: "// </mcp-bindings:kv>",
    description: "KV namespace bindings",
  },
  D1: {
    type: "bindings:d1",
    startMarker: "// <mcp-bindings:d1>",
    endMarker: "// </mcp-bindings:d1>",
    description: "D1 database bindings",
  },
  // ... similar for R2, Queues, AI, Vectorize, Hyperdrive

  IMPORTS: {
    type: "bindings:imports",
    startMarker: "// <mcp-bindings:imports>",
    endMarker: "// </mcp-bindings:imports>",
    description: "Binding helper imports",
  },
};

// Add method to insert binding configuration
export async function addBindingToWrangler(
  cwd: string,
  bindingType: BindingType,
  config: BindingConfig
): Promise<boolean> {
  const anchorType = BINDING_ANCHORS[bindingType.toUpperCase()];
  const wranglerPath = path.join(cwd, 'wrangler.jsonc');

  const content = await readFile(wranglerPath, 'utf-8');
  const lines = content.split('\n');

  // Find anchor
  const startIdx = lines.findIndex(line => line.includes(anchorType.startMarker));
  const endIdx = lines.findIndex(line => line.includes(anchorType.endMarker));

  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`Anchors not found for ${bindingType}`);
  }

  // Generate binding JSON
  const bindingJson = generateBindingConfig(bindingType, config);

  // Insert between anchors
  const newLines = [
    ...lines.slice(0, endIdx),
    bindingJson,
    ...lines.slice(endIdx)
  ];

  await writeFile(wranglerPath, newLines.join('\n'), 'utf-8');
  return true;
}
```

---

## Template System Integration

### Helper Utility Templates

**Location**: `templates/scaffolding/bindings/`

```
templates/scaffolding/bindings/
├── kv-helper.hbs           - KV namespace helper class
├── d1-helper.hbs           - D1 database helper class
├── r2-helper.hbs           - R2 bucket helper class
├── queue-producer.hbs      - Queue producer helper
├── queue-consumer.hbs      - Queue consumer handler
├── ai-helper.hbs           - Workers AI helper
├── vectorize-helper.hbs    - Vectorize helper
└── hyperdrive-helper.hbs   - Hyperdrive helper
```

### Template Variables

Each template receives:

```typescript
interface BindingTemplateVars {
  BINDING_NAME: string;        // e.g., "MY_CACHE"
  BINDING_TYPE: string;        // e.g., "kv"
  HELPER_CLASS_NAME: string;   // e.g., "MyCacheKV"
  DATABASE_NAME?: string;      // For D1
  BUCKET_NAME?: string;        // For R2
  QUEUE_NAME?: string;         // For Queues
  INDEX_NAME?: string;         // For Vectorize
  DIMENSIONS?: string;         // For Vectorize
}
```

### Example: KV Helper Template

**File**: `templates/scaffolding/bindings/kv-helper.hbs`

```typescript
/**
 * {{HELPER_CLASS_NAME}} - Helper for {{BINDING_NAME}} KV namespace
 *
 * Type-safe wrapper for KV operations with error handling.
 *
 * Usage:
 *   const kv = new {{HELPER_CLASS_NAME}}(env.{{BINDING_NAME}});
 *   await kv.set('key', { data: 'value' });
 *   const data = await kv.get('key');
 */

export class {{HELPER_CLASS_NAME}} {
  constructor(private kv: KVNamespace) {}

  /**
   * Get value by key (auto-parses JSON)
   */
  async get<T = any>(key: string): Promise<T | null> {
    return await this.kv.get(key, 'json');
  }

  /**
   * Set value with optional TTL
   */
  async set<T = any>(
    key: string,
    value: T,
    options?: { ttl?: number; metadata?: Record<string, any> }
  ): Promise<void> {
    await this.kv.put(key, JSON.stringify(value), {
      expirationTtl: options?.ttl,
      metadata: options?.metadata,
    });
  }

  /**
   * Delete key
   */
  async delete(key: string): Promise<void> {
    await this.kv.delete(key);
  }

  /**
   * List keys with optional prefix
   */
  async list(options?: { prefix?: string; limit?: number }): Promise<KVNamespaceListResult<any>> {
    return await this.kv.list(options);
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    const value = await this.kv.get(key);
    return value !== null;
  }
}
```

**Generated File**: `src/utils/bindings/kv-my-cache.ts`

### Example: D1 Helper Template

**File**: `templates/scaffolding/bindings/d1-helper.hbs`

```typescript
/**
 * {{HELPER_CLASS_NAME}} - Helper for {{BINDING_NAME}} D1 database
 *
 * Type-safe wrapper for D1 SQL operations.
 *
 * Usage:
 *   const db = new {{HELPER_CLASS_NAME}}(env.{{BINDING_NAME}});
 *   const users = await db.query<User>('SELECT * FROM users WHERE id = ?', [userId]);
 */

export class {{HELPER_CLASS_NAME}} {
  constructor(private db: D1Database) {}

  /**
   * Execute a SELECT query and return all rows
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    const bound = params.length > 0 ? stmt.bind(...params) : stmt;
    const result = await bound.all();

    if (!result.success) {
      throw new Error(`Database query failed: ${sql}`);
    }

    return result.results as T[];
  }

  /**
   * Execute a SELECT query and return first row
   */
  async queryFirst<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const stmt = this.db.prepare(sql);
    const bound = params.length > 0 ? stmt.bind(...params) : stmt;
    const result = await bound.first();

    return result as T | null;
  }

  /**
   * Execute an INSERT/UPDATE/DELETE query
   */
  async execute(sql: string, params: any[] = []): Promise<D1Result> {
    const stmt = this.db.prepare(sql);
    const bound = params.length > 0 ? stmt.bind(...params) : stmt;
    return await bound.run();
  }

  /**
   * Execute multiple statements atomically
   */
  async batch(statements: Array<{ sql: string; params?: any[] }>): Promise<D1Result[]> {
    const prepared = statements.map(({ sql, params = [] }) => {
      const stmt = this.db.prepare(sql);
      return params.length > 0 ? stmt.bind(...params) : stmt;
    });

    return await this.db.batch(prepared);
  }
}
```

---

## Validation Integration

### Current Validation

**File**: `src/core/commands/validate.ts`

Currently validates:
- Tools are registered
- Prompts are registered
- Resources are registered
- Unit tests exist
- Integration tests exist

### Extended Validation for Bindings

```typescript
// New validator: src/core/commands/shared/binding-validator.ts

export class BindingValidator {
  /**
   * Validate all bindings in project
   */
  async validateBindings(cwd: string): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // 1. Parse wrangler.jsonc
    const wranglerConfig = await this.parseWranglerConfig(cwd);

    // 2. Extract declared bindings
    const declaredBindings = this.extractBindings(wranglerConfig);

    // 3. Scan code for binding usage
    const usedBindings = await this.scanCodeForBindings(cwd);

    // 4. Check for unused bindings (WARNING)
    const unused = declaredBindings.filter(b => !usedBindings.includes(b.name));
    for (const binding of unused) {
      results.push({
        type: 'warning',
        message: `Binding "${binding.name}" (${binding.type}) is declared but not used`,
        file: 'wrangler.jsonc',
      });
    }

    // 5. Check for missing bindings (ERROR)
    const missing = usedBindings.filter(
      name => !declaredBindings.find(b => b.name === name)
    );
    for (const name of missing) {
      results.push({
        type: 'error',
        message: `Code references binding "env.${name}" but it's not declared in wrangler.jsonc`,
        file: this.findBindingUsage(cwd, name),
      });
    }

    // 6. Check helper utilities exist
    for (const binding of declaredBindings) {
      const helperPath = path.join(
        cwd,
        'src/utils/bindings',
        `${binding.type}-${toKebabCase(binding.name)}.ts`
      );

      if (!await fileExists(helperPath)) {
        results.push({
          type: 'info',
          message: `Helper utility not found for "${binding.name}". Consider running: mcp-server-kit add binding ${binding.type} --name ${binding.name}`,
        });
      }
    }

    // 7. Check cf-typegen has been run
    const typeDefPath = path.join(cwd, 'worker-configuration.d.ts');
    if (!await fileExists(typeDefPath)) {
      results.push({
        type: 'warning',
        message: 'Type definitions not found. Run: npm run cf-typegen',
      });
    }

    return results;
  }

  private async scanCodeForBindings(cwd: string): Promise<string[]> {
    const bindings = new Set<string>();
    const files = await glob(path.join(cwd, 'src/**/*.ts'));

    for (const file of files) {
      const content = await readFile(file, 'utf-8');

      // Match: env.BINDING_NAME
      const matches = content.matchAll(/env\.([A-Z_]+)/g);
      for (const match of matches) {
        bindings.add(match[1]);
      }
    }

    return Array.from(bindings);
  }

  private extractBindings(config: any): Array<{ name: string; type: string }> {
    const bindings: Array<{ name: string; type: string }> = [];

    // KV namespaces
    if (config.kv_namespaces) {
      for (const kv of config.kv_namespaces) {
        bindings.push({ name: kv.binding, type: 'kv' });
      }
    }

    // D1 databases
    if (config.d1_databases) {
      for (const d1 of config.d1_databases) {
        bindings.push({ name: d1.binding, type: 'd1' });
      }
    }

    // Similar for R2, Queues, AI, Vectorize, Hyperdrive...

    return bindings;
  }
}
```

---

## Enhanced Resource/Tool Templates

### Current Templates

**Location**: `templates/scaffolding/entities/`

```
templates/scaffolding/entities/
├── tool.hbs         - Tool implementation template
├── prompt.hbs       - Prompt implementation template
└── resource.hbs     - Resource implementation template
```

### Enhancement: Binding-Aware Generation

When user runs:
```bash
mcp-server-kit add resource user-profile --use-binding MY_KV
```

The resource template should:
1. Detect that `MY_KV` binding exists (validate)
2. Import the KV helper utility
3. Generate example code using the helper

**Enhanced Template**: `templates/scaffolding/entities/resource.hbs`

```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
{{#if USE_BINDING}}
import { {{HELPER_CLASS_NAME}} } from "../utils/bindings/{{BINDING_TYPE}}-{{BINDING_NAME_KEBAB}}.js";
{{/if}}

{{#if IS_DYNAMIC}}
export function register{{capitalizedName}}Resource(server: McpServer): void {
  server.resource(
    "{{name}}",
    new ResourceTemplate("{{uriPattern}}", {
      list: async () => {
        {{#if USE_BINDING}}
        // Example: List available resources from {{BINDING_TYPE}} binding
        const {{BINDING_TYPE}} = new {{HELPER_CLASS_NAME}}(env.{{BINDING_NAME}});
        // TODO: Implement list logic using {{BINDING_TYPE}} helper
        {{else}}
        // TODO: Implement list logic
        {{/if}}
        return [];
      },
    }),
    { description: "{{description}}" },
    async (uri, variables, env) => {
      {{#if USE_BINDING}}
      // Use {{BINDING_TYPE}} binding for data retrieval
      const {{BINDING_TYPE}} = new {{HELPER_CLASS_NAME}}(env.{{BINDING_NAME}});

      {{#if BINDING_TYPE_EQ_KV}}
      // Example: Fetch from KV
      const data = await {{BINDING_TYPE}}.get(variables.id as string);
      {{/if}}

      {{#if BINDING_TYPE_EQ_D1}}
      // Example: Query from D1
      const data = await {{BINDING_TYPE}}.queryFirst(
        'SELECT * FROM table WHERE id = ?',
        [variables.id]
      );
      {{/if}}

      if (!data) {
        throw new Error(`Resource not found: ${uri.href}`);
      }

      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(data, null, 2),
          mimeType: "application/json",
        }],
      };
      {{else}}
      // TODO: Implement resource logic
      return {
        contents: [{
          uri: uri.href,
          text: "Not implemented",
        }],
      };
      {{/if}}
    }
  );
}
{{/if}}
```

---

## Test Harness Integration

### Current Test Harness

**Location**: `src/harness/`

Supports:
- Tool tests (YAML spec: `tool`, `arguments`, `assertions`)
- Prompt tests (YAML spec: `prompt`, `arguments`, `assertions`)
- Resource tests (YAML spec: `resource`, `uri`, `assertions`)

### Enhanced Test Specs with Binding Setup

**Extension**: Support `setup` section for test data seeding

**Example**: `test/integration/specs/user-lookup.yaml`

```yaml
type: tool
name: User lookup from KV
description: Test user lookup with KV binding
tool: user-lookup

# NEW: Setup section for binding test data
setup:
  kv:
    MY_KV:
      - key: "user:123"
        value: { "id": "123", "name": "Alice", "email": "alice@example.com" }
      - key: "user:456"
        value: { "id": "456", "name": "Bob", "email": "bob@example.com" }

arguments:
  userId: "123"

assertions:
  - type: success
  - type: json_path
    path: "$.name"
    expected: "Alice"
  - type: json_path
    path: "$.email"
    expected: "alice@example.com"
```

### Test Runner Enhancement

**File**: `src/harness/runner.ts`

```typescript
export class TestRunner {
  async runTest(spec: TestSpec): Promise<TestResult> {
    // NEW: Setup bindings before test
    if (spec.setup) {
      await this.setupBindings(spec.setup);
    }

    // Run existing test logic...
    const result = await this.executeTest(spec);

    // NEW: Cleanup bindings after test
    if (spec.setup) {
      await this.cleanupBindings(spec.setup);
    }

    return result;
  }

  private async setupBindings(setup: BindingSetup): Promise<void> {
    // Seed KV data
    if (setup.kv) {
      for (const [bindingName, entries] of Object.entries(setup.kv)) {
        const kv = this.env[bindingName] as KVNamespace;
        for (const { key, value } of entries) {
          await kv.put(key, JSON.stringify(value));
        }
      }
    }

    // Seed D1 data
    if (setup.d1) {
      for (const [bindingName, statements] of Object.entries(setup.d1)) {
        const db = this.env[bindingName] as D1Database;
        for (const sql of statements) {
          await db.prepare(sql).run();
        }
      }
    }

    // Similar for other bindings...
  }
}
```

---

## Code Generation Workflow

### Step-by-Step: Adding KV Binding

**User Command**:
```bash
mcp-server-kit add binding kv --name MY_CACHE
```

**Execution Flow**:

1. **Validate** (`add-binding.ts`)
   - Check project has cloudflare-remote template
   - Check `MY_CACHE` doesn't already exist
   - Check wrangler.jsonc has KV anchor

2. **Generate Helper** (`binding-scaffolder.ts` → `binding-templates.ts`)
   - Load template: `templates/scaffolding/bindings/kv-helper.hbs`
   - Variables: `{ BINDING_NAME: 'MY_CACHE', HELPER_CLASS_NAME: 'MyCacheKV' }`
   - Render template
   - Write: `src/utils/bindings/kv-my-cache.ts`

3. **Update Config** (`config-updater.ts`)
   - Parse `wrangler.jsonc`
   - Find anchor: `// <mcp-bindings:kv>`
   - Insert binding configuration:
     ```jsonc
     "kv_namespaces": [
       {
         "binding": "MY_CACHE",
         "id": "TODO_CREATE_KV_NAMESPACE"
       }
     ]
     ```

4. **Run Type Generation** (`binding-scaffolder.ts`)
   - Execute: `npm run cf-typegen`
   - Generates: `worker-configuration.d.ts` with KV binding types

5. **Output Success** (`add-binding.ts`)
   ```
   ✓ Helper created: src/utils/bindings/kv-my-cache.ts
   ✓ Binding added to wrangler.jsonc
   ✓ Types generated

   Next steps:
   1. Create KV namespace:
      npx wrangler kv namespace create MY_CACHE

   2. Update wrangler.jsonc with namespace ID:
      Replace "TODO_CREATE_KV_NAMESPACE" with the ID from step 1

   3. Use in your tools:
      import { MyCacheKV } from './utils/bindings/kv-my-cache.js';
      const cache = new MyCacheKV(env.MY_CACHE);
      await cache.set('key', { data: 'value' });
   ```

---

## Service Architecture

### BindingScaffolder Service

**File**: `src/core/commands/shared/binding-scaffolder.ts`

```typescript
export class BindingScaffolder {
  constructor(
    private templateService: BindingTemplateService,
    private configUpdater: ConfigUpdater,
    private anchorService: AnchorService,
    private validator: BindingValidator
  ) {}

  async scaffold(
    cwd: string,
    config: BindingScaffoldConfig
  ): Promise<BindingScaffoldResult> {
    const rollback = new RollbackManager();

    try {
      // 1. Validate
      await this.validator.validateBindingConfig(cwd, config);

      // 2. Generate helper utility
      const helperPath = await this.templateService.generateHelper(
        cwd,
        config.bindingType,
        config.bindingName
      );
      rollback.addFile(helperPath);

      // 3. Update wrangler.jsonc
      await this.configUpdater.addBinding(
        cwd,
        config.bindingType,
        config.bindingConfig
      );
      rollback.addConfigChange('wrangler.jsonc');

      // 4. Run cf-typegen
      await this.runCfTypegen(cwd);

      // 5. Success
      rollback.commit();

      return {
        success: true,
        helperPath,
        bindingName: config.bindingName,
        nextSteps: this.generateNextSteps(config),
      };
    } catch (error) {
      // Rollback all changes
      await rollback.rollback();
      throw error;
    }
  }

  private generateNextSteps(config: BindingScaffoldConfig): string[] {
    switch (config.bindingType) {
      case 'kv':
        return [
          `Create KV namespace: npx wrangler kv namespace create ${config.bindingName}`,
          `Update wrangler.jsonc with the namespace ID`,
          `Use in code: new ${config.helperClassName}(env.${config.bindingName})`,
        ];

      case 'd1':
        return [
          `Create D1 database: npx wrangler d1 create ${config.databaseName}`,
          `Update wrangler.jsonc with the database ID`,
          `Run migrations: npx wrangler d1 migrations apply ${config.databaseName}`,
        ];

      // Similar for other binding types...
    }
  }
}
```

---

## Migration Strategy

### For Existing Projects

Projects scaffolded **before** binding support will need manual updates:

1. **Add anchors to wrangler.jsonc**:
   ```jsonc
   {
     // <mcp-bindings:kv>
     // </mcp-bindings:kv>

     // <mcp-bindings:d1>
     // </mcp-bindings:d1>

     // ... etc
   }
   ```

2. **Add import anchor to src/index.ts**:
   ```typescript
   // <mcp-bindings:imports>
   // </mcp-bindings:imports>
   ```

3. **Run** `mcp-server-kit add binding` commands

### For New Projects

Templates will include all anchors by default:
- `wrangler.jsonc.hbs` - All binding anchors
- `src/index.ts.hbs` - Import anchor
- `.env.example.hbs` - Environment example anchor

---

## Future Extensibility

### Other Platforms

The binding architecture is platform-agnostic at the core:

**Vercel Edge** (future):
```bash
mcp-server-kit add binding vercel-kv --name MY_CACHE
```

Would generate Vercel KV helper instead of Cloudflare KV.

**AWS Lambda** (future):
```bash
mcp-server-kit add binding dynamodb --name MY_TABLE
```

### Custom Bindings

Allow users to define custom binding templates:

```bash
mcp-server-kit add binding custom \
  --name MY_SERVICE \
  --template ./custom-binding-template.hbs
```

---

## Summary

### Key Architectural Decisions

1. ✅ **Follow Auth Pattern** - Proven, robust, agent-friendly
2. ✅ **Anchor-Based Transformation** - No regex, predictable, rollback-safe
3. ✅ **Service Separation** - Single responsibility, testable
4. ✅ **Helper Utilities** - Type-safe wrappers, reduce boilerplate
5. ✅ **Template Variables** - All strings, Handlebars-compatible
6. ✅ **Validation First** - Check before modify, comprehensive error messages
7. ✅ **Auto Type Generation** - Always run cf-typegen after changes

### Benefits

- **Agent-Friendly**: Single command, clear output, TODO markers
- **Type-Safe**: TypeScript errors for configuration mistakes
- **Maintainable**: Services follow established patterns
- **Extensible**: Easy to add new binding types
- **Reliable**: Rollback on failure, validation before changes
- **Platform-Agnostic**: Core architecture supports multiple platforms

### Next Steps

See implementation plan: `cloudflare-primitives-implementation-plan.md`
