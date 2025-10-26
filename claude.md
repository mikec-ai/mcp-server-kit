# MCP Server Kit - Agent Development Guide

**Extensible scaffolding tool and test harness for Model Context Protocol (MCP) servers.**
See [README.md](./README.md) for full project overview and features.

---

## Development Workflow for Agents

### Testing the mcp-server-kit Toolkit Itself

**CRITICAL:** When testing mcp-server-kit's scaffolding capabilities (not using it to build production servers):

#### Always Use --dev Flag

```bash
# ✅ Correct - Testing toolkit functionality
mcp-server-kit new server --name test-project --dev

# ❌ Wrong - Will fail on npm install
mcp-server-kit new server --name test-project
```

**Why?**
- The `--dev` flag uses local mcp-server-kit paths instead of the published npm package
- Without it, scaffolded projects reference `mcp-server-kit@^1.0.0` in devDependencies
- This package doesn't exist on npm (or may be outdated), causing `npm install` to fail
- The `--dev` flag sets `DEV_MODE=true` and `MCP_KIT_PATH` in template variables

#### Discovery Pattern for Agents

As an AI agent, follow this discovery pattern when using unfamiliar CLI tools:

1. **Always run `--help` first** on unfamiliar commands
   ```bash
   mcp-server-kit --help
   mcp-server-kit new server --help
   mcp-server-kit add tool --help
   ```

2. **Check CLAUDE.md** (this file) for project-specific workflows

3. **Look for development/testing flags** like `--dev`, `--local`, `--test`

4. **Read error messages carefully** - they often contain solutions

**Example Discovery Flow:**
```bash
# 1. Exploring a new command
mcp-server-kit new server --help

# Output shows:
#   --dev    Development mode: use local mcp-server-kit paths
#            instead of published package

# 2. Use the discovered flag
mcp-server-kit new server --name my-test --dev
```

### Common Agent Mistakes to Avoid

❌ **Skipping --help**: Jumping straight to using commands without checking available options
❌ **Ignoring dev flags**: Not using `--dev` when testing toolkit itself
❌ **Assuming defaults**: Not verifying default behaviors match your use case
❌ **Batch execution**: Running `npm install` before reading error messages

✅ **Best Practice**: Help → Test → Read errors → Adjust → Retry

---

## Recent Features & Improvements

### 1. Auto-run cf-typegen After npm install

**What Changed**: cf-typegen now runs automatically after `npm install` completes.

**Impact**:
- ✅ Type checking works immediately after project creation
- ✅ No manual `npm run cf-typegen` step required
- ✅ worker-configuration.d.ts generated automatically

**How It Works**:
- Template system now supports `postInstall` commands in template.config.json
- Cloudflare template configured with `"postInstall": ["npm run cf-typegen"]`
- Console output shows: `📦 Running 1 post-install command(s)...`

**For Agents**: Remove `npm run cf-typegen` from workflow documentation - it happens automatically.

### 2. --output Flag for Project Directory

**What Changed**: `new server` command now accepts `--output <path>` to specify where to create projects.

**Syntax**:
```bash
mcp-server-kit new server --name my-server --output /path/to/directory
```

**Use Cases**:
- Creating projects in /tmp for testing
- Organizing projects in custom directories
- CI/CD pipelines with specific directory structures

**Examples**:
```bash
# Create in /tmp for testing
mcp-server-kit new server --name test-project --output /tmp --dev

# Create in custom projects directory
mcp-server-kit new server --name my-api --output ~/projects/mcp-servers
```

**Next Steps Output**: Correctly shows path: `cd /tmp/test-project`

### 3. list prompts Command

**What Changed**: New command to list all prompts with status information.

**Syntax**:
```bash
mcp-server-kit list prompts [--json] [--filter <status>]
```

**Shows**:
- Registration status (registered vs unregistered)
- Unit test coverage
- Integration test coverage
- File locations
- Descriptions

**Filters**:
- `--filter registered` - Only registered prompts
- `--filter unregistered` - Only unregistered prompts
- `--filter tested` - Prompts with tests
- `--filter untested` - Prompts without tests

