# Publishing Scripts

## install-collaborator-setup.sh

**One-command setup for collaborators** - Does everything automatically!

**Usage:**

```bash
# From the web (recommended for collaborators)
curl -fsSL https://raw.githubusercontent.com/MikeC-A6/mcp-server-kit/master/scripts/install-collaborator-setup.sh | bash

# Or if you've cloned the repo
./scripts/install-collaborator-setup.sh
```

**What it does:**
1. ✅ Installs/checks GitHub CLI (`gh`)
2. ✅ Authenticates with GitHub if needed
3. ✅ Adds `read:packages` and `write:packages` scopes
4. ✅ Configures `~/.npmrc` for GitHub Packages
5. ✅ Adds auto-export of `NODE_AUTH_TOKEN` to shell profile
6. ✅ Works forever - no token management needed!

**After running once**, collaborators can just:
```bash
npm install mcp-server-kit
```

---

## publish.sh

**Publish new versions** to GitHub Packages.

**Prerequisites:**
Run the setup script once (already done if you can read this):
```bash
./scripts/install-collaborator-setup.sh
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
1. Gets token from `gh auth token` (or falls back to `.env`)
2. Validates token has required scopes
3. Bumps version in `package.json`
4. Runs tests (`prepublishOnly` hook)
5. Publishes to GitHub Packages
6. Reminds you to push tags

**After publishing:**
```bash
git push --tags
```

---

## Security

- Token automatically loaded from `gh auth token` (via ~/.zshrc)
- No manual token copying/pasting required
- No tokens logged or printed
- Required scopes: `read:packages`, `write:packages`, `repo`
