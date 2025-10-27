# Robust Code Transformation Architecture - Implementation Progress

**Status:** Phase 1 Complete (Foundation Services)
**Started:** 2025-10-27
**Last Updated:** 2025-10-27

## Overview

This document tracks the implementation of anchor-based code transformation and validation gates to replace brittle regex-based transformations in the auth scaffolding system.

**Goal:** Make code transformations more robust, agent-friendly, and maintainable while providing comprehensive validation and rollback capabilities.

---

## ✅ Phase 1: Foundation Services (COMPLETE)

### New Dependencies
- ✅ **@iarna/toml** - TOML parser for structured config updates (replaces regex)

### New Services Created

#### 1. `src/core/commands/shared/anchor-service.ts` (~350 lines)
**Purpose:** Anchor-based code transformation system

**Features:**
- Defines anchor blocks (comment markers for code insertion points)
- `insertAtAnchor()` - Insert content at marked locations
- `clearAnchor()` - Remove content (for rollback)
- `validateAnchors()` - Check required anchors exist
- `isAnchorEmpty()` - Check if ready for content insertion
- `insertAnchorBlock()` - Add anchors to new templates

**Anchor Blocks Defined:**
```typescript
AUTH_ANCHORS.IMPORTS     // <mcp-auth:imports>
AUTH_ANCHORS.MIDDLEWARE  // <mcp-auth:middleware>
AUTH_ANCHORS.CONFIG_VARS // <mcp-auth:vars>
```

#### 2. `src/core/commands/shared/toml-merger.ts` (~200 lines)
**Purpose:** Structured TOML configuration merging

**Features:**
- `mergeSection()` - Merge key-value pairs into TOML section
- `removeKeys()` - Remove specific keys from section
- `hasKeys()` - Check key existence
- `getValue()` - Get value from section
- Proper TOML parsing (no regex)
- Preserves structure, handles errors gracefully

#### 3. `src/core/commands/shared/validation-gate.ts` (~350 lines)
**Purpose:** Post-transformation validation with rollback

**Validation Checks:**
1. **type-check** - TypeScript compilation (`tsc --noEmit`)
2. **export-invariants** - Handler exports still intact
3. **anchors-present** - Required anchor blocks exist
4. **auth-imports** - Auth imports properly added
5. **auth-middleware** - Middleware code inserted
6. **config-vars** - Environment variables in config
7. **auth-files-exist** - Auth provider files created
8. **no-duplicate-imports** - No accidental duplication

**Methods:**
- `validate()` - Full validation suite
- `quickValidate()` - Skip type check (faster)
- `validateCritical()` - Only critical checks

**Rollback:** Automatically restores from backup if critical checks fail

---

## 🚧 Phase 2: Integration (PENDING)

### Template Updates
- [ ] Update `templates/cloudflare-remote/files/src/index.ts.hbs` with anchor blocks
- [ ] Update `templates/cloudflare-remote/files/wrangler.toml.hbs` with anchor comments
- [ ] Test template scaffolding generates anchors correctly

### Refactor entry-point-transformer.ts
- [ ] Replace regex-based import insertion with `AnchorService.insertAtAnchor()`
- [ ] Replace regex-based middleware insertion with `AnchorService.insertAtAnchor()`
- [ ] Add anchor validation before transformation
- [ ] Update removal functions to use `clearAnchor()`
- [ ] Maintain backward compatibility (detect if anchors missing, fall back gracefully)

**Example Pattern:**
```typescript
// OLD (brittle)
const importRegex = /^import\s+.*?;$/gm;
const lastImportIndex = findLastImport(content);

// NEW (robust)
const result = await anchorService.insertAtAnchor(
  filePath,
  AUTH_ANCHORS.IMPORTS,
  authImportsCode,
  { indent: '' }
);
```

### Refactor config-updater.ts
- [ ] Replace `updateWranglerToml()` to use `TomlMerger.mergeSection()`
- [ ] Keep `updateWranglerJsonc()` as-is (already robust)
- [ ] Replace `removeWranglerTomlAuthConfig()` to use `TomlMerger.removeKeys()`
- [ ] Add anchor comments to TOML (for agent clarity)

**Example Pattern:**
```typescript
// OLD (brittle regex)
result = content.replace(/\[vars\]\s*\n/, `[vars]\n${envVars}\n`);

// NEW (robust)
const tomlMerger = new TomlMerger();
await tomlMerger.mergeSection(wranglerPath, 'vars', {
  STYTCH_PROJECT_ID: '',
  STYTCH_SECRET: '',
  STYTCH_ENV: ''
});
```

### Integrate validation-gate.ts
- [ ] Update `auth-scaffolder.ts` to use `ValidationGate`
- [ ] Run validation after all transformations complete
- [ ] Provide detailed validation output to user
- [ ] Automatic rollback on validation failure

**Integration Point:**
```typescript
// In auth-scaffolder.ts after transformations:
const validationGate = new ValidationGate();
const validationResult = await validationGate.validate({
  cwd,
  backupDir,
  provider,
  rollbackOnFailure: true
});

if (!validationResult.passed) {
  throw new Error(`Validation failed:\n${validationResult.errors.join('\n')}`);
}
```

