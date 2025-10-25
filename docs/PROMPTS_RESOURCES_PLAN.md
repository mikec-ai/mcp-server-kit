# MCP Prompts & Resources Implementation Plan

**Status**: Planning Document
**Created**: 2025-10-25
**Purpose**: Guide implementation of MCP prompts and resources support

---

## Executive Summary

This document outlines the architecture and implementation plan for adding MCP **prompts** and **resources** support to mcp-server-kit, which currently only supports **tools**.

### MCP Primitives Overview

| Primitive | Control | Purpose | Client Methods |
|-----------|---------|---------|----------------|
| **Tools** | Model-controlled | Execute actions with side effects | `callTool()`, `listTools()` |
| **Prompts** | User-controlled | Reusable LLM interaction templates | `getPrompt()`, `listPrompts()` |
| **Resources** | Application-controlled | URI-based data sources | `readResource()`, `listResources()` |

---

## Phase 1: Core Infrastructure

### 1.1 Extend IMCPTestClient Interface

**File**: `src/harness/types/client.ts`

**Current interface** (tools only):
```typescript
export interface IMCPTestClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  callTool(name: string, args: Record<string, any>): Promise<MCPToolResponse>;
  listTools(): Promise<MCPTool[]>;
  getServerInfo(): Promise<MCPServerInfo>;
}
```

**Proposed additions**:
```typescript
/**
 * MCP Prompt metadata
 */
export interface MCPPrompt {
  name: string;
  description: string;
  argsSchema?: Record<string, any>;
}

/**
 * MCP Prompt response
 */
export interface MCPPromptResponse {
  messages: Array<{
    role: 'user' | 'assistant';
    content: {
      type: 'text' | 'image' | 'resource';
      text?: string;
      data?: string;
      mimeType?: string;
    };
  }>;
}

/**
 * MCP Resource metadata
 */
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/**
 * MCP Resource content
 */
export interface MCPResourceContent {
  uri: string;
  text?: string;
  blob?: string;
  mimeType?: string;
}

export interface IMCPTestClient {
  // ... existing methods ...

  /**
   * List all available prompts from the server
   */
  listPrompts(): Promise<MCPPrompt[]>;

  /**
   * Get a prompt with arguments
   */
  getPrompt(name: string, args?: Record<string, unknown>): Promise<MCPPromptResponse>;

  /**
   * List all available resources from the server
   */
  listResources(): Promise<MCPResource[]>;

  /**
   * Read a resource by URI
   */
  readResource(uri: string): Promise<MCPResourceContent>;
}
```

**Refactoring opportunity**: Extract common patterns
```typescript
// Base metadata interface
interface MCPCapabilityMetadata {
  name: string;
  description: string;
}

export interface MCPTool extends MCPCapabilityMetadata {
  inputSchema: Record<string, any>;
}

export interface MCPPrompt extends MCPCapabilityMetadata {
  argsSchema?: Record<string, any>;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}
```

### 1.2 Update Test Harness Spec Types

**File**: `src/harness/types/spec.ts`

**Current** (tools only):
```typescript
export interface TestSpec {
  name: string;
  tool: string;  // ← Only supports tools
  arguments: Record<string, any>;
  assertions: Assertion[];
  // ...
}
```

**Proposed refactoring**:
```typescript
// Base test spec
interface BaseTestSpec {
  name: string;
  description?: string;
  timeout?: number;
  skip?: boolean;
  only?: boolean;
  assertions: Assertion[];
}

// Tool test spec (existing)
export interface ToolTestSpec extends BaseTestSpec {
  type: 'tool';
  tool: string;
  arguments: Record<string, any>;
}

// Prompt test spec (new)
export interface PromptTestSpec extends BaseTestSpec {
  type: 'prompt';
  prompt: string;
  arguments?: Record<string, any>;
}

// Resource test spec (new)
export interface ResourceTestSpec extends BaseTestSpec {
  type: 'resource';
  uri: string;
}

// Union type
export type TestSpec = ToolTestSpec | PromptTestSpec | ResourceTestSpec;
```

**Example YAML specs**:

```yaml
# Tool test (existing)
type: tool
name: "Test echo tool"
tool: "echo"
arguments:
  message: "Hello"
assertions:
  - type: "success"
  - type: "contains_text"
    text: "Hello"
```

```yaml
# Prompt test (new)
type: prompt
name: "Test code review prompt"
prompt: "review-code"
arguments:
  code: "function foo() { return 42; }"
assertions:
  - type: "success"
  - type: "contains_text"
    text: "review"
```

```yaml
# Resource test (new)
type: resource
name: "Test config resource"
uri: "config://app"
assertions:
  - type: "success"
  - type: "contains_text"
    text: "configuration"
```

