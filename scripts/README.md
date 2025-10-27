# Publishing Scripts

## setup-gh-auth.sh

**One-time setup** to add package scopes to your GitHub CLI token.

**Usage:**
```bash
./scripts/setup-gh-auth.sh
```

**What it does:**
1. Checks if `gh` CLI is installed
2. Ensures you're authenticated with GitHub
3. Adds `read:packages` and `write:packages` scopes to your token
4. Opens browser for authorization (interactive)

**After running this once**, you can use `gh auth token` to get your token.

---

## publish.sh

Convenience script for publishing to GitHub Packages.

**Prerequisites:**
Run the setup script once:
```bash
./scripts/setup-gh-auth.sh
```

**Usage:**
```bash
# Patch version (bug fixes: 1.0.0 -> 1.0.1)
./scripts/publish.sh patch

# Minor version (new features: 1.0.0 -> 1.1.0)
./scripts/publish.sh minor

# Major version (breaking changes: 1.0.0 -> 2.0.0)
./scripts/publish.sh major
```

**What it does:**
1. Tries to get token from `gh auth token` (preferred)
2. Falls back to `.env` if gh CLI not available
3. Validates token has required scopes
4. Runs `npm version <type>` to bump version
5. Runs `npm publish` to publish to GitHub Packages
6. Reminds you to push tags

**After publishing:**
```bash
git push --tags
```

---

## npm-use-gh-auth.sh

Helper to export `NODE_AUTH_TOKEN` from GitHub CLI.

**Usage:**
```bash
# Source it to set the variable
source ./scripts/npm-use-gh-auth.sh

# Or run before npm commands
./scripts/npm-use-gh-auth.sh && npm install @MikeC-A6/mcp-server-kit
```

**What it does:**
- Exports `NODE_AUTH_TOKEN=$(gh auth token)`
- Validates gh CLI is authenticated

---

## Security

- `.env` is in `.gitignore` and **never committed**
- Scripts prefer `gh auth token` over stored tokens
- No tokens are logged or printed
- Required scopes: `read:packages`, `write:packages`, `repo`
