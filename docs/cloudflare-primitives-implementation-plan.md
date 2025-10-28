# Cloudflare Primitives - Implementation Plan

**5-phase roadmap for adding Cloudflare binding support to mcp-server-kit**

This document outlines the complete implementation strategy for extending mcp-server-kit with comprehensive Cloudflare primitive support, following established architectural patterns.

---

## Overview

**Goal**: Enable agents to easily use Cloudflare primitives (KV, D1, R2, Queues, Workers AI, Vectorize, Hyperdrive) in MCP servers through automated scaffolding and helper utilities.

**Approach**: Phased implementation, starting with high-value primitives (KV, D1) to prove architecture, then expanding to remaining primitives.

**Estimated Effort**: 8-13 days of focused development

---

## Phase 1: Foundation & High-Value Primitives (KV, D1)

**Duration**: 2-3 days
**Priority**: CRITICAL (proves architecture)

### Goals

- Establish binding scaffolding infrastructure
- Implement KV and D1 support (most common use cases)
- Create reusable patterns for Phase 2-4
- Validate architecture with real usage

### Deliverables

#### 1.1 Create Reference Documentation ✅

**Files Created**:
- `docs/cloudflare-primitives-reference.md` - Comprehensive primitive reference
- `docs/cloudflare-architecture-analysis.md` - Integration architecture
- `docs/cloudflare-primitives-implementation-plan.md` - This plan

**Status**: COMPLETE

#### 1.2 Add Binding Command Infrastructure

**New File**: `src/core/commands/add-binding.ts`

```typescript
/**
 * Add binding command - Main CLI entry point
 *
 * Usage: mcp-server-kit add binding <type> --name <BINDING_NAME> [options]
 */

import { Command } from 'commander';
import { BindingScaffolder } from './shared/binding-scaffolder.js';

interface AddBindingOptions {
  name: string;
  databaseName?: string;  // For D1
  bucketName?: string;    // For R2
  queueName?: string;     // For Queues
  indexName?: string;     // For Vectorize
  dimensions?: number;    // For Vectorize
}

export function addBindingCommand(program: Command): void {
  const cmd = program
    .command('add')
    .description('Add MCP primitives or bindings');

  cmd
    .command('binding <type>')
    .description('Add a Cloudflare binding to the project')
    .requiredOption('--name <binding>', 'Binding name (e.g., MY_CACHE)')
    .option('--database-name <name>', 'Database name (for D1)')
    .option('--bucket-name <name>', 'Bucket name (for R2)')
    .option('--queue-name <name>', 'Queue name (for Queues)')
    .option('--index-name <name>', 'Index name (for Vectorize)')
    .option('--dimensions <number>', 'Vector dimensions (for Vectorize)')
    .action(async (type: string, options: AddBindingOptions) => {
      const scaffolder = new BindingScaffolder();

      try {
        const result = await scaffolder.scaffold(process.cwd(), {
          bindingType: type,
          bindingName: options.name,
          ...options,
        });

        console.log('✓ Binding added successfully!');
        console.log(`✓ Helper: ${result.helperPath}`);
        console.log('\nNext steps:');
        result.nextSteps.forEach((step, i) => {
          console.log(`  ${i + 1}. ${step}`);
        });
      } catch (error) {
        console.error('✗ Failed to add binding:', error.message);
        process.exit(1);
      }
    });
}
```

**New File**: `src/core/commands/shared/binding-scaffolder.ts`