**Example Output**:
```
Found 2 prompts:

NAME            | REG | UNIT | INT | FILE
================================================================
code-reviewer   |  ✓  |  ✓  |  ✓  | src/prompts/code-reviewer.ts
                  Review code quality
test-generator  |  ✓  |  ✓  |  ✓  | src/prompts/test-generator.ts
                  Generate tests

Summary:
  Registered:       2/2
  Unit tests:       2/2
  Integration tests: 2/2
```

### 4. list resources Command

**What Changed**: New command to list all resources with status information.

**Syntax**:
```bash
mcp-server-kit list resources [--json] [--filter <status>]
```

**Shows**: Same information as `list prompts` but for resources

**Useful For**:
- Checking if resources are properly registered
- Verifying test coverage
- Project health checks
- CI/CD validation

### 5. Registration Detection Fix

**What Changed**: Fixed bug in `list tools` where hyphenated tool names showed as unregistered.

**The Bug**:
- Previous: Used `toSnakeCase()` conversion
- Tools like `matrix-operations` were converted to `matrix_operations`
- Didn't match actual registrations which use kebab-case

**The Fix**:
- Now uses `toKebabCase()` conversion
- `MatrixOperations` → `matrix-operations` (correct)
- Hyphenated tools now show ✓ in registration column

**Affected Tools**: Any tool with hyphens (e.g., `api-client`, `data-processor`, `weather-api`)

---

## Development Standards

### Type Safety
- **Strict TypeScript**: ES2022 modules, strict mode enabled
- **Never bypass types**: Avoid `any`, use proper type definitions
- **Always type-check**: Run `npm run type-check` before commits
- **Module resolution**: Using "bundler" strategy with path aliases

### Code Style
- **No emojis** unless explicitly requested by user
- **Import extensions**: Always use `.js` for TypeScript imports (e.g., `from "./foo.js"`)
- **Path aliases**: `@/` maps to `src/` (configured in tsconfig.json)

---

## Testing Strategy

### Test Types
```
Unit tests (*.test.ts)    - Fast (~1s), isolated, run frequently
E2E tests (*.e2e.ts)      - Slow (~5min), end-to-end, run separately
```

