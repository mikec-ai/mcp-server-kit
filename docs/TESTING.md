# Testing Guide

Guide to testing MCP servers with the built-in test harness.

---

## Overview

The toolkit includes a portable, declarative test harness for integration testing. Write tests in YAML, not code.

---

## Quick Example

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
npm run test:integration
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

1. **Add tool:** CLI auto-generates test files
2. **Implement logic:** Write tool implementation
3. **Update tests:** Modify generated tests for your logic
4. **Run unit tests:** `npm run test:unit`
5. **Run integration tests:** `npm run test:integration`
6. **Validate:** `mcp-server-kit validate`

### For Developers

1. **Write unit test first** (TDD approach)
2. **Implement tool**
3. **Add integration test YAML**
4. **Run all tests**
5. **Commit when green**

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
│   └── tools/
│       ├── echo.test.ts
│       └── weather.test.ts
│
├── integration/               # Integration tests (slower)
│   ├── cli.ts                # Test client
│   └── specs/
│       ├── echo.yaml
│       └── weather.yaml
│
└── utils/                     # Test utilities
    └── test-utils.ts
```

### Naming Conventions

- Unit tests: `<tool-name>.test.ts`
- Integration specs: `<tool-name>.yaml`
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
      - run: npm run test:unit
      - run: npm run test:integration
```

### Test Scripts

```bash
# Run all unit tests
npm run test:unit

# Run unit tests in watch mode
npm run test:unit:watch

# Run integration tests
npm run test:integration

# Run all tests (unit only - fast)
npm run test:all

# Run with coverage
npm run test:coverage
```

---

## See Also

- **[Test Harness Documentation](../src/harness/README.md)** - Detailed assertion types and API
- [CLI Reference](./CLI.md) - Command-line usage
- [Main README](../README.md) - Project overview
