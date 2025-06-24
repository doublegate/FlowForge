#!/bin/bash
# Package FlowForge as a distributable archive

set -e

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

VERSION="0.2.0"
PACKAGE_NAME="flowforge-${VERSION}-linux-x64"
BUILD_DIR="$PROJECT_ROOT/package-build"

echo -e "${BLUE}FlowForge Packager${NC}"
echo "==================="

# Clean previous build
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/$PACKAGE_NAME"

echo -e "\n${YELLOW}Building application...${NC}"

# Use our dev build script first
"$SCRIPT_DIR/build-flatpak-dev.sh"

echo -e "\n${YELLOW}Creating package...${NC}"

# Copy the built application
cp -r "$PROJECT_ROOT/flatpak-build/app/"* "$BUILD_DIR/$PACKAGE_NAME/"

# Create run script
cat > "$BUILD_DIR/$PACKAGE_NAME/run-flowforge.sh" << 'EOF'
#!/bin/bash
# FlowForge launcher script

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
export NODE_ENV=production

# Check for MongoDB
if ! command -v mongod &> /dev/null; then
    echo "Warning: MongoDB is not installed. The application requires MongoDB to run."
    echo "Please install MongoDB before running FlowForge."
    exit 1
fi

# Check for Electron
if ! command -v electron &> /dev/null; then
    echo "Installing Electron locally..."
    cd "$SCRIPT_DIR/flowforge/electron"
    npm install electron
fi

# Start MongoDB if not running
if ! pgrep -x "mongod" > /dev/null; then
    echo "Starting MongoDB..."
    mongod --dbpath "$HOME/.flowforge/mongodb" --logpath "$HOME/.flowforge/mongodb.log" --fork
fi

# Start backend
cd "$SCRIPT_DIR/flowforge/backend"
node server.js &
BACKEND_PID=$!

# Wait for backend
sleep 2

# Start Electron
cd "$SCRIPT_DIR/flowforge/electron"
if command -v electron &> /dev/null; then
    electron main.js
else
    npx electron main.js
fi

# Cleanup
kill $BACKEND_PID 2>/dev/null || true
EOF
chmod +x "$BUILD_DIR/$PACKAGE_NAME/run-flowforge.sh"

# Create install script
cat > "$BUILD_DIR/$PACKAGE_NAME/install.sh" << 'EOF'
#!/bin/bash
# FlowForge installer

echo "FlowForge Installer"
echo "==================="

INSTALL_DIR="$HOME/.local/share/flowforge"
BIN_DIR="$HOME/.local/bin"
DESKTOP_DIR="$HOME/.local/share/applications"
ICON_DIR="$HOME/.local/share/icons/hicolor/256x256/apps"

# Create directories
mkdir -p "$INSTALL_DIR"
mkdir -p "$BIN_DIR"
mkdir -p "$DESKTOP_DIR"
mkdir -p "$ICON_DIR"

# Copy application
echo "Installing FlowForge to $INSTALL_DIR..."
cp -r flowforge "$INSTALL_DIR/"
cp run-flowforge.sh "$INSTALL_DIR/"

# Create launcher in bin
cat > "$BIN_DIR/flowforge" << EOFBIN
#!/bin/bash
exec "$INSTALL_DIR/run-flowforge.sh" "\$@"
EOFBIN
chmod +x "$BIN_DIR/flowforge"

# Install desktop file
if [ -f "share/applications/flowforge.desktop" ]; then
    cp share/applications/flowforge.desktop "$DESKTOP_DIR/"
    sed -i "s|/app/bin/flowforge|$BIN_DIR/flowforge|g" "$DESKTOP_DIR/flowforge.desktop"
fi

# Install icon
if [ -f "share/icons/hicolor/256x256/apps/flowforge.png" ]; then
    cp share/icons/hicolor/256x256/apps/flowforge.png "$ICON_DIR/"
fi

