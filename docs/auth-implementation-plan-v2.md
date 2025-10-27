# Authentication Implementation Plan V2 - `add auth` Command Approach

**Version**: 2.0
**Date**: October 27, 2025
**Status**: Design Phase - Revised Approach
**Previous Version**: [V1 - Template Approach](./auth-implementation-plan.md)
**Analysis**: [Add Auth Command Analysis](./auth-add-command-analysis.md)
**Research**: [Research Findings](./auth-research-findings.md)

---

## Overview

This plan implements authentication support via an `add auth` command that layers authentication onto existing MCP servers, rather than requiring separate auth-enabled templates.

### Key Decision: `add auth` Command

**Chosen Approach**: Add auth to existing projects via CLI command
**Rationale**: Better UX, single implementation, cross-platform, follows CLI patterns

```bash
# Create MCP server (no auth)
mcp-server-kit new server --name my-app

# Test it works
cd my-app
npm install
npm run dev

# Add authentication when ready
mcp-server-kit add auth --provider stytch
```

### Goals
1. Single auth implementation (no template explosion)
2. Progressive workflow (build → test → secure)
3. Cross-platform support (Cloudflare, Vercel, future)
4. Follows existing CLI patterns (`add tool`, `add resource`)
5. Safe file modifications with rollback

### Non-Goals
- Building custom authorization UI
- Supporting OAuth 1.0 or proprietary auth
- Replacing platform-specific auth solutions
- Managing user databases directly

---

## Architecture

### Command Flow

```
User runs: mcp-server-kit add auth --provider stytch
                     ↓
        ┌────────────────────────────┐
        │  1. Pre-flight Validation  │
        │  - Check MCP project       │
        │  - Detect platform         │
        │  - Check for conflicts     │
        └────────────┬───────────────┘
                     ↓
        ┌────────────────────────────┐
        │  2. Create Backup          │
        │  - Copy src/ to .backup/   │
        └────────────┬───────────────┘
                     ↓
        ┌────────────────────────────┐
        │  3. Add Dependencies       │
        │  - OAuth provider library  │
        │  - Provider SDK (Stytch)   │
        └────────────┬───────────────┘
                     ↓
        ┌────────────────────────────┐
        │  4. Create Auth Files      │
        │  - src/auth/types.ts       │
        │  - src/auth/config.ts      │
        │  - src/auth/providers/*.ts │
        └────────────┬───────────────┘
                     ↓
        ┌────────────────────────────┐
        │  5. Transform Entry Point  │
        │  - Extract server → server.ts
        │  - Wrap index.ts with OAuth│
        └────────────┬───────────────┘
                     ↓
        ┌────────────────────────────┐
        │  6. Update Configuration   │
        │  - wrangler.toml (KV)      │
        │  - .env.example            │
        │  - .gitignore              │
        └────────────┬───────────────┘
                     ↓
        ┌────────────────────────────┐
        │  7. Update Documentation   │
        │  - README.md (auth section)│
        └────────────┬───────────────┘
                     ↓
        ┌────────────────────────────┐
        │  8. Success / Rollback     │
        │  - Delete backup on success│
        │  - Restore on failure      │
        └────────────────────────────┘
```

### File Structure After `add auth`

```
my-app/
├── src/
│   ├── index.ts              # OAuth wrapper (TRANSFORMED)
│   ├── server.ts             # MCP server (EXTRACTED)
│   ├── auth/                 # NEW
│   │   ├── types.ts          # Auth interfaces
│   │   ├── config.ts         # Provider configuration
│   │   └── providers/
│   │       └── stytch.ts     # Stytch implementation
│   └── tools/                # UNCHANGED
│       ├── health.ts
│       └── echo.ts
├── wrangler.toml             # MODIFIED (+ KV namespace)
├── package.json              # MODIFIED (+ auth deps)
├── .env.example              # NEW
├── .gitignore                # MODIFIED (+ .env)
└── README.md                 # MODIFIED (+ auth docs)
```

---

## Implementation Phases

### Phase 1: Core `add auth` Command (Cloudflare + Stytch)

**Duration**: 2 weeks
**Goal**: Working `add auth` for Cloudflare Workers with Stytch

#### 1.1 Create Command Structure

**File**: `src/core/commands/add-auth.ts`

