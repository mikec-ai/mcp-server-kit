# Testing the mcp-server-kit Toolkit

Guide for testing the toolkit itself (not generated MCP servers).

---

## When to Use --dev Flag

### ✅ Always Use --dev When:

1. **Testing toolkit scaffolding**
   ```bash
   mcp-server-kit new server --name test-static-resource --dev
   ```

2. **Developing new templates**
   ```bash
   mcp-server-kit new server --name test-template --template my-template --dev
   ```

3. **Testing CLI commands**
   ```bash
   mcp-server-kit new server --name test-commands --dev
   cd test-commands
   npm run tools:add tool test
   ```

4. **Running integration tests**
   ```bash
   npm run test:templates  # Uses --dev internally
   ```

### ❌ Never Use --dev When:

1. **Building production MCP servers**
2. **Following user documentation/tutorials**
3. **Scaffolding servers for deployment**

---

## Testing Workflow

### 1. Test Template Scaffolding

**Command**:
```bash
npm run test:templates
```

**What it does**:
1. Scaffolds project with `--dev` flag
2. Runs `npm install`
3. Runs `npm run cf-typegen`
4. Runs `npm run type-check`
5. Runs `npm run test:unit`
6. Runs `npm run validate`

**Expected result**: All 5 steps pass

**Location**: `test/integration/template-quality.e2e.ts`

### 2. Test CLI Commands

**Manual testing pattern**:
```bash
# 1. Create test project
mcp-server-kit new server --name cli-test --dev

# 2. Navigate
cd cli-test

# 3. Install
npm install
npm run cf-typegen

# 4. Test add commands
npm run tools:add tool test-tool
npm run tools:add prompt test-prompt
npm run tools:add resource test-resource --static
npm run tools:add resource test-dynamic --dynamic

# 5. Verify
npm run type-check
npm run test:unit
npm run validate

# 6. Clean up
cd ..
rm -rf cli-test
```

### 3. Test Unit Tests

**Command**:
```bash
npm run test:unit
```

**What it tests**:
- Command logic
- Template processing
- Test harness
- Utilities
- Validators

**Expected**: All 539+ tests pass

### 4. Test Type Checking

**Command**:
```bash
npm run type-check
```

**What it checks**:
- No TypeScript errors in src/
- No TypeScript errors in test/
- All imports resolve correctly

---

## Common Testing Scenarios

### Scenario 1: Test New add Command

**Goal**: Verify a new `add` command works

**Steps**:
```bash
# 1. Create test project
mcp-server-kit new server --name test-add-cmd --dev
cd test-add-cmd
npm install
npm run cf-typegen

# 2. Test the add command
npm run tools:add <type> <name> [flags]

# 3. Verify files generated
ls -la src/<type>s/
ls -la test/unit/<type>s/
ls -la test/integration/specs/

# 4. Test functionality
npm run type-check
npm run test:unit
npm run validate

# 5. Clean up
cd ..
rm -rf test-add-cmd
```

### Scenario 2: Test Template Changes

**Goal**: Verify template modifications work

**Steps**:
```bash
# 1. Modify template in templates/cloudflare-remote/

# 2. Test scaffolding
mcp-server-kit new server --name test-template --dev
cd test-template
npm install
npm run cf-typegen

# 3. Verify changes
cat <modified-file>

# 4. Run tests
npm run type-check
npm run test:unit

# 5. Clean up
cd ..
rm -rf test-template
```

### Scenario 3: Test Integration Tests

**Goal**: Verify integration test harness works

**Steps**:
```bash
# 1. Create test project
mcp-server-kit new server --name test-integration --dev
cd test-integration
npm install
npm run cf-typegen

# 2. Add component with integration test
npm run tools:add tool test-integration

# 3. Start dev server
npm run dev  # In separate terminal

# 4. Run integration tests
npm run integration:run

# 5. Check results
# Expected: Integration test passes

# 6. Clean up
npm run integration:run -- --auto-start  # Auto-starts server
```

---

## Debugging Failed Tests

### Template Quality Test Failures

**Error**: "Type check failed"
```bash
# Check generated files
cd /tmp/mcp-template-test-*/test-*
npm run type-check

# Look for specific errors
cat <error-file>
```