### 1.3 Validation Schemas

**File**: `src/harness/validation/schemas.ts`

Add Zod schemas for new test specs:

```typescript
const BaseTestSpecSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  timeout: z.number().optional(),
  skip: z.boolean().optional(),
  only: z.boolean().optional(),
  assertions: z.array(AssertionSchema),
});

const ToolTestSpecSchema = BaseTestSpecSchema.extend({
  type: z.literal('tool'),
  tool: z.string(),
  arguments: z.record(z.any()),
});

const PromptTestSpecSchema = BaseTestSpecSchema.extend({
  type: z.literal('prompt'),
  prompt: z.string(),
  arguments: z.record(z.any()).optional(),
});

const ResourceTestSpecSchema = BaseTestSpecSchema.extend({
  type: z.literal('resource'),
  uri: z.string().url(),
});

export const TestSpecSchema = z.discriminatedUnion('type', [
  ToolTestSpecSchema,
  PromptTestSpecSchema,
  ResourceTestSpecSchema,
]);
```

---

## Phase 2: CLI Commands

### 2.1 Add Prompt Command

**New file**: `src/core/commands/add-prompt.ts`

Pattern similar to `add-tool.ts`:
```typescript
export function createAddPromptCommand(): Command {
  return new Command("prompt")
    .description("Add a new prompt to the MCP server")
    .argument("<prompt-name>", "Name of the prompt")
    .option("-d, --description <desc>", "Prompt description")
    .option("--no-tests", "Skip test file generation")
    .option("--no-register", "Don't auto-register in index.ts")
    .action(async (name, options) => {
      // 1. Create src/prompts/<name>.ts
      // 2. Create test/unit/prompts/<name>.test.ts
      // 3. Create test/integration/specs/prompts/<name>.yaml
      // 4. Register in src/index.ts
      // 5. Update .mcp-template.json
    });
}
```

### 2.2 Add Resource Command

**New file**: `src/core/commands/add-resource.ts`

```typescript
export function createAddResourceCommand(): Command {
  return new Command("resource")
    .description("Add a new resource to the MCP server")
    .argument("<resource-name>", "Name of the resource")
    .option("-u, --uri-pattern <pattern>", "URI pattern (e.g., 'files://{path}')")
    .option("-d, --description <desc>", "Resource description")
    .option("--no-tests", "Skip test file generation")
    .option("--no-register", "Don't auto-register in index.ts")
    .action(async (name, options) => {
      // Similar to add-prompt
    });
}
```

### 2.3 List Commands

**Update**: `src/core/commands/list-tools.ts` → `src/core/commands/list.ts`

```typescript
// Extend to list all capabilities
mcp-server-kit list tools
mcp-server-kit list prompts
mcp-server-kit list resources
mcp-server-kit list all
```

---

## Phase 3: Template System Updates

### 3.1 Template Directory Structure

**Current**:
```
templates/cloudflare-remote/files/
├── src/
│   ├── index.ts
│   └── tools/
│       └── _example-echo.ts
```

**Proposed**:
```
templates/cloudflare-remote/files/
├── src/
│   ├── index.ts
│   ├── tools/
│   │   └── _example-echo.ts
│   ├── prompts/
│   │   └── _example-code-review.ts
│   └── resources/
│       └── _example-config.ts
```

### 3.2 Example Prompt Template

**File**: `templates/cloudflare-remote/files/src/prompts/_example-code-review.ts.hbs`

```typescript
/**
 * Example Prompt: Code Review
 *
 * This is an example prompt showing how to create reusable
 * prompt templates for LLM interactions.
 */

import type { McpServer } from '@modelcontextprotocol/sdk';

export function registerCodeReviewPrompt(server: McpServer) {
  server.registerPrompt(
    'review-code',
    {
      title: 'Code Review',
      description: 'Review code for best practices and potential issues',
      argsSchema: {
        code: z.string(),
        language: z.string().optional(),
      },
    },
    ({ code, language }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please review this ${language || ''} code:\n\n${code}`,
          },
        },
      ],
    }),
  );
}
```

### 3.3 Example Resource Template

**File**: `templates/cloudflare-remote/files/src/resources/_example-config.ts.hbs`

```typescript
/**
 * Example Resource: Application Config
 *
 * This is an example resource showing how to expose data
 * as URI-based resources.
 */

import type { McpServer } from '@modelcontextprotocol/sdk';