### Test-Driven Development
1. Write test file → Run test → Fix issues → Iterate
2. Run tests **immediately** after writing (don't batch)
3. All unit tests must pass before committing
4. E2E tests validate full template scaffolding workflow

### Test Commands
```bash
npm run test:unit         # Fast unit tests (~1s)
npm run test:e2e          # End-to-end template tests (~5min)
npm run test:all          # All unit tests (excludes e2e)
npm run test:coverage     # Unit tests with coverage
npm run type-check        # TypeScript validation
```

**Critical**: `test:all` runs only unit tests (vitest excludes `*.e2e.ts`). E2E tests run separately with `tsx`.

---

## Project Architecture

```
src/
├── core/
│   ├── cli/              # CLI entry point
│   ├── commands/         # Command implementations (new, add-tool, validate)
│   ├── template-system/  # Template registry, processor, schemas
│   └── utils/            # Core utilities
├── harness/              # Portable test framework
│   ├── assertions/       # Test assertion implementations
│   ├── reporters/        # Test result reporters
│   ├── types/            # Test spec type definitions
│   └── validation/       # Zod schemas for test validation
├── services/             # Reusable services
├── types/                # Shared type definitions
└── utils/                # Utility helpers (JSON schema, validation, examples)

test/
├── unit/                 # Unit tests (*.test.ts)
├── integration/          # E2E tests (*.e2e.ts)
├── fixtures/             # Test data and schemas
└── helpers/              # Test mocks and utilities

templates/                # Project scaffolding templates
```

---

## Critical Patterns & Gotchas

### Type Definitions
- **JsonPathAssertion**: `expected` field is optional (checks path existence if omitted)
- **Template variables**: Must be `Record<string, string>` (convert booleans: `String(Boolean(value))`)
- **ScaffoldOptions**: Variables must be strings, not booleans

### Test Mocks
- Use helpers in `test/helpers/mocks.ts`
- `createMockMCPClient()` includes all required methods (`connect`, `disconnect`, `callTool`, `listTools`, `getServerInfo`)
- `createSuccessResponse()` and `createErrorResponse()` for tool responses

### Path Resolution
- TypeScript uses `@/` alias for cleaner imports
- Path alias defined in both `tsconfig.json` and `vitest.config.ts`
- Always use project-relative paths in template files

### Common Fixes
```typescript
// ❌ Wrong: Boolean in template variables
const variables = { DEV_MODE: Boolean(options.dev) };

// ✅ Right: Convert to string
const variables = { DEV_MODE: String(Boolean(options.dev)) };

// ❌ Wrong: Accessing optional property without type guard
const value = options.description || options.name; // Type error if description not in type

// ✅ Right: Use type assertion or explicit typing
const value = (options as { description?: string }).description || options.name;
```

---

## Development Workflow

### Adding Features
1. **Plan**: Use TodoWrite tool to track steps
2. **Test First**: Write unit tests before implementation (TDD)
3. **Run Tests**: `npm run test:unit` after each change
4. **Type Check**: `npm run type-check` to catch type errors
5. **Validate**: Ensure all 328 tests pass

### Fixing Type Errors
1. Read the error carefully (TypeScript is precise)
2. Fix root cause, not symptoms (avoid type assertions unless necessary)
3. Run `npm run type-check` to verify all fixes
4. Run `npm run test:unit` to ensure nothing broke

### Before Committing
```bash
npm run type-check && npm run test:unit
```
Both must pass with zero errors.

---

## Key Files Reference

- **package.json**: Scripts, dependencies, project metadata
- **tsconfig.json**: TypeScript config (strict mode, path aliases, ES2022)
- **vitest.config.ts**: Test config (excludes `*.e2e.ts` files)
- **tsup.config.ts**: Build config for distribution
- **src/harness/README.md**: Test harness documentation
- **test/helpers/mocks.ts**: Reusable test mocks

---

## Template System

### Template Structure
Each template in `templates/` contains:
- `template.json` - Template metadata and configuration
- `files/` - Template files with Handlebars variable substitution
- `hooks/` (optional) - Pre/post-scaffold hooks

### Variable Substitution
- All variables must be strings (not booleans or numbers)
- Variables use `{{VARIABLE_NAME}}` syntax in template files
- Required variables: `PROJECT_NAME`, `MCP_SERVER_NAME`, `PORT`

---

## Documentation Best Practices

### Principles
- **Modular and Focused**: One topic per file, single responsibility
- **Avoid Specific Numbers**: Don't reference test counts, line numbers, or file counts that change frequently
- **Use References**: Link between docs instead of duplicating content
- **Keep Lightweight**: Prefer concise summaries with links to detailed docs

### Documentation Structure
```
README.md                    - Project overview, links to detailed docs
.claude/skills/              - Agent-focused CLI and testing guidance
src/harness/README.md        - Detailed test harness API
claude.md                    - Agent development guide (this file)
```

### Examples
```markdown
❌ Wrong: "The project has 328 unit tests covering all utilities"
✅ Right: "Comprehensive unit test coverage for all utilities"

❌ Wrong: "The harness includes 88 tests that run in ~100ms"
✅ Right: "The harness includes comprehensive test coverage with sub-second execution"

❌ Wrong: Copying entire CLI reference into README
✅ Right: "See [CLI Guide](./.claude/skills/mcp-server-kit-cli/SKILL.md) for complete command documentation"
```

### When to Update
- README changed → Check if skills need updates
- New feature added → Add to relevant skill guide
- Numbers changed → Verify no hard-coded counts exist

---

## Notes for AI Agents

This project is optimized for AI agent development:
- **Auto-scaffolding**: CLI handles boilerplate (file creation, registration, imports)
- **Validation**: `mcp-server-kit validate` catches common mistakes
- **Examples**: Template projects include example tools showing patterns
- **Testing**: Declarative YAML test specs (no coding required)
- **Type Safety**: Strict TypeScript prevents runtime errors

See agent workflow in README.md for step-by-step guide.
