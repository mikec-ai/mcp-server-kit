#!/usr/bin/env bash
# Helper script to set NODE_AUTH_TOKEN from gh CLI
# Source this in your shell or run before npm commands

if command -v gh &> /dev/null && gh auth status &> /dev/null 2>&1; then
  export NODE_AUTH_TOKEN=$(gh auth token)
  echo "✓ NODE_AUTH_TOKEN set from GitHub CLI"
else
  echo "Error: GitHub CLI not authenticated"
  echo "Run: ./scripts/setup-gh-auth.sh"
  exit 1
fi
