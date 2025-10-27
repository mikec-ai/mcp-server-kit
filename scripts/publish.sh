#!/usr/bin/env bash
# Publish package to GitHub Packages
# Usage: ./scripts/publish.sh [patch|minor|major]

set -e  # Exit on error

# Try to get token from gh CLI first, fallback to .env
if command -v gh &> /dev/null && gh auth status &> /dev/null; then
  echo "✓ Using GitHub CLI authentication"
  export NODE_AUTH_TOKEN=$(gh auth token)
elif [ -f .env ]; then
  echo "✓ Using token from .env"
  export $(cat .env | grep -v '^#' | xargs)
else
  echo "Error: No authentication found"
  echo "Either run 'gh auth login' or create .env with NODE_AUTH_TOKEN"
  exit 1
fi

# Check if NODE_AUTH_TOKEN is set
if [ -z "$NODE_AUTH_TOKEN" ]; then
  echo "Error: NODE_AUTH_TOKEN not set"
  exit 1
fi

# Check token has required scopes
echo "Checking token permissions..."
SCOPES=$(gh auth status 2>&1 | grep "Token scopes" | head -1 || echo "")
if [[ ! "$SCOPES" =~ "read:packages" ]] || [[ ! "$SCOPES" =~ "write:packages" ]]; then
  echo ""
  echo "⚠️  Warning: Your GitHub token may be missing required scopes"
  echo "Required scopes: read:packages, write:packages"
  echo ""
  echo "To add scopes, run in your terminal:"
  echo "  gh auth refresh -h github.com -s read:packages,write:packages"
  echo ""
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Determine version bump type (default to patch)
VERSION_TYPE=${1:-patch}

# Validate version type
if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo "Error: Invalid version type '$VERSION_TYPE'"
  echo "Usage: ./scripts/publish.sh [patch|minor|major]"
  exit 1
fi

echo "📦 Publishing with $VERSION_TYPE version bump..."

# Run npm version and publish
npm version $VERSION_TYPE
npm publish

echo "✅ Published successfully!"
echo "Don't forget to push tags: git push --tags"
