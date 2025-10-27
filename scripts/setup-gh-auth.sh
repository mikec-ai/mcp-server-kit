#!/usr/bin/env bash
# Setup GitHub CLI authentication for npm publishing
# This adds the required package scopes to your gh token

set -e

echo "🔐 Setting up GitHub authentication for npm packages"
echo ""

# Check if gh is installed
if ! command -v gh &> /dev/null; then
  echo "Error: GitHub CLI (gh) is not installed"
  echo "Install it from: https://cli.github.com/"
  exit 1
fi

# Check if already authenticated
if ! gh auth status &> /dev/null; then
  echo "Not authenticated with GitHub CLI"
  echo "Running: gh auth login"
  gh auth login
fi

# Add package scopes
echo ""
echo "Adding required scopes for package publishing..."
echo "This will open your browser to authorize the scopes."
echo ""

gh auth refresh -h github.com -s read:packages,write:packages

echo ""
echo "✅ Authentication setup complete!"
echo ""
echo "Your gh token now has the required scopes:"
gh auth status 2>&1 | grep "Token scopes"
echo ""
echo "You can now:"
echo "  1. Publish: ./scripts/publish.sh patch"
echo "  2. Install in projects: npm install @MikeC-A6/mcp-server-kit"
echo ""
echo "The token will be automatically loaded from 'gh auth token'"