export function registerConfigResource(server: McpServer) {
  server.registerResource(
    'config',
    'config://app',
    {
      title: 'Application Configuration',
      description: 'Application configuration data',
      mimeType: 'application/json',
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify({
            appName: '{{PROJECT_NAME}}',
            version: '1.0.0',
            environment: 'development',
          }, null, 2),
        },
      ],
    }),
  );
}
```

---

## Phase 4: Cache Integration

### 4.1 Resource Metadata Caching

**Current**: `src/services/cache.ts` exports:
```typescript
export const metadataCache = new LRUCache<any>(50, 60);
export const openApiCache = new LRUCache<any>(50, 60);
```

**Proposed additions**:
```typescript
// Cache for resource metadata
export const resourceCache = new LRUCache<MCPResourceContent>(100, 30); // 30 min TTL

// Cache for prompt templates
export const promptCache = new LRUCache<MCPPromptResponse>(50, 60); // 60 min TTL
```

**Usage example** in test runner:
```typescript
async readResource(uri: string): Promise<MCPResourceContent> {
  // Check cache first
  const cached = resourceCache.get(uri);
  if (cached) {
    return cached;
  }

  // Fetch from server
  const content = await this.client.readResource(uri);

  // Cache the result
  resourceCache.set(uri, content);

  return content;
}
```

**Test coverage note**: Cache service now has **100% test coverage**, including:
- ✅ LRU eviction logic
- ✅ TTL expiration
- ✅ Cleanup functionality
- ✅ Edge cases

---

## Phase 5: Test Runner Updates

### 5.1 Runner Dispatch Logic

**File**: `src/harness/runner.ts`

**Current**:
```typescript
async runTest(spec: TestSpec): Promise<TestResult> {
  // Only handles tools
  const response = await this.client.callTool(spec.tool, spec.arguments);
  // ...
}
```

**Proposed refactoring**:
```typescript
async runTest(spec: TestSpec): Promise<TestResult> {
  let response: any;

  switch (spec.type) {
    case 'tool':
      response = await this.client.callTool(spec.tool, spec.arguments);
      break;
    case 'prompt':
      response = await this.client.getPrompt(spec.prompt, spec.arguments);
      break;
    case 'resource':
      response = await this.client.readResource(spec.uri);
      break;
  }

  // Run assertions...
}
```

### 5.2 New Assertion Types

**Prompts-specific assertions**:
```yaml
- type: "prompt_has_role"
  role: "user"

- type: "prompt_message_count"
  min: 1
  max: 5
```

**Resources-specific assertions**:
```yaml
- type: "resource_mime_type"
  mimeType: "application/json"

- type: "resource_size"
  max: 1048576  # 1MB
```

---

## Phase 6: Validation Updates

### 6.1 Validate Command Extensions

**File**: `src/core/commands/validate.ts`

**Current checks**:
- ✅ All tools registered in index.ts
- ✅ Unit tests exist for tools
- ✅ Integration tests exist for tools

**New checks needed**:
- ✅ All prompts registered
- ✅ All resources registered
- ✅ Prompt argument schemas valid
- ✅ Resource URI patterns valid
- ✅ Test files exist for prompts/resources

---

## Implementation Priority

### Critical Path (Week 1)
1. ✅ **Cache tests** (DONE - 100% coverage)
2. ✅ **Reporter tests** (DONE - 100% coverage)
3. 🔄 **IMCPTestClient interface extension**
4. 🔄 **Test spec type refactoring**

### High Priority (Week 2)
5. **Add prompt/resource commands**
6. **Template updates with examples**
7. **Test runner dispatch logic**

### Medium Priority (Week 3)
8. **Validation command updates**
9. **New assertion types**
10. **Documentation updates**

---

## Testing Strategy

### Unit Tests Required
- ✅ Cache service (28 tests - DONE)
- ✅ JSON reporter (17 tests - DONE)
- ✅ Console reporter (28 tests - DONE)
- 🔄 Prompt command tests
- 🔄 Resource command tests
- 🔄 Validation updates tests

### Integration Tests Required
- 🔄 Prompt scaffolding E2E
- 🔄 Resource scaffolding E2E
- 🔄 Test harness with prompts
- 🔄 Test harness with resources

---

## Migration Path for Existing Projects

### Breaking Changes
**None** - This is additive, existing tool-only projects continue to work.

### Optional Migration
Projects can opt-in to prompts/resources:
```bash
# Add a prompt
mcp-server-kit add prompt code-review

# Add a resource
mcp-server-kit add resource config --uri-pattern "config://{env}"

# Validate new capabilities
mcp-server-kit validate
```

---

## Success Metrics

- ✅ **Test coverage** maintained at 50%+ (currently 50.41%)
- ✅ **Zero breaking changes** for existing projects
- ✅ **Feature parity** with MCP SDK capabilities
- ✅ **Documentation** complete for all new features

---

## References

- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Specification](https://modelcontextprotocol.io)
- [Current test coverage report](#)

---

**Next Steps**: Review this plan with stakeholders, then proceed with implementation in priority order.
