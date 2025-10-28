#!/usr/bin/env bash
# One-command setup for collaborators to install @MikeC/mcp-server-kit
# Run once, works forever - no token management needed!

set -e

echo "🚀 Setting up npm to work with @MikeC/mcp-server-kit"
echo ""

# Check if gh is installed
if ! command -v gh &> /dev/null; then
  echo "📦 Installing GitHub CLI..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    if command -v brew &> /dev/null; then
      brew install gh
    else
      echo "❌ Please install Homebrew first: https://brew.sh"
      exit 1
    fi
  else
    echo "❌ Please install GitHub CLI: https://cli.github.com"
    exit 1
  fi
fi

# Authenticate if needed
if ! gh auth status &> /dev/null 2>&1; then
  echo "🔐 Authenticating with GitHub..."
  gh auth login
fi

# Add package scopes
echo "🔑 Adding package permissions..."
SCOPES=$(gh auth status 2>&1 | grep "Token scopes" | head -1 || echo "")
if [[ ! "$SCOPES" =~ "read:packages" ]]; then
  gh auth refresh -h github.com -s read:packages,write:packages
else
  echo "✓ Already have package permissions"
fi

# Detect shell
SHELL_RC=""
if [ -n "$ZSH_VERSION" ] || [ -f "$HOME/.zshrc" ]; then
  SHELL_RC="$HOME/.zshrc"
elif [ -n "$BASH_VERSION" ] || [ -f "$HOME/.bashrc" ]; then
  SHELL_RC="$HOME/.bashrc"
else
  SHELL_RC="$HOME/.profile"
fi

# Add to shell config if not present
if grep -q "NODE_AUTH_TOKEN.*gh auth token" "$SHELL_RC" 2>/dev/null; then
  echo "✓ Shell already configured"
else
  echo "📝 Configuring $SHELL_RC..."
  echo '' >> "$SHELL_RC"
  echo '# GitHub npm authentication (auto-generated)' >> "$SHELL_RC"
  echo 'export NODE_AUTH_TOKEN=$(gh auth token 2>/dev/null)' >> "$SHELL_RC"
  echo "✓ Updated $SHELL_RC"
fi

# Configure npm
echo "⚙️  Configuring npm..."
NPMRC="$HOME/.npmrc"
mkdir -p "$(dirname "$NPMRC")"
touch "$NPMRC"

# Add registry config if not present
if ! grep -q "@MikeC:registry" "$NPMRC" 2>/dev/null; then
  {
    echo "//npm.pkg.github.com/:_authToken=\${NODE_AUTH_TOKEN}"
    echo "@MikeC:registry=https://npm.pkg.github.com/"
    echo "always-auth=true"
  } >> "$NPMRC"
  echo "✓ Configured ~/.npmrc"
else
  echo "✓ ~/.npmrc already configured"
fi

# Apply to current session
export NODE_AUTH_TOKEN=$(gh auth token)

echo ""
echo "✅ Setup complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "To use immediately in THIS terminal:"
echo "  source $SHELL_RC"
echo ""
echo "Or just open a NEW terminal and run:"
echo "  npm install @MikeC/mcp-server-kit"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
