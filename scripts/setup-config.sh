#!/bin/bash
# Setup configuration for FlowForge Flatpak
#
# This script helps users configure API keys after installation

APP_ID="io.github.flowforge.FlowForge"
CONFIG_DIR="$HOME/.var/app/$APP_ID/config/flowforge"

echo "FlowForge Configuration Setup"
echo "============================="
echo ""

# Create config directory
mkdir -p "$CONFIG_DIR"

# Check if config exists
if [ -f "$CONFIG_DIR/.env" ]; then
    echo "Configuration already exists at: $CONFIG_DIR/.env"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

# Get GitHub token
echo ""
echo "GitHub Personal Access Token"
echo "Create one at: https://github.com/settings/tokens"
echo "Required scopes: repo (for reading action metadata)"
read -p "Enter your GitHub token: " GITHUB_TOKEN

# Get OpenAI API key
echo ""
echo "OpenAI API Key (for AI features)"
echo "Get your key at: https://platform.openai.com/api-keys"
echo "Note: AI features are optional. Press Enter to skip."
read -p "Enter your OpenAI API key: " OPENAI_API_KEY

# Write configuration
cat > "$CONFIG_DIR/.env" << EOL
# FlowForge Configuration
# Generated on $(date)

# GitHub API Token
GITHUB_TOKEN=$GITHUB_TOKEN

# OpenAI API Key (optional)
OPENAI_API_KEY=$OPENAI_API_KEY

# MongoDB (managed by Flatpak)
MONGODB_URI=mongodb://localhost:27017/flowforge

# Server Configuration
NODE_ENV=production
PORT=3002
EOL

echo ""
echo "✓ Configuration saved to: $CONFIG_DIR/.env"
echo ""
echo "You can now run FlowForge with:"
echo "  flatpak run $APP_ID"