```typescript
/**
 * BindingScaffolder - Orchestrates binding scaffolding workflow
 *
 * Responsibilities:
 * - Validate binding configuration
 * - Generate helper utilities
 * - Update wrangler.jsonc via anchors
 * - Run cf-typegen
 * - Handle rollback on failure
 */

import { BindingTemplateService } from './binding-templates.js';
import { ConfigUpdater } from './config-updater.js';
import { AnchorService } from './anchor-service.js';
import { BindingValidator } from './binding-validator.js';
import { RollbackManager } from './rollback-manager.js';

export interface BindingScaffoldConfig {
  bindingType: 'kv' | 'd1' | 'r2' | 'queue' | 'ai' | 'vectorize' | 'hyperdrive';
  bindingName: string;
  databaseName?: string;
  bucketName?: string;
  queueName?: string;
  indexName?: string;
  dimensions?: number;
}

export interface BindingScaffoldResult {
  success: boolean;
  helperPath: string;
  bindingName: string;
  nextSteps: string[];
}

export class BindingScaffolder {
  private templateService: BindingTemplateService;
  private configUpdater: ConfigUpdater;
  private anchorService: AnchorService;
  private validator: BindingValidator;

  constructor() {
    this.templateService = new BindingTemplateService();
    this.configUpdater = new ConfigUpdater();
    this.anchorService = new AnchorService();
    this.validator = new BindingValidator();
  }

  async scaffold(
    cwd: string,
    config: BindingScaffoldConfig
  ): Promise<BindingScaffoldResult> {
    const rollback = new RollbackManager();

    try {
      // 1. Validate project and inputs
      await this.validateProject(cwd);
      await this.validator.validateBindingConfig(cwd, config);

      // 2. Generate helper utility
      const helperPath = await this.templateService.generateHelper(
        cwd,
        config.bindingType,
        {
          bindingName: config.bindingName,
          databaseName: config.databaseName,
          bucketName: config.bucketName,
          // ... other options
        }
      );
      rollback.addFile(helperPath);

      // 3. Update wrangler.jsonc via anchors
      await this.configUpdater.addBinding(cwd, config.bindingType, config);
      rollback.addConfigChange('wrangler.jsonc');

      // 4. Run cf-typegen
      await this.runCfTypegen(cwd);

      // 5. Commit changes
      rollback.commit();

      return {
        success: true,
        helperPath,
        bindingName: config.bindingName,
        nextSteps: this.generateNextSteps(config),
      };
    } catch (error) {
      await rollback.rollback();
      throw error;
    }
  }

  private generateNextSteps(config: BindingScaffoldConfig): string[] {
    const steps: string[] = [];

    switch (config.bindingType) {
      case 'kv':
        steps.push(
          `Create KV namespace: npx wrangler kv namespace create ${config.bindingName}`,
          `Update wrangler.jsonc: Replace TODO_CREATE_KV_NAMESPACE with the namespace ID`,
          `Use in code: import { ${this.getHelperClassName(config)} } from './utils/bindings/${config.bindingType}-${toKebabCase(config.bindingName)}.js'`
        );
        break;

      case 'd1':
        steps.push(
          `Create D1 database: npx wrangler d1 create ${config.databaseName || config.bindingName}`,
          `Update wrangler.jsonc: Replace TODO_CREATE_D1_DATABASE with the database ID`,
          `Create migrations: npx wrangler d1 migrations create ${config.databaseName} init`,
          `Apply migrations: npx wrangler d1 migrations apply ${config.databaseName} --local`
        );
        break;

      // ... other types
    }

    return steps;
  }

  private getHelperClassName(config: BindingScaffoldConfig): string {
    const baseName = toPascalCase(config.bindingName);
    const suffix = config.bindingType.toUpperCase();
    return `${baseName}${suffix}`;
  }

  private async validateProject(cwd: string): Promise<void> {
    // Check for wrangler.jsonc
    const wranglerPath = path.join(cwd, 'wrangler.jsonc');
    if (!await fileExists(wranglerPath)) {
      throw new Error('wrangler.jsonc not found. Is this a Cloudflare Workers project?');
    }

    // Check for anchors
    const content = await readFile(wranglerPath, 'utf-8');
    if (!content.includes('<mcp-bindings:')) {
      throw new Error(
        'Binding anchors not found. This project may need to be updated to support bindings.'
      );
    }
  }

  private async runCfTypegen(cwd: string): Promise<void> {
    await execAsync('npm run cf-typegen', { cwd });
  }
}
```

#### 1.3 Anchor System Extension

**Update File**: `src/core/commands/shared/anchor-service.ts`

Add new anchor definitions:

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
  IMPORTS: {
    type: "bindings:imports",
    startMarker: "// <mcp-bindings:imports>",
    endMarker: "// </mcp-bindings:imports>",
    description: "Binding helper imports",
  },
};
```

**Update File**: `templates/cloudflare-remote/files/wrangler.jsonc.hbs`

Add anchors:

```jsonc
{
  "name": "{{PROJECT_NAME}}",
  "main": "src/index.ts",
  "compatibility_date": "2025-03-10",
  "compatibility_flags": ["nodejs_compat"],

  // <mcp-bindings:kv>
  // KV namespace bindings managed by mcp-server-kit
  // Add KV bindings using: mcp-server-kit add binding kv --name MY_CACHE
  // </mcp-bindings:kv>

  // <mcp-bindings:d1>
  // D1 database bindings managed by mcp-server-kit
  // Add D1 bindings using: mcp-server-kit add binding d1 --name MY_DB --database-name my-database
  // </mcp-bindings:d1>

  // ... existing durable_objects config
}
```

**Update File**: `templates/cloudflare-remote/files/src/index.ts.hbs`

Add import anchor:

```typescript
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// <mcp-bindings:imports>
// Binding helper imports will be added here by add binding command
// Example: import { MyCacheKV } from './utils/bindings/kv-my-cache.js';
// </mcp-bindings:imports>