```typescript
/**
 * Add Auth Command
 *
 * Adds authentication to an existing MCP server project.
 */

import { Command } from "commander";
import { AuthScaffolder } from "./shared/auth-scaffolder.js";
import type { AddAuthOptions, AddAuthResult } from "../../types/command-results.js";

export function createAddAuthCommand(): Command {
  const command = new Command("auth")
    .description("Add authentication to your MCP server")
    .requiredOption("--provider <name>", "Auth provider: stytch|auth0|workos")
    .option("--platform <platform>", "Platform override: cloudflare|vercel")
    .option("--dry-run", "Show what would change without modifying files")
    .option("--no-backup", "Skip creating backup before modifications")
    .option("--force", "Proceed even with warnings")
    .option("--json", "Output result as JSON")
    .action(async (options: AddAuthOptions) => {
      try {
        const cwd = process.cwd();
        const scaffolder = new AuthScaffolder();

        // Add authentication
        const result = await scaffolder.addAuth(cwd, options);

        // Output result
        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(`\n🔐 Adding authentication with ${options.provider}...\n`);

          if (options.dryRun) {
            console.log("📋 Changes that would be made:\n");
          }

          for (const file of result.filesCreated) {
            console.log(`  ${options.dryRun ? '○' : '✓'} Create ${file}`);
          }

          for (const file of result.filesModified) {
            console.log(`  ${options.dryRun ? '○' : '✓'} Modify ${file}`);
          }

          if (!options.dryRun) {
            console.log(`\n✅ Authentication added successfully!\n`);
            console.log("Next steps:");
            console.log("  1. npm install");
            console.log("  2. cp .env.example .env");
            console.log("  3. Configure your auth credentials in .env");

            if (result.platform === 'cloudflare') {
              console.log("  4. wrangler kv:namespace create OAUTH_KV");
              console.log("  5. Update wrangler.toml with KV namespace ID");
            }

            console.log(`  6. See README.md for ${options.provider} setup\n`);
          }
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (options.json) {
          const result: AddAuthResult = {
            success: false,
            provider: options.provider,
            platform: 'unknown',
            filesCreated: [],
            filesModified: [],
            error: errorMessage,
          };
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.error(`\n❌ Error: ${errorMessage}\n`);

          if (errorMessage.includes('Not an MCP server project')) {
            console.error("This doesn't appear to be an MCP server project.");
            console.error("Run this command from the project root directory.\n");
          }
        }

        process.exit(1);
      }
    });

  return command;
}
```

**Integration**: Update `add-tool.ts` to include auth command

```typescript
// src/core/commands/add-tool.ts (modify createAddCommand)
export function createAddCommand(): Command {
  const addCmd = new Command("add").description(
    "Add components to your MCP server",
  );

  addCmd.addCommand(createAddToolCommand());
  addCmd.addCommand(createAddPromptCommand());
  addCmd.addCommand(createAddResourceCommand());
  addCmd.addCommand(createAddAuthCommand());  // NEW

  return addCmd;
}
```

#### 1.2 Implement Auth Scaffolder

**File**: `src/core/commands/shared/auth-scaffolder.ts`

