# Package Sharing Guide

## Package Published! ✅

Your package `@MikeC-A6/mcp-server-kit` version 1.0.0 is now published to GitHub Packages as a **private package**.

- **Package Name**: `@MikeC-A6/mcp-server-kit`
- **Registry**: GitHub Packages (npm.pkg.github.com)
- **Visibility**: Private (restricted access)
- **Repository**: https://github.com/MikeC-A6/mcp-server-kit

---

## Your Setup

Your GitHub token is stored in `.env` (which is **not** committed to git), so you never need to type it in commands.

**Files created:**
- ✅ `.env` - Contains your GitHub token (gitignored)
- ✅ `.env.example` - Template for others
- ✅ `scripts/publish.sh` - Convenient publish script
- ✅ `~/.npmrc` - npm registry configuration

**To publish updates**, just run:
```bash
./scripts/publish.sh patch
```

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

Send these instructions to anyone you want to install the package:

### 1. Create a GitHub Personal Access Token

Go to https://github.com/settings/tokens/new and create a token with:
- ✅ `read:packages` scope
- ✅ `repo` scope (if repository is private)

Copy the token (starts with `ghp_...`)

### 2. Configure npm

Create or update `~/.npmrc`:

```ini
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
@MikeC-A6:registry=https://npm.pkg.github.com/
always-auth=true
```

Set the environment variable:

```bash
# macOS/Linux (add to ~/.zshrc or ~/.bashrc for permanence)
export NODE_AUTH_TOKEN=ghp_your_token_here

# Windows PowerShell
$env:NODE_AUTH_TOKEN="ghp_your_token_here"
```

### 3. Install the Package

```bash
# Install in a project
npm install @MikeC-A6/mcp-server-kit

# Or install globally
npm install -g @MikeC-A6/mcp-server-kit
```

### 4. Verify Installation

```bash
# Check CLI works
mcp-server-kit --version

# Should show: 1.0.0
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