// ... rest of file
```

#### 1.4 Generate KV Helper Template

**New File**: `templates/scaffolding/bindings/kv-helper.hbs`

See architecture document for full template. Key features:
- Type-safe wrapper class
- Methods: get, set, delete, list, has
- Error handling
- JSDoc documentation
- Usage examples in comments

#### 1.5 Generate D1 Helper Template

**New File**: `templates/scaffolding/bindings/d1-helper.hbs`

See architecture document for full template. Key features:
- Type-safe SQL operations
- Methods: query, queryFirst, execute, batch
- Prepared statement handling
- Error handling with context

#### 1.6 Update Resource/Tool Templates

**Update File**: `templates/scaffolding/entities/resource.hbs`

Add conditional logic for binding-aware code generation:

```handlebars
{{#if USE_BINDING}}
import { {{HELPER_CLASS_NAME}} } from "../utils/bindings/{{BINDING_TYPE}}-{{toKebabCase BINDING_NAME}}.js";
{{/if}}

export function register{{capitalizedName}}Resource(server: McpServer): void {
  server.resource(
    "{{name}}",
    {{#if IS_DYNAMIC}}
    new ResourceTemplate("{{uriPattern}}", { ... }),
    {{else}}
    "{{uri}}",
    {{/if}}
    { description: "{{description}}" },
    async (uri{{#if IS_DYNAMIC}}, variables{{/if}}, env) => {
      {{#if USE_BINDING}}
      // Use {{BINDING_TYPE}} binding for data retrieval
      const {{BINDING_TYPE}} = new {{HELPER_CLASS_NAME}}(env.{{BINDING_NAME}});

      {{#if (eq BINDING_TYPE "kv")}}
      // Fetch from KV
      const data = await {{BINDING_TYPE}}.get({{#if IS_DYNAMIC}}variables.id as string{{else}}'config'{{/if}});
      {{/if}}

      {{#if (eq BINDING_TYPE "d1")}}
      // Query from D1
      const data = await {{BINDING_TYPE}}.queryFirst(
        'SELECT * FROM {{TABLE_NAME}} WHERE id = ?',
        [{{#if IS_DYNAMIC}}variables.id{{else}}1{{/if}}]
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
      // Common patterns:
      // - Read from KV: await env.MY_KV.get(id)
      // - Query D1: await env.MY_DB.prepare("SELECT * FROM table WHERE id = ?").bind(id).first()
      // - Fetch from R2: await env.MY_BUCKET.get(key)
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
```

#### 1.7 Validation Extension

**New File**: `src/core/commands/shared/binding-validator.ts`

See architecture document for full implementation. Key validations:
- Check binding declared in wrangler.jsonc
- Check binding not already exists
- Scan code for binding usage
- Detect unused bindings (warning)
- Detect missing bindings (error)
- Check helper utilities exist

**Update File**: `src/core/commands/validate.ts`

Integrate binding validation:

```typescript
import { BindingValidator } from './shared/binding-validator.js';

export async function validateProject(cwd: string): Promise<ValidationReport> {
  const results: ValidationResult[] = [];

  // ... existing validation (tools, prompts, resources)

  // NEW: Validate bindings
  const bindingValidator = new BindingValidator();
  const bindingResults = await bindingValidator.validateBindings(cwd);
  results.push(...bindingResults);

  return { results, success: results.every(r => r.type !== 'error') };
}
```

### Testing Strategy

**Unit Tests**:
- `test/unit/commands/add-binding.test.ts` - Command parsing and validation
- `test/unit/commands/shared/binding-scaffolder.test.ts` - Scaffolding logic
- `test/unit/commands/shared/binding-validator.test.ts` - Validation logic

**Integration Tests**:
- `test/integration/add-binding-kv.e2e.ts` - Full KV binding workflow
- `test/integration/add-binding-d1.e2e.ts` - Full D1 binding workflow

### Success Criteria

✅ KV binding added with single command
✅ D1 binding added with single command
✅ Helper utilities generated correctly
✅ wrangler.jsonc updated via anchors
✅ Type generation runs automatically
✅ Validation detects configuration errors
✅ All unit tests pass
✅ All integration tests pass

---

## Phase 2: Storage & Queue Primitives (R2, Queues)

**Duration**: 1-2 days
**Priority**: HIGH (common async patterns)

### Goals

- Add R2 bucket support (file storage)
- Add Queue support (async processing)
- Demonstrate binding combinations (Queue → R2)

### Deliverables

#### 2.1 R2 Bucket Support

**New Template**: `templates/scaffolding/bindings/r2-helper.hbs`

```typescript
/**
 * {{HELPER_CLASS_NAME}} - Helper for {{BINDING_NAME}} R2 bucket
 */
export class {{HELPER_CLASS_NAME}} {
  constructor(private bucket: R2Bucket) {}

  async put(
    key: string,
    value: string | ArrayBuffer | ReadableStream,
    options?: {
      httpMetadata?: R2HTTPMetadata;
      customMetadata?: Record<string, string>;
    }
  ): Promise<void> {
    await this.bucket.put(key, value, options);
  }

  async get(key: string): Promise<R2ObjectBody | null> {
    return await this.bucket.get(key);
  }

  async delete(key: string | string[]): Promise<void> {
    await this.bucket.delete(key);
  }

  async list(options?: R2ListOptions): Promise<R2Objects> {
    return await this.bucket.list(options);
  }

  async head(key: string): Promise<R2Object | null> {
    return await this.bucket.head(key);
  }
}
```

**Update**: `src/core/commands/shared/anchor-service.ts`

Add R2 anchor:

```typescript
R2: {
  type: "bindings:r2",
  startMarker: "// <mcp-bindings:r2>",
  endMarker: "// </mcp-bindings:r2>",
  description: "R2 bucket bindings",
},
```

**Update**: `templates/cloudflare-remote/files/wrangler.jsonc.hbs`

Add R2 anchor section.

#### 2.2 Queue Support

**New Template**: `templates/scaffolding/bindings/queue-producer.hbs`

```typescript
/**
 * {{HELPER_CLASS_NAME}} - Helper for {{BINDING_NAME}} queue producer
 */
export class {{HELPER_CLASS_NAME}} {
  constructor(private queue: Queue) {}

  async send<T = any>(message: T): Promise<void> {
    await this.queue.send(message);
  }

  async sendBatch<T = any>(messages: T[]): Promise<void> {
    await this.queue.sendBatch(
      messages.map(body => ({ body }))
    );
  }
}
```

**New Template**: `templates/scaffolding/bindings/queue-consumer.hbs`

```typescript
/**
 * Queue consumer handler for {{QUEUE_NAME}}
 *
 * This file is auto-generated. Add your consumer logic below.
 */

export default {
  async queue(batch: MessageBatch, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        // TODO: Process message
        console.log('Processing message:', message.body);

        // Acknowledge successful processing
        message.ack();
      } catch (error) {
        console.error('Failed to process message:', error);

        // Retry on failure (up to max retries)
        if (message.attempts < 3) {
          message.retry({ delaySeconds: 60 });
        }
      }
    }
  }
};
```

**Update**: wrangler.jsonc template for queue producer and consumer config

#### 2.3 Example Tool: File Upload

**New Example**: `templates/scaffolding/examples/r2-file-upload-tool.hbs`

Complete example showing R2 file upload with base64 encoding.

### Testing Strategy

**Integration Tests**:
- R2 put/get/delete operations
- Queue producer/consumer workflow
- Combined: Queue message triggers R2 upload

---

## Phase 3: AI/ML Primitives (Workers AI, Vectorize)

**Duration**: 2-3 days
**Priority**: HIGH (AI/RAG use cases)

### Goals

- Add Workers AI support (text generation, embeddings)
- Add Vectorize support (vector search)
- Demonstrate RAG pattern (AI + Vectorize + D1)

### Deliverables

#### 3.1 Workers AI Support

**New Template**: `templates/scaffolding/bindings/ai-helper.hbs`

```typescript
/**
 * {{HELPER_CLASS_NAME}} - Helper for Workers AI binding
 */
export class {{HELPER_CLASS_NAME}} {
  constructor(private ai: Ai) {}

  async generateText(
    prompt: string,
    options?: {
      model?: string;
      stream?: boolean;
    }
  ): Promise<string | ReadableStream> {
    const model = options?.model || '@cf/meta/llama-3.1-8b-instruct';

    const result = await this.ai.run(model, {
      prompt,
      stream: options?.stream
    });

    return options?.stream ? result as ReadableStream : result.response;
  }

  async generateEmbedding(
    text: string | string[],
    options?: {
      model?: string;
    }
  ): Promise<number[][]> {
    const model = options?.model || '@cf/baai/bge-base-en-v1.5';

    const result = await this.ai.run(model, {
      text: Array.isArray(text) ? text : [text]
    });

    return result.data;
  }

  async chat(
    messages: Array<{ role: string; content: string }>,
    options?: {
      model?: string;
      stream?: boolean;
    }
  ): Promise<string | ReadableStream> {
    const model = options?.model || '@cf/meta/llama-3.1-8b-instruct';

    const result = await this.ai.run(model, {
      messages,
      stream: options?.stream
    });

    return options?.stream ? result as ReadableStream : result.response;
  }
}
```

#### 3.2 Vectorize Support

**New Template**: `templates/scaffolding/bindings/vectorize-helper.hbs`

```typescript
/**
 * {{HELPER_CLASS_NAME}} - Helper for {{BINDING_NAME}} Vectorize index
 */
export class {{HELPER_CLASS_NAME}} {
  constructor(private index: Vectorize) {}

  async upsert(
    vectors: Array<{
      id: string;
      values: number[];
      metadata?: Record<string, any>;
    }>
  ): Promise<void> {
    await this.index.upsert(vectors);
  }

  async query(
    vector: number[],
    options?: {
      topK?: number;
      filter?: Record<string, any>;
      returnMetadata?: 'none' | 'indexed' | 'all';
    }
  ): Promise<VectorizeMatches> {
    return await this.index.query(vector, {
      topK: options?.topK || 10,
      filter: options?.filter,
      returnMetadata: options?.returnMetadata || 'all',
    });
  }

  async deleteByIds(ids: string[]): Promise<void> {
    await this.index.deleteByIds(ids);
  }

  async getByIds(ids: string[]): Promise<VectorizeVector[]> {
    return await this.index.getByIds(ids);
  }
}
```

#### 3.3 RAG Example

**New Example**: `templates/scaffolding/examples/rag-knowledge-search-tool.hbs`

Complete RAG implementation showing:
1. Generate query embedding (Workers AI)
2. Search vectors (Vectorize)
3. Fetch documents (D1)
4. Generate answer with context (Workers AI)

### Testing Strategy

**Integration Tests**:
- AI text generation
- AI embeddings generation
- Vectorize upsert/query
- Full RAG workflow

---

## Phase 4: Advanced Primitives (Hyperdrive, Service Bindings)

**Duration**: 1-2 days
**Priority**: MEDIUM (advanced use cases)

### Goals

- Add Hyperdrive support (external database pooling)
- Add Service Binding support (worker-to-worker)
- Demonstrate hybrid architecture patterns

### Deliverables

#### 4.1 Hyperdrive Support

**New Template**: `templates/scaffolding/bindings/hyperdrive-helper.hbs`

```typescript
/**
 * {{HELPER_CLASS_NAME}} - Helper for {{BINDING_NAME}} Hyperdrive connection
 */
import { Client, Pool } from 'pg'; // or mysql2

export class {{HELPER_CLASS_NAME}} {
  private pool: Pool;

  constructor(hyperdrive: Hyperdrive) {
    this.pool = new Pool({
      connectionString: hyperdrive.connectionString,
      max: 5, // Limit connections
    });
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows as T[];
    } finally {
      client.release();
    }
  }

  async queryFirst<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows[0] || null;
  }

  async execute(sql: string, params: any[] = []): Promise<any> {
    const client = await this.pool.connect();
    try {
      return await client.query(sql, params);
    } finally {
      client.release();
    }
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
  }
}
```

#### 4.2 Service Bindings (Optional)

**New Template**: `templates/scaffolding/bindings/service-helper.hbs`

For Worker-to-Worker RPC communication.

### Testing Strategy

- Hyperdrive PostgreSQL integration
- Connection pooling validation

---

## Phase 5: Testing, Examples & Documentation

**Duration**: 2-3 days
**Priority**: CRITICAL (agent enablement)

### Goals

- Complete test coverage
- Create example projects
- Update all documentation
- Create agent skill guide

### Deliverables

#### 5.1 Test Harness Extensions

**Update**: `src/harness/types/spec.ts`

Add `setup` section to test specs:

```typescript
export interface TestSpec {
  // ... existing fields

  setup?: {
    kv?: Record<string, Array<{ key: string; value: any }>>;
    d1?: Record<string, string[]>; // SQL statements
    r2?: Record<string, Array<{ key: string; value: string }>>;
    // ... other bindings
  };
}
```

**Update**: `src/harness/runner.ts`

Implement setup/cleanup logic for binding test data.

#### 5.2 Example Projects

Create complete, deployable examples:

**Example 1**: `examples/kv-cache-server/`
- MCP server using KV for caching API responses
- Tools: fetch-cached, clear-cache
- Resources: cache-stats

**Example 2**: `examples/d1-data-api/`
- MCP server with D1 CRUD operations
- Tools: create-user, get-user, update-user, delete-user
- Resources: user-list, user-detail

**Example 3**: `examples/rag-knowledge-base/`
- Full RAG implementation
- Workers AI + Vectorize + D1
- Tools: ingest-document, search-knowledge
- Includes Queue for async ingestion

Each example includes:
- Complete source code
- README with setup instructions
- wrangler.jsonc configuration
- Test suite
- Deployment guide

#### 5.3 Documentation Updates

**Update**: `README.md`

Add binding examples to Quick Start:

```markdown
## Using Cloudflare Primitives

```bash
# Add bindings
mcp-server-kit add binding kv --name CACHE
mcp-server-kit add binding d1 --name DB --database-name my-database
mcp-server-kit add binding ai  # Workers AI

# Use in tools
# Helper utilities provide type-safe wrappers
import { CacheKV } from './utils/bindings/kv-cache.js';

const cache = new CacheKV(env.CACHE);
await cache.set('key', { data: 'value' });
```
```

**New File**: `docs/bindings-guide.md`

Comprehensive guide to all Cloudflare primitives with:
- When to use each primitive
- Configuration examples
- Code patterns
- Best practices
- Troubleshooting

**Update**: `CLAUDE.md`

Add agent guidance for bindings section.

#### 5.4 Agent Skill Guide

**New File**: `templates/cloudflare-remote/files/.claude/skills/mcp-server-development/CLOUDFLARE-BINDINGS.md`

Agent-focused guide with:
- Quick reference table
- CLI commands
- Code patterns for each binding
- Common use cases
- RAG example
- Troubleshooting

(See next todo item for full content)

### Testing Strategy

**E2E Tests**:
- Complete project scaffolding
- Add all binding types
- Run validation
- Deploy to Cloudflare
- Test deployed endpoints

---

## Success Metrics

### Technical Metrics

- ✅ All 8 Cloudflare primitives supported
- ✅ Single-command binding addition
- ✅ Type-safe helper utilities
- ✅ Anchor-based configuration (no manual editing)
- ✅ Automatic validation
- ✅ 100% test coverage for core functionality
- ✅ Sub-second scaffolding time

### Agent Usability Metrics

- ✅ Clear error messages with actionable next steps
- ✅ TODO markers in generated code
- ✅ Inline documentation and examples
- ✅ Skill guide covers all patterns
- ✅ Validation catches common mistakes
- ✅ Rollback on failure (no partial state)

### Documentation Metrics

- ✅ Reference docs for all primitives
- ✅ Architecture analysis complete
- ✅ Implementation plan documented
- ✅ Agent skill guide created
- ✅ Example projects for each major primitive
- ✅ Troubleshooting guide

---

## File Creation Checklist

### Phase 1 (Foundation)

**Documentation** (3 files):
- ✅ `docs/cloudflare-primitives-reference.md`
- ✅ `docs/cloudflare-architecture-analysis.md`
- ✅ `docs/cloudflare-primitives-implementation-plan.md`

**Commands** (2 files):
- ☐ `src/core/commands/add-binding.ts`
- ☐ `src/core/commands/shared/binding-scaffolder.ts`

**Services** (3 files):
- ☐ `src/core/commands/shared/binding-templates.ts`
- ☐ `src/core/commands/shared/binding-validator.ts`
- ☐ Update `src/core/commands/shared/anchor-service.ts`
- ☐ Update `src/core/commands/shared/config-updater.ts`

**Templates** (5 files):
- ☐ `templates/scaffolding/bindings/kv-helper.hbs`
- ☐ `templates/scaffolding/bindings/d1-helper.hbs`
- ☐ Update `templates/cloudflare-remote/files/wrangler.jsonc.hbs`
- ☐ Update `templates/cloudflare-remote/files/src/index.ts.hbs`
- ☐ Update `templates/scaffolding/entities/resource.hbs`
- ☐ Update `templates/scaffolding/entities/tool.hbs`

**Tests** (4 files):
- ☐ `test/unit/commands/add-binding.test.ts`
- ☐ `test/unit/commands/shared/binding-scaffolder.test.ts`
- ☐ `test/integration/add-binding-kv.e2e.ts`
- ☐ `test/integration/add-binding-d1.e2e.ts`

### Phase 2 (R2, Queues)

**Templates** (4 files):
- ☐ `templates/scaffolding/bindings/r2-helper.hbs`
- ☐ `templates/scaffolding/bindings/queue-producer.hbs`
- ☐ `templates/scaffolding/bindings/queue-consumer.hbs`
- ☐ `templates/scaffolding/examples/r2-file-upload-tool.hbs`

### Phase 3 (AI, Vectorize)

**Templates** (3 files):
- ☐ `templates/scaffolding/bindings/ai-helper.hbs`
- ☐ `templates/scaffolding/bindings/vectorize-helper.hbs`
- ☐ `templates/scaffolding/examples/rag-knowledge-search-tool.hbs`

### Phase 4 (Hyperdrive)

**Templates** (1 file):
- ☐ `templates/scaffolding/bindings/hyperdrive-helper.hbs`

### Phase 5 (Documentation, Examples)

**Documentation** (2 files):
- ☐ `docs/bindings-guide.md`
- ☐ `templates/cloudflare-remote/files/.claude/skills/mcp-server-development/CLOUDFLARE-BINDINGS.md`

**Examples** (3 directories):
- ☐ `examples/kv-cache-server/`
- ☐ `examples/d1-data-api/`
- ☐ `examples/rag-knowledge-base/`

**Updates** (3 files):
- ☐ Update `README.md`
- ☐ Update `CLAUDE.md`
- ☐ Update `src/harness/` for binding test support

---

## Risk Mitigation

### Technical Risks

**Risk**: Breaking changes to existing projects
**Mitigation**: Anchors are optional, backward compatible

**Risk**: Template complexity grows
**Mitigation**: Keep helpers small, single-purpose; use composition

**Risk**: Type generation fails
**Mitigation**: Rollback mechanism; validate wrangler.jsonc before commit

### Process Risks

**Risk**: Phase 1 takes longer than estimated
**Mitigation**: Start with KV only, prove architecture, then add D1

**Risk**: Test coverage gaps
**Mitigation**: Write tests concurrently with implementation

**Risk**: Documentation drift
**Mitigation**: Update docs in same PR as code changes

---

## Next Steps

1. ✅ Review and approve this plan
2. ☐ Begin Phase 1 implementation
3. ☐ Create KV binding support (prove architecture)
4. ☐ Create D1 binding support (validate patterns)
5. ☐ Iterate through Phases 2-5
6. ☐ Release v2.0.0 with binding support

---

## Version Roadmap

### v1.1.0 (Phase 1)
- KV and D1 binding support
- Basic validation
- Helper templates

### v1.2.0 (Phase 2)
- R2 and Queue support
- Enhanced validation
- Example tools

### v1.3.0 (Phase 3)
- Workers AI and Vectorize support
- RAG patterns
- AI examples

### v2.0.0 (Phase 4-5)
- Hyperdrive support
- Complete test harness
- Example projects
- Comprehensive documentation
- Agent skill guide

---

## References

- Cloudflare Primitives Reference: `cloudflare-primitives-reference.md`
- Architecture Analysis: `cloudflare-architecture-analysis.md`
- Auth Scaffolding: `src/core/commands/add-auth.ts` (reference implementation)
- Template System: `src/core/template-system/processor.ts`
- Anchor Service: `src/core/commands/shared/anchor-service.ts`