```typescript
/**
 * Auth Scaffolder
 *
 * Orchestrates adding authentication to existing projects:
 * - Platform detection
 * - File transformation
 * - Dependency management
 * - Configuration updates
 */

import { readFile, writeFile, mkdir, cp, rm, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, basename } from "node:path";
import type { AddAuthOptions, AddAuthResult } from "../../../types/command-results.js";

type Platform = 'cloudflare' | 'vercel' | 'unknown';
type Provider = 'stytch' | 'auth0' | 'workos';

export class AuthScaffolder {
  /**
   * Add authentication to existing project
   */
  async addAuth(cwd: string, options: AddAuthOptions): Promise<AddAuthResult> {
    const result: AddAuthResult = {
      success: false,
      provider: options.provider,
      platform: 'unknown',
      filesCreated: [],
      filesModified: [],
    };

    // 1. Validate project and detect platform
    const platform = options.platform || await this.detectPlatform(cwd);
    result.platform = platform;

    if (platform === 'unknown') {
      throw new Error(
        'Could not detect platform (Cloudflare or Vercel). ' +
        'Use --platform flag to specify manually.'
      );
    }

    await this.validateProject(cwd, platform);

    // If dry-run, preview changes and exit
    if (options.dryRun) {
      return this.previewChanges(cwd, platform, options.provider);
    }

    // 2. Create backup
    const backupDir = options.backup !== false
      ? await this.createBackup(cwd)
      : null;

    try {
      // 3. Add dependencies to package.json
      await this.addDependencies(cwd, platform, options.provider);
      result.filesModified.push('package.json');

      // 4. Create auth files
      const authFiles = await this.createAuthFiles(cwd, options.provider);
      result.filesCreated.push(...authFiles);

      // 5. Transform entry point
      const transformedFiles = await this.transformEntryPoint(cwd, platform);
      result.filesCreated.push(...transformedFiles.created);
      result.filesModified.push(...transformedFiles.modified);

      // 6. Update configuration files
      const configFiles = await this.updateConfiguration(cwd, platform, options.provider);
      result.filesCreated.push(...configFiles.created);
      result.filesModified.push(...configFiles.modified);

      // 7. Update README
      await this.updateReadme(cwd, options.provider);
      result.filesModified.push('README.md');

      // Success - remove backup
      if (backupDir) {
        await rm(backupDir, { recursive: true, force: true });
      }

      result.success = true;
      return result;

    } catch (error) {
      // Restore from backup on failure
      if (backupDir) {
        console.log('🔄 Restoring from backup...');
        await this.restoreBackup(backupDir, cwd);
        console.log('✅ Restored to previous state');
      }

      throw error;
    }
  }

  /**
   * Detect platform (Cloudflare Workers or Vercel)
   */
  private async detectPlatform(cwd: string): Promise<Platform> {
    // Check for Cloudflare Workers
    if (existsSync(join(cwd, 'wrangler.toml'))) {
      return 'cloudflare';
    }

    // Check for Vercel (Next.js)
    if (existsSync(join(cwd, 'vercel.json')) ||
        existsSync(join(cwd, 'next.config.js')) ||
        existsSync(join(cwd, 'next.config.mjs'))) {
      return 'vercel';
    }

    // Check package.json for clues
    const pkgPath = join(cwd, 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));

      if (pkg.dependencies?.['agents']) {
        return 'cloudflare';
      }

      if (pkg.dependencies?.['@vercel/mcp-adapter']) {
        return 'vercel';
      }
    }

    return 'unknown';
  }

  /**
   * Validate project structure
   */
  private async validateProject(cwd: string, platform: Platform): Promise<void> {
    // Check for src/index.ts or appropriate entry point
    const indexPath = platform === 'cloudflare'
      ? join(cwd, 'src/index.ts')
      : join(cwd, 'app/api/mcp/route.ts');

    if (!existsSync(indexPath)) {
      throw new Error(
        `Not an MCP server project. Missing entry point: ${basename(indexPath)}`
      );
    }

    // Check if auth already exists
    if (existsSync(join(cwd, 'src/auth'))) {
      throw new Error(
        'Authentication already configured. ' +
        'Remove src/auth directory to start fresh.'
      );
    }

    // Check for package.json
    if (!existsSync(join(cwd, 'package.json'))) {
      throw new Error('Not a Node.js project. Missing package.json.');
    }
  }

  /**
   * Create backup of src directory
   */
  private async createBackup(cwd: string): Promise<string> {
    const timestamp = Date.now();
    const backupDir = join(cwd, `.backup-${timestamp}`);

    await cp(join(cwd, 'src'), join(backupDir, 'src'), { recursive: true });

    // Also backup important config files
    const filesToBackup = ['package.json', 'wrangler.toml', 'README.md', '.gitignore'];
    for (const file of filesToBackup) {
      const filePath = join(cwd, file);
      if (existsSync(filePath)) {
        await cp(filePath, join(backupDir, file));
      }
    }

    return backupDir;
  }

  /**
   * Restore from backup
   */
  private async restoreBackup(backupDir: string, cwd: string): Promise<void> {
    // Restore src directory
    await rm(join(cwd, 'src'), { recursive: true, force: true });
    await cp(join(backupDir, 'src'), join(cwd, 'src'), { recursive: true });

    // Restore config files
    const files = await readdir(backupDir);
    for (const file of files) {
      if (file !== 'src') {
        await cp(join(backupDir, file), join(cwd, file));
      }
    }

    // Remove backup
    await rm(backupDir, { recursive: true, force: true });
  }

  /**
   * Add dependencies to package.json
   */
  private async addDependencies(
    cwd: string,
    platform: Platform,
    provider: Provider
  ): Promise<void> {
    const pkgPath = join(cwd, 'package.json');
    const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));

    // Platform-specific OAuth library
    if (platform === 'cloudflare') {
      pkg.dependencies['@cloudflare/workers-oauth-provider'] = '^0.0.12';
    }

    // Provider-specific SDK
    switch (provider) {
      case 'stytch':
        pkg.dependencies['stytch'] = '^12.42.1';
        break;
      case 'auth0':
        pkg.dependencies['auth0'] = '^4.0.0';
        break;
      case 'workos':
        pkg.dependencies['workos'] = '^5.0.0';
        break;
    }

    await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  }

  /**
   * Create auth files (types, config, providers)
   */
  private async createAuthFiles(cwd: string, provider: Provider): Promise<string[]> {
    const authDir = join(cwd, 'src/auth');
    const providersDir = join(authDir, 'providers');

    await mkdir(authDir, { recursive: true });
    await mkdir(providersDir, { recursive: true });

    const files: string[] = [];

    // Create types.ts
    const typesPath = join(authDir, 'types.ts');
    await writeFile(typesPath, this.generateTypesTemplate());
    files.push('src/auth/types.ts');

    // Create config.ts
    const configPath = join(authDir, 'config.ts');
    await writeFile(configPath, this.generateConfigTemplate(provider));
    files.push('src/auth/config.ts');

    // Create provider file
    const providerPath = join(providersDir, `${provider}.ts`);
    await writeFile(providerPath, this.generateProviderTemplate(provider));
    files.push(`src/auth/providers/${provider}.ts`);

    return files;
  }

  /**
   * Transform entry point (extract server, wrap with OAuth)
   */
  private async transformEntryPoint(
    cwd: string,
    platform: Platform
  ): Promise<{ created: string[], modified: string[] }> {
    if (platform === 'cloudflare') {
      return this.transformCloudflareEntry(cwd);
    } else {
      return this.transformVercelEntry(cwd);
    }
  }

  /**
   * Transform Cloudflare Workers entry point
   */
  private async transformCloudflareEntry(
    cwd: string
  ): Promise<{ created: string[], modified: string[] }> {
    const indexPath = join(cwd, 'src/index.ts');
    const serverPath = join(cwd, 'src/server.ts');

    const content = await readFile(indexPath, 'utf-8');

    // Extract MCP server class
    const serverClassMatch = content.match(
      /export class (\w+Agent) extends McpAgent<[^>]+>\s*{[\s\S]*?(?=\nexport default|$)}/m
    );

    if (!serverClassMatch) {
      throw new Error(
        'Could not find MCP Agent class in src/index.ts. ' +
        'Expected: export class YourAgent extends McpAgent<Env>'
      );
    }

    const serverClass = serverClassMatch[0];
    const serverClassName = serverClassMatch[1];

    // Extract imports needed for server
    const imports = content.match(/import .* from .*[;"]/g) || [];
    const serverImports = imports
      .filter(imp =>
        imp.includes('@modelcontextprotocol/sdk') ||
        imp.includes('agents/mcp') ||
        imp.includes('./tools/') ||
        imp.includes('./prompts/') ||
        imp.includes('./resources/')
      )
      .join('\n');

    // Create server.ts
    const serverContent = `${serverImports}
