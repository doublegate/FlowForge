#!/bin/bash
# Create a distributable .flatpak bundle

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

APP_ID="io.github.flowforge.FlowForge"
REPO_DIR="$PROJECT_ROOT/repo"
BUNDLE_NAME="$PROJECT_ROOT/FlowForge.flatpak"

echo "Creating Flatpak bundle..."

# First build and export to repo
"$SCRIPT_DIR/build-flatpak.sh" --export

# Create bundle
cd "$PROJECT_ROOT"
flatpak build-bundle "$REPO_DIR" "$BUNDLE_NAME" "$APP_ID"

if [ $? -eq 0 ]; then
    echo "✓ Bundle created: $BUNDLE_NAME"
    echo ""
    echo "To install the bundle on another system:"
    echo "  flatpak install --user $BUNDLE_NAME"
else
    echo "✗ Failed to create bundle"
    exit 1
fi