# Testing Guide

Guide to testing MCP servers with the built-in test harness.

---

## Overview

The toolkit includes a portable, declarative test harness for integration testing. Write tests in YAML, not code.

---

## Quick Examples

### Tool Test

```yaml
type: "tool"
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

### Prompt Test

```yaml
type: "prompt"
name: "Test code reviewer prompt"
prompt: "code-reviewer"
arguments:
  code: "function test() { return 42; }"
  focus: "readability"

assertions:
  - type: "success"
  - type: "contains_text"
    text: "function"
```

### Resource Test

```yaml
type: "resource"
name: "Test snippet resource"
uri: "snippet://test-id-123"

assertions:
  - type: "success"
  - type: "json_path"
    path: "$.contents[0].mimeType"
    expected: "application/json"
```

---

## Test Types

### Unit Tests

Fast, isolated tests for tool logic. Use Vitest.

**Location:** `test/unit/tools/*.test.ts`

**Example:**

```typescript
import { describe, it, expect } from 'vitest';
import { myTool } from '../../../src/tools/myTool';

describe('myTool', () => {
  it('should handle valid input', async () => {
    const result = await myTool({ input: 'test' });
    expect(result).toBeDefined();
  });
});
```

**Run:**
```bash
npm run test:unit
```

### Integration Tests

End-to-end tests using declarative YAML specs.

**Location:** `test/integration/specs/*.yaml`

**Run:**
```bash
npm run integration:run

# Or run specific test file
npm run integration:run test/integration/specs/echo.yaml

# List all available integration tests
npm run integration:list
```

---

## Test Harness

For detailed information about the test harness, see:

**[Test Harness Documentation →](../src/harness/README.md)**

Topics covered:
- Test specification format
- Assertion types (success, error, contains_text, json_path, regex, etc.)
- JSON output format
- Using as a library
- IMCPTestClient interface

---

## Testing Workflow

### For AI Agents

1. **Add feature:** CLI auto-generates test files
   ```bash
   mcp-server-kit add tool weather --description "Get weather data"
   ```
2. **Implement logic:** Write implementation in `src/tools/weather.ts`
3. **Update integration test:** Modify `test/integration/specs/tools/weather.yaml` with realistic test cases
4. **Run unit tests:** `npm run test:unit`
5. **Run integration tests:** `npm run integration:run`
6. **Validate:** `mcp-server-kit validate`
7. **Type check:** `npm run type-check`

### For Developers

1. **Write unit test first** (TDD approach)
2. **Implement tool/prompt/resource**
3. **Add integration test YAML** with realistic scenarios
4. **Run all tests:** `npm run test:unit && npm run integration:run`
5. **Fix any failures** (see Debugging section below)
6. **Commit when green**

### Debugging Test Failures

**Unit test fails:**
```bash
# Run in watch mode for faster iteration
npm run test:unit:watch

# Run specific test file
npx vitest test/unit/tools/weather.test.ts
```

**Integration test fails:**
```bash
# Run specific integration test
npm run integration:run test/integration/specs/tools/weather.yaml

# Check validation first
mcp-server-kit validate

# Check type errors
npm run type-check
```

**Common issues:**
- Tool not registered → Run `mcp-server-kit validate --fix`
- Type errors → Run `npm run type-check` and fix TypeScript issues
- Test YAML invalid → Check YAML syntax and assertion types

---

## Assertion Types

The test harness supports multiple assertion types. See the full reference in the [Test Harness Documentation](../src/harness/README.md#assertion-types).

**Quick reference:**
- `success` - Verifies no error
- `error` - Verifies error occurred
- `contains_text` - Text search
- `not_contains_text` - Negative text search
- `response_time_ms` - Performance check
- `json_path` - JSONPath queries (e.g., `$.data.id`)
- `regex_match` - Regex pattern matching

---

## Using Test Harness Independently

The test harness can be used in any MCP project:

```typescript
import { TestRunner, loadTestSpec } from 'mcp-server-kit/harness';

// 1. Implement IMCPTestClient interface
class MyMCPClient implements IMCPTestClient {
  async connect() { /* ... */ }
  async disconnect() { /* ... */ }
  async callTool(name, args) { /* ... */ }
  async listTools() { /* ... */ }
  async getServerInfo() { /* ... */ }
}

// 2. Create runner and load tests
const client = new MyMCPClient();
const runner = new TestRunner(client);
const spec = await loadTestSpec('test.yaml');

// 3. Run tests
await runner.connect();
const result = await runner.runTest(spec);
console.log(result.passed ? 'PASS' : 'FAIL');
await runner.disconnect();
```

For complete API documentation, see [Test Harness Documentation](../src/harness/README.md).

---

## Test Organization

### Recommended Structure

```
test/
├── unit/                      # Unit tests (fast)
│   ├── tools/
│   │   ├── echo.test.ts
│   │   └── weather.test.ts
│   ├── prompts/
│   │   └── code-reviewer.test.ts
│   └── resources/
│       └── snippet.test.ts
│
├── integration/               # Integration tests (slower)
│   ├── cli.ts                # Test client
│   └── specs/
│       ├── tools/
│       │   ├── echo.yaml
│       │   └── weather.yaml
│       ├── prompts/
│       │   └── code-reviewer.yaml
│       └── resources/
│           └── snippet.yaml
│
└── utils/                     # Test utilities
    └── test-utils.ts
```

### Naming Conventions

- Unit tests: `<name>.test.ts`
- Integration specs: `<name>.yaml`
- Organize by type: `tools/`, `prompts/`, `resources/`
- Test utilities: `*-utils.ts` or `helpers.ts`

---

## Best Practices

### Unit Tests

- Test one thing per test
- Use descriptive test names
- Mock external dependencies
- Keep tests fast (< 100ms)

### Integration Tests

- Test realistic scenarios
- Use meaningful test names
- Keep assertions focused
- Document expected behavior in descriptions

### Performance

- Unit tests should be sub-second
- Integration tests should be under 5 seconds per test
- Use `response_time_ms` assertions to catch regressions

---

## Continuous Integration

### Running in CI

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run type-check
      - run: npm run test:unit
      - run: npm run integration:run
```

### Test Scripts

```bash
# Run all unit tests
npm run test:unit

# Run unit tests in watch mode
npm run test:unit:watch

# Run integration tests
npm run integration:run

# List available integration tests
npm run integration:list

# Run specific integration test
npm run integration:run test/integration/specs/tools/echo.yaml

# Run all tests (unit only - fast)
npm run test:all

# Run with coverage
npm run test:coverage

# Type checking
npm run type-check

# Validation
mcp-server-kit validate
```

---

## See Also

- **[Test Harness Documentation](../src/harness/README.md)** - Detailed assertion types and API
- [CLI Reference](./CLI.md) - Command-line usage
- [Main README](../README.md) - Project overview