import type { UserContext } from "./auth/types.js";

/**
 * MCP Server Implementation
 *
 * This file contains the MCP server logic.
 * User context is available via this.props when authenticated.
 */

${serverClass}
`;

    await writeFile(serverPath, serverContent);

    // Create new index.ts with OAuth wrapper
    const oauthWrapper = this.generateOAuthWrapperTemplate(serverClassName);
    await writeFile(indexPath, oauthWrapper);

    return {
      created: ['src/server.ts'],
      modified: ['src/index.ts'],
    };
  }

  /**
   * Transform Vercel Next.js entry point
   */
  private async transformVercelEntry(
    cwd: string
  ): Promise<{ created: string[], modified: string[] }> {
    const routePath = join(cwd, 'app/api/mcp/route.ts');
    const content = await readFile(routePath, 'utf-8');

    // Wrap existing handler with experimental_withMcpAuth
    const wrappedContent = this.generateVercelAuthWrapper(content);
    await writeFile(routePath, wrappedContent);

    return {
      created: [],
      modified: ['app/api/mcp/route.ts'],
    };
  }

  // Template generators (implementations in next section)
  private generateTypesTemplate(): string { /* ... */ }
  private generateConfigTemplate(provider: Provider): string { /* ... */ }
  private generateProviderTemplate(provider: Provider): string { /* ... */ }
  private generateOAuthWrapperTemplate(serverClassName: string): string { /* ... */ }
  private generateVercelAuthWrapper(content: string): string { /* ... */ }

  // Configuration and documentation updates (implementations in next section)
  private async updateConfiguration(...args): Promise<...> { /* ... */ }
  private async updateReadme(...args): Promise<void> { /* ... */ }
  private async previewChanges(...args): Promise<AddAuthResult> { /* ... */ }
}
```

