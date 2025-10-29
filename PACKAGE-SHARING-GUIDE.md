# Package Publishing Guide

## Package Published to npmjs.org! ✅

Your package `mcp-server-kit` is published to npmjs.org as a **public package**.

- **Package Name**: `mcp-server-kit`
- **Registry**: npmjs.org (public npm registry)
- **Visibility**: Public (anyone can install)
- **Repository**: https://github.com/mikec-ai/mcp-server-kit
- **npm Page**: https://www.npmjs.com/package/mcp-server-kit

---

## Installation

### For Users

Anyone can install your package globally or as a project dependency:

```bash
# Install globally
npm install -g mcp-server-kit

# Or use as a project dependency
npm install --save-dev mcp-server-kit

# Or use with npx (no installation required)
npx mcp-server-kit new server --name my-server
```

### Verify Installation

```bash
# Check CLI works
mcp-server-kit --version

# Should show: 1.0.8
```

---

## Using the Package

### As a CLI Tool

```bash
# Create a new MCP server
mcp-server-kit new server --name my-server

# Add tools
mcp-server-kit add tool weather --description "Get weather data"

# Validate
mcp-server-kit validate

# List tools
mcp-server-kit list tools
```

### As a Library

```typescript
// Main exports
import { TemplateProcessor, TemplateRegistry } from 'mcp-server-kit';

// Test harness
import { TestRunner, loadTestSpec } from 'mcp-server-kit/harness';

// Scaffolding
import { EntityScaffolder } from 'mcp-server-kit/scaffolding';

// Validation
import { validateProject } from 'mcp-server-kit/validation';
```

---

## Publishing Updates (For Maintainers)

### First-Time Setup

1. **Create npmjs.org account** at https://www.npmjs.com/signup
   - Username: `mikec.ai` (scope `mcp-server-kit` can be claimed separately)
   - Verify your email address

2. **Enable Two-Factor Authentication** (required for publishing)
   - Go to https://www.npmjs.com/settings/YOUR_USERNAME/tfa
   - Enable 2FA using authenticator app or SMS

3. **Login to npm from CLI**
   ```bash
   npm login
   # Enter username, password, and 2FA code when prompted
   ```

4. **Verify authentication**
   ```bash
   npm whoami
   # Should show: mikec.ai
   ```

### Publishing a New Version

```bash
# 1. Bump version and create git tag
npm version patch  # For bug fixes (1.0.8 -> 1.0.9)
npm version minor  # For new features (1.0.8 -> 1.1.0)
npm version major  # For breaking changes (1.0.8 -> 2.0.0)

# 2. Publish to npmjs.org (runs build and tests automatically)
npm publish

# 3. Push changes and tags to GitHub
git push && git push --tags
```

**Note**: The `prepublishOnly` script automatically runs `npm run build && npm run test:all` before publishing, ensuring only tested code is published.

### First Publish Only

If this is your first time publishing the package to npmjs.org:

```bash
npm publish --access public
```

The `--access public` flag is only needed once for scoped packages. Subsequent publishes will remember the access setting.

---

## Checking Package Status

```bash
# View package details
npm view mcp-server-kit

# List published versions
npm view mcp-server-kit versions

# Check download stats
npm view mcp-server-kit downloads

# View on npmjs.org
open https://www.npmjs.com/package/mcp-server-kit
```

---

## Package Metadata

### npm Badges

Add these to your README.md to show package status:

```markdown
[![npm version](https://img.shields.io/npm/v/mcp-server-kit.svg)](https://www.npmjs.com/package/mcp-server-kit)
[![npm downloads](https://img.shields.io/npm/dm/mcp-server-kit.svg)](https://www.npmjs.com/package/mcp-server-kit)
```

### Package Keywords

Your package is discoverable via these keywords on npmjs.org:
- mcp
- model-context-protocol
- scaffolding
- testing
- cloudflare-workers
- vercel
- cli
- ai
- ai-agents
- claude
- anthropic
- typescript

---

## Troubleshooting

### "401 Unauthorized" when publishing

**Solution**:
- Run `npm login` to authenticate
- Verify you're logged in: `npm whoami`
- Check 2FA is enabled on your npm account
- Try publishing again

### "403 Forbidden" error

**Solution**:
- Verify the scope `mcp-server-kit` matches your npm username
- Ensure you have publishing rights to this scope
- For first publish, use `npm publish --access public`

### "You must verify your email"

**Solution**:
- Check your email for verification link from npmjs.org
- Click the verification link
- Try publishing again

### Package name already exists

**Solution**:
- Scoped packages (`@username/package-name`) are unique to your account
- Ensure you're logged in as the correct user: `npm whoami`
- If someone else owns the scope, you'll need to choose a different username/scope

---

## Managing Package Access

### Transfer Ownership

To transfer the package to another npm user:

```bash
npm owner add USERNAME mcp-server-kit
npm owner rm YOUR_USERNAME mcp-server-kit
```

### Add Collaborators

To allow others to publish updates:

```bash
npm owner add USERNAME mcp-server-kit
```

### Remove Collaborators

```bash
npm owner rm USERNAME mcp-server-kit
```

### View Current Owners

```bash
npm owner ls mcp-server-kit
```

---

## Unpublishing (Use with Caution)

**Warning**: Unpublishing is permanent and can break projects that depend on your package.

```bash
# Unpublish a specific version (within 72 hours of publish)
npm unpublish mcp-server-kit@1.0.8

# Unpublish entire package (within 72 hours)
npm unpublish mcp-server-kit --force
```

**Best Practice**: Instead of unpublishing, publish a new version with fixes. Use `npm deprecate` to warn users about problematic versions:

```bash
npm deprecate mcp-server-kit@1.0.8 "Bug in this version, please upgrade to 1.0.9"
```

---

## Quick Reference

```bash
# First-time setup
npm login
npm publish --access public

# Regular publishing workflow
npm version patch && npm publish && git push --tags

# Check status
npm view mcp-server-kit
npm whoami

# View on web
open https://www.npmjs.com/package/mcp-server-kit
```

---

## Next Steps

1. ✅ Package published to npmjs.org
2. Add npm badges to README.md (see "Package Metadata" section above)
3. Share the package: `npm install mcp-server-kit`
4. Monitor downloads and issues on npmjs.org

The package is now publicly available for anyone to install and use!