**Error**: "Unit tests failed"
```bash
# Run tests manually
cd /tmp/mcp-template-test-*/test-*
npm run test:unit

# Check test output
```

**Error**: "Validation failed"
```bash
# Run validation manually
cd /tmp/mcp-template-test-*/test-*
npm run validate

# Check configuration
cat wrangler.jsonc
```

### Integration Test Failures

**Error**: "Cannot find package 'mcp-server-kit'"

**Cause**: Forgot `--dev` flag

**Fix**:
```bash
# Verify --dev is used in:
- test/integration/template-quality.e2e.ts (line ~76)
- Manual test commands

# Should see: --dev flag in scaffold command
```

**Error**: "Dev server not responding"

**Cause**: Server not started

**Fix**:
```bash
# Option 1: Start manually
npm run dev  # In separate terminal
npm run integration:run

# Option 2: Auto-start
npm run integration:run -- --auto-start
```

### Type Check Failures

**Error**: "Cannot find type definition file for './worker-configuration.d.ts'"

**Cause**: Forgot to run `cf-typegen`

**Fix**:
```bash
npm run cf-typegen
npm run type-check
```

---

## Test Environment Setup

### Prerequisites

```bash
# 1. Node.js (v18+)
node --version

# 2. npm dependencies
npm install

# 3. Build toolkit
npm run build

# 4. Verify CLI works
./bin/mcp-server-kit.js --version
```

### Clean Test Environment

```bash
# Remove old test projects
rm -rf /tmp/test-* /tmp/mcp-template-test-*

# Clear npm cache (if needed)
npm cache clean --force

# Rebuild toolkit
npm run build
```

---

## Continuous Testing

### Before Commits

```bash
# 1. Type check
npm run type-check

# 2. Unit tests
npm run test:unit

# 3. Template quality (long-running)
npm run test:templates
```

### After Template Changes

```bash
# Quick validation
mcp-server-kit new server --name test-quick --dev --no-install
cd test-quick
npm install
npm run cf-typegen
npm run type-check
cd ..
rm -rf test-quick

# Full validation
npm run test:templates
```

### After CLI Changes

```bash
# 1. Rebuild
npm run build

# 2. Test commands
./bin/mcp-server-kit.js --help
./bin/mcp-server-kit.js new server --help
./bin/mcp-server-kit.js add tool --help

# 3. Scaffold test
mcp-server-kit new server --name cli-change-test --dev
cd cli-change-test
npm install
npm run validate
cd ..
rm -rf cli-change-test
```

---

## Common Pitfalls When Testing

### ❌ Forgetting --dev Flag
```bash
# Wrong (will fail on npm install)
mcp-server-kit new server --name test-project

# Right
mcp-server-kit new server --name test-project --dev
```

### ❌ Not Running cf-typegen
```bash
# After scaffolding, always run:
npm run cf-typegen

# Before:
npm run type-check
```

### ❌ Testing Without Rebuilding
```bash
# After changing CLI code:
npm run build  # IMPORTANT!
mcp-server-kit new server --name test --dev
```

### ❌ Using Old Test Projects
```bash
# Always clean up and recreate:
rm -rf old-test-project
mcp-server-kit new server --name fresh-test --dev
```

---

## Test Coverage

### What's Tested

✅ **Command scaffolding** (template-quality.e2e.ts)
✅ **Type safety** (npm run type-check)
✅ **Unit tests** (539+ tests in test/unit/)
✅ **Template processing** (processor.test.ts)
✅ **Validation logic** (validate.test.ts)

### What Requires Manual Testing

⚠️ **End-to-end workflows** (create → develop → deploy)
⚠️ **Integration with Cloudflare** (wrangler dev, deploy)
⚠️ **Real MCP client connections** (Claude Desktop, etc.)
⚠️ **Template customization** (user modifications)

---

## Quick Reference

```bash
# Test scaffolding
npm run test:templates

# Test units
npm run test:unit

# Test types
npm run type-check

# Test everything
npm run type-check && npm run test:unit

# Manual quick test
mcp-server-kit new server --name quick-test --dev && \
cd quick-test && \
npm install && \
npm run cf-typegen && \
npm run type-check && \
npm run test:unit && \
cd .. && \
rm -rf quick-test
```