**Continue in next message with template generators and remaining implementation...**

---

## Template Generators

### Auth Types Template

```typescript
private generateTypesTemplate(): string {
  return `/**
 * Authentication Types
 *
 * Common interfaces for all auth providers.
 */

export interface AuthProvider {
  name: string;
  validateToken(token: string, env: Env): Promise<UserContext>;
  getMetadata(env: Env): AuthServerMetadata;
  getRequiredEnvVars(): string[];
}

export interface UserContext {
  userId: string;
  email?: string;
  name?: string;
  scopes?: string[];
  metadata?: Record<string, unknown>;
}

export interface AuthServerMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  scopes_supported?: string[];
}

export class AuthenticationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}
`;
}
```

### Config Template (Provider-Specific)

```typescript
private generateConfigTemplate(provider: Provider): string {
  return `/**
 * Authentication Configuration
 *
 * Provides the appropriate auth provider based on environment.
 */

import type { AuthProvider } from './types.js';
import { ${this.capitalizeFirst(provider)}Provider } from './providers/${provider}.js';

export function getAuthProvider(env: Env): AuthProvider {
  return new ${this.capitalizeFirst(provider)}Provider();
}

export function validateAuthEnv(env: Env): void {
  const provider = getAuthProvider(env);
  const required = provider.getRequiredEnvVars();

  for (const key of required) {
    if (!env[key]) {
      throw new Error(
        \`Missing required environment variable: \${key}\\n\` +
        \`Please set this in your .env file or wrangler.toml\`
      );
    }
  }
}
`;
}
```

### Provider Templates

See [auth-research-findings.md](./auth-research-findings.md) for complete provider implementations (Stytch, Auth0, WorkOS).

---

## Testing Strategy

### Unit Tests

**File**: `test/unit/commands/add-auth.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthScaffolder } from '../../../src/core/commands/shared/auth-scaffolder';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

describe('AuthScaffolder', () => {
  const testDir = '/tmp/auth-scaffolder-test';
  let scaffolder: AuthScaffolder;

  beforeEach(async () => {
    scaffolder = new AuthScaffolder();
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('detectPlatform', () => {
    it('should detect Cloudflare Workers', async () => {
      // Create minimal Cloudflare project
      await mkdir(join(testDir, 'src'));
      await writeFile(join(testDir, 'wrangler.toml'), '');
      await writeFile(join(testDir, 'src/index.ts'), '');

      const platform = await scaffolder['detectPlatform'](testDir);
      expect(platform).toBe('cloudflare');
    });

    it('should detect Vercel Next.js', async () => {
      // Create minimal Next.js project
      await mkdir(join(testDir, 'app/api/mcp'), { recursive: true });
      await writeFile(join(testDir, 'next.config.js'), '');
      await writeFile(join(testDir, 'app/api/mcp/route.ts'), '');

      const platform = await scaffolder['detectPlatform'](testDir);
      expect(platform).toBe('vercel');
    });
  });

  describe('validateProject', () => {
    it('should pass for valid Cloudflare project', async () => {
      await mkdir(join(testDir, 'src'));
      await writeFile(join(testDir, 'src/index.ts'), 'export class Agent {}');
      await writeFile(join(testDir, 'package.json'), '{}');

      await expect(
        scaffolder['validateProject'](testDir, 'cloudflare')
      ).resolves.not.toThrow();
    });

    it('should throw for missing entry point', async () => {
      await expect(
        scaffolder['validateProject'](testDir, 'cloudflare')
      ).rejects.toThrow('Missing entry point');
    });

    it('should throw if auth already exists', async () => {
      await mkdir(join(testDir, 'src/auth'), { recursive: true });
      await writeFile(join(testDir, 'src/index.ts'), '');
      await writeFile(join(testDir, 'package.json'), '{}');

      await expect(
        scaffolder['validateProject'](testDir, 'cloudflare')
      ).rejects.toThrow('Authentication already configured');
    });
  });

  describe('createBackup', () => {
    it('should create backup with timestamp', async () => {
      await mkdir(join(testDir, 'src'));
      await writeFile(join(testDir, 'src/index.ts'), 'original content');

      const backupDir = await scaffolder['createBackup'](testDir);

      expect(backupDir).toContain('.backup-');
      expect(existsSync(join(backupDir, 'src/index.ts'))).toBe(true);
    });
  });

  describe('addAuth integration', () => {
    it('should add auth to Cloudflare project', async () => {
      // Setup minimal project
      await mkdir(join(testDir, 'src'));
      await writeFile(join(testDir, 'src/index.ts'), `
export class MCPServerAgent extends McpAgent<Env> {
  server = new McpServer({ name: "Test" });
  async init() {}
}
export default { async fetch() {} };
      `);
      await writeFile(join(testDir, 'package.json'), JSON.stringify({
        dependencies: { agents: '^0.2.17' }
      }));
      await writeFile(join(testDir, 'wrangler.toml'), '');

      // Add auth
      const result = await scaffolder.addAuth(testDir, {
        provider: 'stytch',
        backup: false,
      });

      expect(result.success).toBe(true);
      expect(result.filesCreated).toContain('src/auth/types.ts');
      expect(result.filesCreated).toContain('src/server.ts');
      expect(result.filesModified).toContain('src/index.ts');
    });
  });
});
```

### Integration Tests

**File**: `test/integration/add-auth.e2e.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { rm } from 'node:fs/promises';

describe('add auth end-to-end', () => {
  const testDir = '/tmp/mcp-add-auth-e2e';

  afterEach(async () => {
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  it('should add auth to freshly scaffolded project', () => {
    // Scaffold project
    execSync(
      `node bin/mcp-server-kit.js new server --name test-auth --output ${testDir} --dev --no-install`,
      { stdio: 'inherit' }
    );

    const projectDir = join(testDir, 'test-auth');

    // Add auth
    execSync(
      `cd ${projectDir} && node ../../bin/mcp-server-kit.js add auth --provider stytch --no-backup`,
      { stdio: 'inherit' }
    );

    // Verify structure
    expect(existsSync(join(projectDir, 'src/auth'))).toBe(true);
    expect(existsSync(join(projectDir, 'src/auth/types.ts'))).toBe(true);
    expect(existsSync(join(projectDir, 'src/auth/providers/stytch.ts'))).toBe(true);
    expect(existsSync(join(projectDir, 'src/server.ts'))).toBe(true);
    expect(existsSync(join(projectDir, '.env.example'))).toBe(true);

    // Verify index.ts was transformed
    const indexContent = readFileSync(join(projectDir, 'src/index.ts'), 'utf-8');
    expect(indexContent).toContain('OAuthProvider');
    expect(indexContent).toContain('getAuthProvider');

    // Verify server.ts has original class
    const serverContent = readFileSync(join(projectDir, 'src/server.ts'), 'utf-8');
    expect(serverContent).toContain('MCPServerAgent');
    expect(serverContent).toContain('extends McpAgent');

    // Verify package.json has dependencies
    const pkg = JSON.parse(readFileSync(join(projectDir, 'package.json'), 'utf-8'));
    expect(pkg.dependencies['@cloudflare/workers-oauth-provider']).toBeDefined();
    expect(pkg.dependencies['stytch']).toBeDefined();

    // Verify .env.example has Stytch vars
    const envExample = readFileSync(join(projectDir, '.env.example'), 'utf-8');
    expect(envExample).toContain('STYTCH_PROJECT_ID');
    expect(envExample).toContain('STYTCH_SECRET');
  });

  it('should support dry-run mode', () => {
    // Scaffold project
    execSync(
      `node bin/mcp-server-kit.js new server --name test-dry --output ${testDir} --dev --no-install`
    );

    const projectDir = join(testDir, 'test-dry');

    // Dry run
    const output = execSync(
      `cd ${projectDir} && node ../../bin/mcp-server-kit.js add auth --provider stytch --dry-run`,
      { encoding: 'utf-8' }
    );

    // Should show what would change
    expect(output).toContain('Create src/auth/types.ts');
    expect(output).toContain('Modify src/index.ts');

    // But not actually create files
    expect(existsSync(join(projectDir, 'src/auth'))).toBe(false);
  });
});
```

---

## Documentation Updates

### User Guide

**File**: `docs/authentication/README.md`

```markdown
# Authentication Guide

Add OAuth 2.1 authentication to your MCP server in minutes.

## Quick Start

```bash
# 1. Create your MCP server
mcp-server-kit new server --name my-app

# 2. Test it works (optional but recommended)
cd my-app
npm install
npm run dev

# 3. Add authentication
mcp-server-kit add auth --provider stytch

# 4. Configure
npm install
cp .env.example .env
# Edit .env with your credentials

# 5. Setup platform-specific requirements
wrangler kv:namespace create OAUTH_KV  # Cloudflare only

# 6. Deploy
npm run deploy
```

## Supported Platforms

- ✅ Cloudflare Workers
- ✅ Vercel Edge Functions (coming soon)

## Supported Providers

- ✅ [Stytch](./providers/stytch.md) - Recommended for CLI/agent workflows
- ✅ [Auth0](./providers/auth0.md) - Enterprise-grade
- ✅ [WorkOS](./providers/workos.md) - B2B/SSO focus

## How It Works

The `add auth` command:

1. Detects your platform (Cloudflare or Vercel)
2. Creates auth configuration files in `src/auth/`
3. Transforms your entry point to wrap with OAuth
4. Updates dependencies and configuration
5. Generates `.env.example` with required credentials

Your MCP tools receive authenticated user context automatically.

## Migration

Already have an MCP server? No problem:

```bash
cd your-existing-project
mcp-server-kit add auth --provider stytch
```

## Troubleshooting

See [Troubleshooting Guide](./troubleshooting.md) for common issues.
```

---

## Rollout Timeline

### Week 1-2: Phase 1 - Core Implementation
- [ ] Implement `add-auth.ts` command
- [ ] Implement `AuthScaffolder` class
- [ ] Platform detection logic
- [ ] File transformation for Cloudflare
- [ ] Stytch provider implementation
- [ ] Unit tests for scaffolder
- [ ] Integration tests for add auth

### Week 3: Phase 2 - Additional Providers
- [ ] Auth0 provider implementation
- [ ] WorkOS provider implementation
- [ ] Provider selection validation
- [ ] Provider-specific documentation

### Week 4-5: Phase 3 - Vercel Support
- [ ] Vercel platform detection
- [ ] Vercel entry point transformation
- [ ] Test with Next.js projects
- [ ] Cross-platform documentation

### Week 6: Phase 4 - Enhanced Safety
- [ ] Dry-run mode implementation
- [ ] Backup/restore mechanism
- [ ] Conflict detection improvements
- [ ] Manual setup fallback guide

### Week 7: Phase 5 - Convenience Features
- [ ] Add `--auth` flag to `new server`
- [ ] Internally calls `add auth` after scaffold
- [ ] Update all documentation
- [ ] Create video tutorial

---

## Success Metrics

### Technical
- ✅ Detects platform correctly (100% for Cloudflare/Vercel)
- ✅ Transforms files without breaking syntax (validated by type-check)
- ✅ Zero data loss (backup/restore works)
- ✅ Adds auth in < 5 seconds

### User Experience
- ✅ Clear error messages for common issues
- ✅ Dry-run mode shows accurate preview
- ✅ < 5 commands from unauthenticated to authenticated
- ✅ Documentation covers all providers

### Adoption
- Track `add auth` command usage
- Monitor GitHub issues for auth problems
- Survey users on setup experience
- Measure time-to-first-authenticated-request

---

## Conclusion

The `add auth` command approach provides:

**Benefits**:
- ✅ Single auth implementation (vs N×M templates)
- ✅ Progressive complexity (build → test → secure)
- ✅ Cross-platform by design
- ✅ Follows CLI patterns
- ✅ Flexible workflow

**Next Steps**:
1. Review and approve this revised plan
2. Begin Phase 1 implementation
3. Create Stytch test account for development
4. Set up integration test environment

**Recommendation**: This approach is superior for long-term maintenance and user experience. Proceed with implementation.
