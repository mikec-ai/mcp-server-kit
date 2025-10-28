# MCP Server Kit - Agent Development Guide

**Extensible scaffolding tool and test harness for Model Context Protocol (MCP) servers.**
See [README.md](./README.md) for project overview.

---

## Critical Development Patterns

### Testing the Toolkit Itself (Not Production Usage)

**ALWAYS use --dev flag when testing mcp-server-kit scaffolding:**

```bash
# ✅ Correct - Testing toolkit functionality
mcp-server-kit new server --name test-project --dev

# ❌ Wrong - Will fail on npm install
mcp-server-kit new server --name test-project
```

**Why?** The `--dev` flag uses local paths instead of published npm package. Without it, projects reference `mcp-server-kit@^1.0.0` which may not exist or be outdated.

### Discovery Pattern for Unfamiliar CLIs

1. **Always run `--help` first**
2. Check CLAUDE.md for project-specific workflows
3. Look for development/testing flags (`--dev`, `--local`, etc.)
4. Read error messages carefully

### Scaffolding at Git Root

**Problem**: Agents often create projects in nested subdirectories.

**Solution**: Navigate to git root first:
```bash
cd $(git rev-parse --show-toplevel)
mcp-server-kit new server --name my-project --dev
```

---

## Essential Commands

### Development
```bash
npm run build          # Build dist/ for distribution
npm run test:unit      # Fast unit tests (~1s)
npm run type-check     # TypeScript validation
npm run test:all       # All unit tests (excludes e2e)
```

### Before Committing
```bash
npm run type-check && npm run test:unit
```
Both must pass with zero errors.

### Publishing Package
```bash
# 1. Bump version (creates commit and tag)
npm version patch  # Bug fixes (1.0.0 -> 1.0.1)
npm version minor  # New features (1.0.0 -> 1.1.0)
npm version major  # Breaking changes (1.0.0 -> 2.0.0)

# 2. Publish (runs build + tests automatically)
npm publish

# 3. Push changes and tags
git push && git push --tags
```

**Authentication**: Uses GitHub CLI token (`gh auth token`). Ensure scopes include `read:packages` and `write:packages`.

---

## Critical Gotchas

### Type Definitions
- **JsonPathAssertion**: `expected` field is optional
  - If omitted: Checks path exists (any value including null, false, 0, "")
  - If provided: Deep equality check with strict type matching (42 ≠ "42")
- **Template variables**: Must be `Record<string, string>` (convert booleans: `String(Boolean(value))`)

### Test Mocks
- Use helpers in `test/helpers/mocks.ts`
- `createMockMCPClient()` includes all required methods
- `createSuccessResponse()` and `createErrorResponse()` for tool responses

### Import Paths
- TypeScript uses `@/` alias for cleaner imports
- Always use `.js` extensions for imports: `from "./foo.js"`

### Common Fixes
```typescript
// ❌ Wrong: Boolean in template variables
const variables = { DEV_MODE: Boolean(options.dev) };

// ✅ Right: Convert to string
const variables = { DEV_MODE: String(Boolean(options.dev)) };
```

---

## Project Architecture

```
src/
├── core/
│   ├── cli/              # CLI entry point
│   ├── commands/         # Command implementations
│   ├── template-system/  # Template registry, processor
│   └── utils/            # Core utilities
├── harness/              # Portable test framework
│   ├── assertions/       # Test assertions
│   ├── reporters/        # Result reporters
│   └── validation/       # Zod schemas
├── services/             # Reusable services
└── types/                # Shared type definitions

test/
├── unit/                 # Unit tests (*.test.ts) ~1s
└── integration/          # E2E tests (*.e2e.ts) ~5min

templates/                # Project scaffolding templates
```

**Key Files**:
- `package.json` - Scripts, dependencies, metadata
- `tsconfig.json` - TypeScript config (strict mode, path aliases)
- `vitest.config.ts` - Test config (excludes *.e2e.ts)
- `src/harness/README.md` - Test harness API docs

---

## Test Harness Quick Reference

### YAML Test Specs

Located in `test/integration/specs/*.yaml`

**Tool Test**:
```yaml
name: "weather - Get current weather"
tool: "weather"
arguments:
  location: "San Francisco"

assertions:
  - type: "success"
  - type: "json_path"
    path: "$.temperature"
  - type: "json_path"
    path: "$.location"
    expected: "San Francisco"
```

**Key Assertions**:
- `success` - Tool succeeded
- `error` - Tool failed (with optional messageContains)
- `json_path` - Check JSON structure (expected is optional)
- `contains_text` - Text includes substring
- `response_time_ms` - Performance check

**json_path Notes**:
- Omit `expected` to check path exists
- Provide `expected` for value comparison (strict type matching)
- Supports nested paths: `$.data.user.email`
- Supports arrays: `$.items[0].name`

---

## Agent Workflow Tips

### Adding Features
1. Use TodoWrite to track steps
2. Write tests first (TDD)
3. Run tests immediately after writing (don't batch)
4. Type check frequently
5. All tests must pass before committing

### For Agents Working on MCP Server Kit
- This project is optimized for AI agent development
- CLI handles boilerplate (file creation, registration, imports)
- `mcp-server-kit validate` catches common mistakes
- Template projects include example tools showing patterns
- Declarative YAML test specs (no coding required)
- Strict TypeScript prevents runtime errors

### Common Agent Mistakes
- ❌ Skipping --help on unfamiliar commands
- ❌ Not using --dev when testing toolkit
- ❌ Assuming defaults without verification
- ❌ Running npm install before reading errors

---

## Additional Resources

- **Test Harness Docs**: [src/harness/README.md](./src/harness/README.md)
- **CLI Skills Guide**: [.claude/skills/mcp-server-kit-cli/SKILL.md](./.claude/skills/mcp-server-kit-cli/SKILL.md)
- **Package Sharing**: [PACKAGE-SHARING-GUIDE.md](./PACKAGE-SHARING-GUIDE.md)
