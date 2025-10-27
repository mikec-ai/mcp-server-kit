# Publishing Scripts

## publish.sh

Convenience script for publishing to GitHub Packages.

**Setup:**
1. Ensure `.env` exists with `NODE_AUTH_TOKEN=your_github_token`
2. Run the script: `./scripts/publish.sh [patch|minor|major]`

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
1. Loads `NODE_AUTH_TOKEN` from `.env`
2. Validates the token is set
3. Runs `npm version <type>` to bump version
4. Runs `npm publish` to publish to GitHub Packages
5. Reminds you to push tags

**After publishing:**
```bash
git push --tags
```

## Security

- `.env` is in `.gitignore` and **never committed**
- The script only reads the token, never logs it
- Token is required to have `read:packages`, `write:packages`, `repo` scopes
