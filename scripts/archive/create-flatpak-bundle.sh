#!/bin/bash
# Create a Flatpak bundle from the existing build

set -e

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Configuration
APP_ID="io.github.flowforge.FlowForge"
BUNDLE_NAME="FlowForge.flatpak"
REPO_DIR="$PROJECT_ROOT/flatpak-repo"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Creating FlowForge Flatpak Bundle${NC}"
echo "===================================="

# Build with the simple manifest that already exists
echo -e "\n${YELLOW}Building Flatpak...${NC}"
cd "$PROJECT_ROOT"
flatpak-builder --repo="$REPO_DIR" --force-clean build-dir "$SCRIPT_DIR/io.github.flowforge.FlowForge.online.yml"

# Create bundle
echo -e "\n${YELLOW}Creating bundle...${NC}"
flatpak build-bundle "$REPO_DIR" "$PROJECT_ROOT/$BUNDLE_NAME" "$APP_ID"

if [ -f "$BUNDLE_NAME" ]; then
    echo -e "\n${GREEN}✓ Bundle created successfully!${NC}"
    echo -e "Bundle location: ${BLUE}$(pwd)/$BUNDLE_NAME${NC}"
    echo -e "\nTo install this bundle on any system:"
    echo -e "  ${BLUE}flatpak install --user $BUNDLE_NAME${NC}"
    echo -e "\nTo run after installation:"
    echo -e "  ${BLUE}flatpak run $APP_ID${NC}"
else
    echo -e "\n${RED}✗ Failed to create bundle${NC}"
    exit 1
fi