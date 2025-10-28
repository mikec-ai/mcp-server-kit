# MCP Test Harness

**Declarative, Agent-Friendly Integration Testing for MCP Servers**

A portable test framework for testing Model Context Protocol (MCP) servers using simple YAML/JSON test specifications. No coding required.

## Features

- **Declarative**: Define tests in YAML/JSON, not code
- **Agent-Optimized**: Designed for AI agents to read and write
- **Portable**: Zero project-specific dependencies
- **Fast**: Comprehensive unit tests run in milliseconds
- **Type-Safe**: Full TypeScript with Zod validation

## Quick Example

```yaml
name: "Test API listing"
tool: "list_apis"
arguments:
  includeDeprecated: false

assertions:
  - type: "success"
  - type: "response_time_ms"
    max: 5000
  - type: "contains_text"
    text: "APIs found"
```

---

## Test Specification Format

Tests are defined as YAML or JSON objects with the following structure:

### Required Fields

```typescript
{
  name: string;           // Human-readable test name
  tool: string;           // MCP tool name to test
  arguments: object;      // Arguments to pass to the tool
  assertions: Assertion[]; // Array of assertions to verify
}
```

### Optional Fields

```typescript
{
  description?: string;   // Test description for documentation
  timeout?: number;       // Test-specific timeout (milliseconds)
  skip?: boolean;         // Skip this test
  only?: boolean;         // Only run this test (exclusive)
}
```

### Complete Example

```yaml
name: "Complete test example"
description: "Demonstrates all test spec features"
tool: "get_data"
arguments:
  id: "123"
  format: "json"
timeout: 10000
skip: false

assertions:
  - type: "success"
  - type: "response_time_ms"
    max: 5000
  - type: "json_path"
    path: "$.data.id"
    expected: "123"
```

---

## Assertion Types

### `success`

Verifies the tool call succeeded (no error).

```yaml
- type: "success"
```

**Passes when:** `response.isError === false`

---

### `error`

Verifies the tool call failed with an error.

```yaml
- type: "error"
  messageContains: "not found"  # optional
```

**Parameters:**
- `messageContains` (optional): Text that error message should contain (case-insensitive)

**Passes when:**
- `response.isError === true`
- If `messageContains` specified, error message includes that text

---

### `contains_text`

Verifies response contains specific text.

```yaml
- type: "contains_text"
  text: "expected string"
  caseInsensitive: false  # optional, default: false
```

**Parameters:**
- `text` (required): Text to search for
- `caseInsensitive` (optional): Case-insensitive matching

**Passes when:** Response text includes the specified string

---

### `not_contains_text`

Verifies response does NOT contain specific text.

```yaml
- type: "not_contains_text"
  text: "unwanted string"
  caseInsensitive: false  # optional
```

**Parameters:**
- `text` (required): Text that should not be present
- `caseInsensitive` (optional): Case-insensitive matching

**Passes when:** Response text does not include the specified string

---

### `response_time_ms`

Verifies response time is within a maximum limit.

```yaml
- type: "response_time_ms"
  max: 5000  # milliseconds
```

**Parameters:**
- `max` (required): Maximum response time in milliseconds

**Passes when:** `duration <= max`

---

### `json_path`

Verifies value at a JSON path exists or matches expected value.

**Existence check** (omit `expected`):
```yaml
- type: "json_path"
  path: "$.data.id"
```

**Value check** (provide `expected`):
```yaml
- type: "json_path"
  path: "$.data[0].name"
  expected: "John"
```

**Parameters:**
- `path` (required): JSON path expression (uses JSONPath syntax)
- `expected` (optional): Expected value at path. If omitted, checks path existence only.

**Passes when:**
- If `expected` omitted: Path exists in response (any value including null, false, 0, "")
- If `expected` provided: Value at path deep equals expected value (strict type matching)

**Supported paths:**
- Root: `$`
- Properties: `$.user.name`
- Arrays: `$.items[0]`
- Nested: `$.data.users[1].email`

**Type matching:**
- Uses strict type comparison: `42` ≠ `"42"`
- Supports all JSON types: strings, numbers, booleans, null, objects, arrays
- Uses deep equality for objects and arrays

---

### `regex_match`

Verifies response matches a regular expression pattern.

```yaml
- type: "regex_match"
  pattern: "\\d+ items found"
  flags: "i"  # optional
```

**Parameters:**
- `pattern` (required): Regular expression pattern
- `flags` (optional): Regex flags (`i` = case-insensitive, `m` = multiline, `g` = global)

**Passes when:** Response text matches the regex pattern

---

### `snapshot` (Coming Soon)

Compares response against a saved snapshot file.

```yaml
- type: "snapshot"
  file: "response-snapshot.json"
  ignoreFields: ["timestamp", "requestId"]  # optional
```

**Parameters:**
- `file` (required): Snapshot file name (relative to snapshots directory)
- `ignoreFields` (optional): Array of field paths to ignore in comparison

---

### `json_schema` (Coming Soon)

Validates response against a JSON Schema.

```yaml
- type: "json_schema"
  schema: "response-schema.json"
```

**Parameters:**
- `schema` (required): JSON Schema file path (relative to contracts directory)

---

## JSON Output Format

When using programmatic test execution, results are returned in this structure:

```typescript
{
  summary: {
    total: number;        // Total tests run
    passed: number;       // Tests that passed
    failed: number;       // Tests that failed
    skipped: number;      // Tests that were skipped
    duration: number;     // Total duration in ms
    successRate: number;  // Decimal (0.0 to 1.0)
  },
  tests: Array<{
    name: string;         // Test name
    passed: boolean;      // Did test pass?
    duration: number;     // Test duration in ms
    skipped?: boolean;    // Was test skipped?
    assertions: Array<{   // Assertion results
      type: string;
      passed: boolean;
      message: string;
      expected?: any;
      actual?: any;
    }>,
    error?: {             // If test threw exception
      message: string;
      stack?: string;
    }
  }>,
  failures: Array<{       // Failed assertions
    test: string;         // Test name
    assertion: string;    // Assertion type
    expected: any;        // Expected value
    actual: any;          // Actual value
    message: string;      // Failure message
  }>,
  timestamp: string;      // ISO timestamp
  serverUrl?: string;     // Server URL tested
}
```

---

## Architecture & Design

### Design Principles

1. **Portable**: No project-specific dependencies
2. **Declarative**: Tests as data, not code
3. **Dependency Injection**: Uses `IMCPTestClient` interface
4. **Type-Safe**: Full TypeScript with runtime validation
5. **Testable**: Comprehensive unit test coverage

### Dependencies

- `yaml` - YAML parsing
- `zod` - Runtime validation
- `jsonpath-plus` - JSON path queries
- Node.js built-ins only (fs, path)

### IMCPTestClient Interface

The harness uses dependency injection to remain portable. Projects implement this interface:

```typescript
interface IMCPTestClient {
  /**
   * Connect to the MCP server
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the MCP server
   */
  disconnect(): Promise<void>;

  /**
   * Check if server is available
   */
  isServerAvailable(): Promise<boolean>;

  /**
   * Call an MCP tool
   */
  callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<MCPToolResponse>;

  /**
   * Extract text content from response
   */
  getTextContent(response: MCPToolResponse): string;
}

interface MCPToolResponse {
  content: Array<{ type: string; text: string }>;
  isError: boolean;
}
```

### Directory Structure

```
harness/
├── types/              # TypeScript type definitions
│   ├── client.ts      # IMCPTestClient interface
│   ├── spec.ts        # Test specification types
│   ├── results.ts     # Test result types
│   └── config.ts      # Configuration types
│
├── assertions/        # Assertion implementations
│   ├── index.ts       # Main assertion runner
│   ├── success.ts     # Success assertion
│   ├── error.ts       # Error assertion
│   ├── contains-text.ts
│   ├── response-time.ts
│   ├── json-path.ts
│   ├── regex.ts
│   └── helpers.ts     # Shared utilities
│
├── reporters/         # Output formatters
│   ├── json.ts        # JSON reporter
│   └── console.ts     # Console reporter
│
├── validation/        # Zod schemas
│   └── schemas.ts     # Test spec validation
│
├── spec-loader.ts     # YAML/JSON loader
├── runner.ts          # Test execution engine
│
├── __tests__/         # Unit tests (88 tests)
│   ├── assertions/    # Assertion tests
│   ├── spec-loader.test.ts
│   ├── validation.test.ts
│   └── vitest.config.ts
│
└── README.md          # This file
```

---

## Unit Tests

The harness includes comprehensive unit tests to ensure correctness.

### Running Tests

```bash
# Run all harness unit tests
npm run test:harness

# Run in watch mode
npm run test:harness:watch
```

### Test Coverage

**Comprehensive test coverage:**

**Assertion Functions:**
- `success.test.ts` - Success assertion tests
- `error.test.ts` - Error handling (messageContains, case sensitivity)
- `contains-text.test.ts` - Text search (case sensitivity, special chars, emoji)
- `response-time.test.ts` - Performance checks (boundary conditions, edge cases)
- `json-path.test.ts` - JSON path queries (nested paths, arrays, invalid JSON)
- `regex.test.ts` - Regex matching (flags, special chars, invalid patterns)

**Infrastructure:**
- `spec-loader.test.ts` - YAML/JSON parsing, validation
- `validation.test.ts` - Zod schemas, required fields

### Benefits

- **Fast**: Sub-second execution (no MCP server required)
- **Isolated**: Test harness logic independently
- **Coverage**: Edge cases, boundary conditions, error paths
- **Documentation**: Each test documents expected behavior

---

## Advanced Features

### Skip Tests

Skip a test by adding `skip: true`:

```yaml
name: "Test to skip"
skip: true
tool: "some_tool"
arguments: {}
assertions:
  - type: "success"
```

### Only Run Specific Tests

Run only tests with `only: true` (all others skipped):

```yaml
name: "Only run this"
only: true
tool: "some_tool"
arguments: {}
assertions:
  - type: "success"
```

---

## Using as a Library

### Installation

```bash
npm install @your-org/mcp-test-harness
```

### Implementation

1. **Implement IMCPTestClient:**

```typescript
import { IMCPTestClient, MCPToolResponse } from '@your-org/mcp-test-harness';

class MyMCPClient implements IMCPTestClient {
  async connect() { /* ... */ }
  async disconnect() { /* ... */ }
  async isServerAvailable() { /* ... */ }
  async callTool(name, args) { /* ... */ }
  getTextContent(response) { /* ... */ }
}
```

2. **Use TestRunner:**

```typescript
import { TestRunner } from '@your-org/mcp-test-harness';
import { loadTestSpec } from '@your-org/mcp-test-harness';

const client = new MyMCPClient();
const runner = new TestRunner(client);

await runner.connect();

const spec = await loadTestSpec('test.yaml');
const result = await runner.runTest(spec);

console.log(result.passed ? 'PASS' : 'FAIL');

await runner.disconnect();
```

3. **Run Multiple Tests:**

```typescript
const specs = [
  await loadTestSpec('test1.yaml'),
  await loadTestSpec('test2.yaml'),
];

const results = await runner.runTests(specs, 'http://localhost:8080');

console.log(`Passed: ${results.summary.passed}/${results.summary.total}`);
```

---

## License

MIT

---

**Built for Agents, by Agents** 🤖