echo ""
echo "Installation complete!"
echo ""
echo "FlowForge has been installed to: $INSTALL_DIR"
echo ""
echo "To run FlowForge:"
echo "  flowforge"
echo ""
echo "Or from the application menu: Look for 'FlowForge'"
echo ""
echo "Make sure MongoDB is installed and running before starting FlowForge."
EOF
chmod +x "$BUILD_DIR/$PACKAGE_NAME/install.sh"

# Create README
cat > "$BUILD_DIR/$PACKAGE_NAME/README.md" << 'EOF'
# FlowForge

Visual GitHub Actions Workflow Builder

## Installation

1. Extract this archive
2. Run `./install.sh` to install FlowForge to your home directory
3. Make sure MongoDB is installed on your system

## Requirements

- Node.js 18+
- MongoDB 4.4+
- Linux desktop environment (X11 or Wayland)

## Running FlowForge

After installation, you can run FlowForge by:
- Running `flowforge` from the terminal
- Launching from your application menu

## Configuration

On first run, FlowForge will create a configuration file at:
`~/.flowforge/config/.env`

Edit this file to add your:
- GitHub Personal Access Token
- OpenAI API Key (optional, for AI features)

## Uninstalling

To uninstall, remove:
- `~/.local/share/flowforge/`
- `~/.local/bin/flowforge`
- `~/.local/share/applications/flowforge.desktop`
- `~/.local/share/icons/hicolor/256x256/apps/flowforge.png`
- `~/.flowforge/` (user data)
EOF

# Create the archive
echo -e "\n${YELLOW}Creating archive...${NC}"
cd "$BUILD_DIR"
tar czf "$PROJECT_ROOT/${PACKAGE_NAME}.tar.gz" "$PACKAGE_NAME"
cd "$PROJECT_ROOT"

# Create AppImage (if tools available)
if command -v appimagetool &> /dev/null; then
    echo -e "\n${YELLOW}Creating AppImage...${NC}"
    
    # Create AppDir structure
    APPDIR="$BUILD_DIR/FlowForge.AppDir"
    mkdir -p "$APPDIR"
    cp -r "$BUILD_DIR/$PACKAGE_NAME/"* "$APPDIR/"
    
    # Create AppRun
    cat > "$APPDIR/AppRun" << 'EOF'
#!/bin/bash
APPDIR="$(dirname "$(readlink -f "$0")")"
exec "$APPDIR/run-flowforge.sh" "$@"
EOF
    chmod +x "$APPDIR/AppRun"
    
    # Create desktop file for AppImage
    cat > "$APPDIR/flowforge.desktop" << 'EOF'
[Desktop Entry]
Name=FlowForge
Comment=Visual GitHub Actions Workflow Builder
Exec=AppRun
Icon=flowforge
Terminal=false
Type=Application
Categories=Development;IDE;
EOF
    
    # Copy icon
    cp "$APPDIR/share/icons/hicolor/256x256/apps/flowforge.png" "$APPDIR/flowforge.png" 2>/dev/null || true
    
    # Build AppImage
    appimagetool "$APPDIR" "$PROJECT_ROOT/FlowForge-${VERSION}-x86_64.AppImage"
fi

# Cleanup
rm -rf "$BUILD_DIR"

echo -e "\n${GREEN}✓ Packaging complete!${NC}"
echo -e "\nCreated: ${BLUE}${PACKAGE_NAME}.tar.gz${NC}"
ls -lh "${PACKAGE_NAME}.tar.gz"

if [ -f "FlowForge-${VERSION}-x86_64.AppImage" ]; then
    echo -e "\nAlso created: ${BLUE}FlowForge-${VERSION}-x86_64.AppImage${NC}"
    ls -lh "FlowForge-${VERSION}-x86_64.AppImage"
fi

echo -e "\nTo distribute FlowForge, share the tar.gz file."
echo -e "Users can extract and run ${BLUE}./install.sh${NC} to install."