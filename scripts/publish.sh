#!/usr/bin/env bash
# Publish package to GitHub Packages
# Usage: ./scripts/publish.sh [patch|minor|major]

set -e  # Exit on error

# Check if .env exists
if [ ! -f .env ]; then
  echo "Error: .env file not found"
  echo "Copy .env.example to .env and add your GitHub token"
  exit 1
fi

# Load environment variables from .env
export $(cat .env | grep -v '^#' | xargs)

# Check if NODE_AUTH_TOKEN is set
if [ -z "$NODE_AUTH_TOKEN" ]; then
  echo "Error: NODE_AUTH_TOKEN not set in .env"
  exit 1
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
