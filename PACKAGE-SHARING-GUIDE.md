# Package Sharing Guide

## Package Published! ✅

Your package `@MikeC-A6/mcp-server-kit` version 1.0.0 is now published to GitHub Packages as a **private package**.

- **Package Name**: `@MikeC-A6/mcp-server-kit`
- **Registry**: GitHub Packages (npm.pkg.github.com)
- **Visibility**: Private (restricted access)
- **Repository**: https://github.com/MikeC-A6/mcp-server-kit

---

## Your Setup

### Option 1: Use GitHub CLI (Recommended)

The best approach is to use your existing `gh` CLI authentication:

**First time setup:**
```bash
# Add package scopes to your gh token
./scripts/setup-gh-auth.sh
```

**That's it!** The publish script will automatically use `gh auth token`.

### Option 2: Use .env file (Fallback)

If you prefer a separate token, it's stored in `.env` (gitignored).

**Files created:**
- ✅ `scripts/setup-gh-auth.sh` - Setup gh CLI auth
- ✅ `scripts/publish.sh` - Publish script (uses gh or .env)
- ✅ `.env` - Fallback token storage (gitignored)
- ✅ `.env.example` - Template for others
- ✅ `~/.npmrc` - npm registry configuration

**To publish updates:**
```bash
./scripts/publish.sh patch
```

The script automatically tries `gh auth token` first, then falls back to `.env`.

---

## Viewing Your Package

Visit: https://github.com/MikeC-A6/mcp-server-kit/packages

Or check the "Packages" section in your repository sidebar.

---

## Sharing with Collaborators

Since you chose the **repository collaborators model**, anyone with repository access can install the package.

### Add a Collaborator (GitHub CLI)

```bash
# Add someone as a collaborator with write access
gh repo add-collaborator MikeC-A6/mcp-server-kit USERNAME --permission write

# Add with read-only access (can install package but not push code)
gh repo add-collaborator MikeC-A6/mcp-server-kit USERNAME --permission read
```

### Add a Collaborator (GitHub Web UI)

1. Go to: https://github.com/MikeC-A6/mcp-server-kit/settings/access
2. Click "Add people"
3. Enter their GitHub username
4. Select permission level (Read, Write, or Admin)
5. Click "Add [username] to this repository"

That's it! Once added, they can install the package.

---

## Installation Instructions for Collaborators

**Super simple - just one command!**

Send collaborators this one-liner:

```bash
curl -fsSL https://raw.githubusercontent.com/MikeC-A6/mcp-server-kit/master/scripts/install-collaborator-setup.sh | bash
```

Or if they've cloned the repo:

```bash
./scripts/install-collaborator-setup.sh
```

**That's it!** The script:
- ✅ Installs/configures GitHub CLI
- ✅ Adds package permissions
- ✅ Configures npm automatically
- ✅ Sets up their shell (zsh/bash)
- ✅ Works forever - no token management needed

### After Setup

Just open a new terminal and run:

```bash
# Install in a project
npm install @MikeC-A6/mcp-server-kit

# Or install globally
npm install -g @MikeC-A6/mcp-server-kit
```

### Verify Installation

```bash
# Check CLI works
mcp-server-kit --version

# Should show: 1.0.0
```

### Manual Setup (Advanced)

<details>
<summary>Click if you prefer manual setup instead of the script</summary>

1. Install GitHub CLI: `brew install gh`
2. Authenticate: `gh auth login`
3. Add package scopes: `gh auth refresh -h github.com -s read:packages`
4. Configure npm:
   ```bash
   echo "//npm.pkg.github.com/:_authToken=\${NODE_AUTH_TOKEN}" >> ~/.npmrc
   echo "@MikeC-A6:registry=https://npm.pkg.github.com/" >> ~/.npmrc
   echo "always-auth=true" >> ~/.npmrc
   ```
5. Add to shell config (~/.zshrc or ~/.bashrc):
   ```bash
   echo 'export NODE_AUTH_TOKEN=$(gh auth token 2>/dev/null)' >> ~/.zshrc
   ```
6. Reload: `source ~/.zshrc`

</details>

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
```

### As a Library

```typescript
// Main exports
import { TemplateProcessor, TemplateRegistry } from '@MikeC-A6/mcp-server-kit';

// Test harness
import { TestRunner, loadTestSpec } from '@MikeC-A6/mcp-server-kit/harness';

// Scaffolding
import { EntityScaffolder } from '@MikeC-A6/mcp-server-kit/scaffolding';

// Validation
import { validateProject } from '@MikeC-A6/mcp-server-kit/validation';
```

---

## Publishing Updates

The token is stored in `.env` (which is gitignored), so you never need to type it in commands.

### Option 1: Using the Publish Script (Recommended)

```bash
# Patch version (1.0.0 -> 1.0.1) - bug fixes
./scripts/publish.sh patch

# Minor version (1.0.0 -> 1.1.0) - new features
./scripts/publish.sh minor

# Major version (1.0.0 -> 2.0.0) - breaking changes
./scripts/publish.sh major

# Then push tags
git push --tags
```

### Option 2: Using npm Scripts

```bash
# Load .env first (macOS/Linux)
export $(cat .env | grep -v '^#' | xargs)

# Then publish
npm run publish:patch  # or publish:minor, publish:major

# Push tags
git push --tags
```

### Option 3: Manual Steps

```bash
# Load .env
export $(cat .env | grep -v '^#' | xargs)

# Bump version
npm version patch

# Publish
npm publish

# Push tags
git push --tags
```

---

## Checking Package Status

```bash
# View package details
npm view @MikeC-A6/mcp-server-kit

# List published versions
npm view @MikeC-A6/mcp-server-kit versions

# Check who can access
gh repo view MikeC-A6/mcp-server-kit --json collaborators
```

---

## Managing Access

### List Current Collaborators

```bash
gh api repos/MikeC-A6/mcp-server-kit/collaborators --jq '.[].login'
```

### Remove Access

```bash
# Remove a collaborator
gh api -X DELETE repos/MikeC-A6/mcp-server-kit/collaborators/USERNAME
```

### Change Permission Level

```bash
# Update permission (read, write, admin)
gh repo add-collaborator MikeC-A6/mcp-server-kit USERNAME --permission read
```

---

## Troubleshooting

### "401 Unauthorized" when installing

**Solution**:
- Verify `NODE_AUTH_TOKEN` is set: `echo $NODE_AUTH_TOKEN`
- Check token has `read:packages` scope
- Ensure user is a repository collaborator

### "404 Not Found"

**Solution**:
- Verify exact package name: `@MikeC-A6/mcp-server-kit`
- Check user has repository access
- Ensure `.npmrc` is configured correctly

### "Permission denied"

**Solution**:
- User needs to be added as a collaborator
- Check repository visibility is set to private
- Verify user's token hasn't expired

---

## Quick Reference

```bash
# Add collaborator
gh repo add-collaborator MikeC-A6/mcp-server-kit USERNAME --permission read

# Publish update (token loaded from .env)
./scripts/publish.sh patch

# Install package
npm install @MikeC-A6/mcp-server-kit

# View on GitHub
open https://github.com/MikeC-A6/mcp-server-kit/packages
```

---

## Next Steps

1. ✅ Package published successfully
2. Add collaborators who need access
3. Send them the installation instructions above
4. They can now install and use the package!

The package will remain private and only accessible to repository collaborators.