---

## 🧪 Phase 3: Testing (PENDING)

### Unit Tests Needed
- [ ] `test/unit/commands/shared/anchor-service.test.ts`
  - Insert at anchor
  - Check anchor empty
  - Validate anchors
  - Clear anchor
  - Error cases (missing anchors, force overwrite)

- [ ] `test/unit/commands/shared/toml-merger.test.ts`
  - Merge section (no overwrite)
  - Merge section (with overwrite)
  - Remove keys
  - Has keys
  - Get value
  - Error cases (malformed TOML)

- [ ] `test/unit/commands/shared/validation-gate.test.ts`
  - All checks pass
  - Critical check fails (rollback)
  - Non-critical check fails (continue)
  - Type check fails
  - Quick validate (skips type check)

### Integration Tests Needed
- [ ] Update `test/unit/commands/entry-point-transformer.test.ts`
  - Test anchor-based insertion
  - Test backward compatibility (no anchors)

- [ ] Update `test/unit/commands/config-updater.test.ts`
  - Test TOML merger integration
  - Test JSONC still works

- [ ] `test/integration/auth-transformation.e2e.ts`
  - Full workflow: scaffold → add auth → validate
  - Rollback on validation failure
  - Anchor blocks present after scaffolding

### E2E Tests Needed
- [ ] `test/integration/workers-auth.test.ts` (Miniflare)
  - Reject requests without Authorization
  - Validate tokens correctly
  - Attach user context to env

---

## 📊 Lines of Code

### Phase 1 (Complete)
- New services: ~900 lines
- New dependency: @iarna/toml

### Phase 2 (Estimate)
- Template updates: ~50 lines
- entry-point-transformer refactor: ~200 lines changed
- config-updater refactor: ~150 lines changed
- auth-scaffolder integration: ~50 lines added

### Phase 3 (Estimate)
- Unit tests: ~1000 lines
- Integration tests: ~500 lines
- E2E tests: ~300 lines

**Total Project:** ~3200 lines (Phase 1: 900 complete, Phase 2+3: 2300 pending)

---

## 🎯 Benefits (Once Complete)

### Robustness
- ✅ No more brittle regex (replaced with parsers)
- ✅ Anchor blocks provide reliable insertion points
- ✅ Validation catches issues before they become bugs

### Agent-Friendly
- ✅ Anchors are visible comment markers
- ✅ Clear error messages when transformation fails
- ✅ Structured operations (JSON-like semantics)

### Maintainability
- ✅ Easier to test (mock anchors vs mock regex matches)
- ✅ Easier to debug (validation tells you what's wrong)
- ✅ Easier to extend (add new anchors, add new validation checks)

### Safety
- ✅ Automatic rollback on failure
- ✅ Type checking ensures no breaking changes
- ✅ Idempotency checks prevent double-transformation

---

## 🚀 Next Steps

### To Continue Implementation:
1. Start new session (token limit reached in Phase 1)
2. Implement Phase 2: Template updates and transformer refactoring
3. Implement Phase 3: Comprehensive test suite
4. Test full workflow with real projects
5. Document upgrade path for existing users

### Quick Start for Phase 2:
```bash
# 1. Update template with anchors
code templates/cloudflare-remote/files/src/index.ts.hbs

# 2. Add anchor blocks at key locations:
# - After imports section
# - At start of fetch handler

# 3. Refactor entry-point-transformer.ts to use AnchorService

# 4. Test scaffolding new project
mcp-server-kit new server --name test-anchors --output /tmp --dev

# 5. Verify anchors present in scaffolded src/index.ts
```

---

## 📝 Notes

### Design Decisions
- **Backward Compatibility:** Keep regex fallback if anchors missing (gradual migration)
- **TOML Parser Choice:** @iarna/toml chosen for completeness and reliability
- **Validation Timing:** Post-transformation (detect issues before user sees broken project)
- **Rollback Strategy:** Use existing backup-restore.ts (proven, tested)

### Trade-offs
- **New Dependency:** @iarna/toml adds ~50kb, but eliminates entire class of bugs
- **Template Changes:** One-time update, but affects all new scaffolds
- **Performance:** Validation gate adds ~2-3s (tsc --noEmit), but catches issues early

### Related Issues
- Addresses external agent feedback about brittle regex
- Aligns with existing validation-service.ts patterns
- Builds on backup-restore.ts infrastructure

---

## 📚 References

- **Original Plan:** `/docs/robust-transformation-architecture.md` (from external agent evaluation)
- **Existing Patterns:**
  - `src/core/commands/shared/validation-service.ts` - Name/project validation
  - `src/core/commands/shared/backup-restore.ts` - Rollback infrastructure
  - `src/core/commands/shared/registration-service.ts` - Code insertion patterns
- **Testing Framework:** Vitest (existing), Miniflare (for Workers tests)

---

**Phase 1 Complete!** ✅
Ready for Phase 2 implementation in follow-up session.
