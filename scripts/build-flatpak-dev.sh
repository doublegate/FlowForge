#!/bin/bash
# Development Flatpak build - builds locally without the full Flatpak infrastructure

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo -e "${BLUE}FlowForge Development Build${NC}"
echo "=============================="

# Create build directory structure
BUILD_ROOT="$PROJECT_ROOT/flatpak-build"
rm -rf "$BUILD_ROOT"
mkdir -p "$BUILD_ROOT/app/flowforge"
mkdir -p "$BUILD_ROOT/app/bin"
mkdir -p "$BUILD_ROOT/app/share/applications"
mkdir -p "$BUILD_ROOT/app/share/icons/hicolor/256x256/apps"

echo -e "\n${YELLOW}Building frontend...${NC}"
cd "$PROJECT_ROOT/frontend"
npm install --no-fund --no-audit
npm run build
cp -r dist "$BUILD_ROOT/app/flowforge/frontend"

echo -e "\n${YELLOW}Copying backend...${NC}"
cd "$PROJECT_ROOT/backend"
cp -r . "$BUILD_ROOT/app/flowforge/backend"
cd "$BUILD_ROOT/app/flowforge/backend"
npm install --production --no-fund --no-audit

echo -e "\n${YELLOW}Copying electron wrapper...${NC}"
cd "$PROJECT_ROOT/electron"
cp -r . "$BUILD_ROOT/app/flowforge/electron"
cd "$BUILD_ROOT/app/flowforge/electron"
npm install --production --no-fund --no-audit

echo -e "\n${YELLOW}Creating launcher...${NC}"
cat > "$BUILD_ROOT/app/bin/flowforge" << 'EOF'
#!/bin/bash
export NODE_ENV=production

# Create user directories
USER_DATA="$HOME/.flowforge"
mkdir -p "$USER_DATA/config"
mkdir -p "$USER_DATA/data"

# Check for config
if [ ! -f "$USER_DATA/config/.env" ]; then
    echo "Creating default configuration..."
    cat > "$USER_DATA/config/.env" << 'ENVEOF'
# FlowForge Configuration
MONGODB_URI=mongodb://localhost:27017/flowforge
NODE_ENV=production
PORT=3002
FRONTEND_URL=http://localhost:5173
SESSION_SECRET=$(openssl rand -base64 32)

# Add your API keys here:
# GITHUB_TOKEN=your_github_token
# OPENAI_API_KEY=your_openai_key
ENVEOF
    echo "Configuration created at: $USER_DATA/config/.env"
    echo "Please edit this file to add your API keys."
fi

# Start backend
cd /app/flowforge/backend
node server.js &
BACKEND_PID=$!

# Wait for backend
sleep 2

# Start Electron app
cd /app/flowforge/electron
electron main.js

# Cleanup
kill $BACKEND_PID 2>/dev/null || true
EOF
chmod +x "$BUILD_ROOT/app/bin/flowforge"

echo -e "\n${YELLOW}Creating desktop file...${NC}"
cat > "$BUILD_ROOT/app/share/applications/flowforge.desktop" << 'EOF'
[Desktop Entry]
Name=FlowForge
Comment=Visual GitHub Actions Workflow Builder
Exec=/app/bin/flowforge
Icon=flowforge
Terminal=false
Type=Application
Categories=Development;IDE;
MimeType=text/yaml;application/x-yaml;
EOF

# Copy icon
cp "$PROJECT_ROOT/images/icon.png" "$BUILD_ROOT/app/share/icons/hicolor/256x256/apps/flowforge.png"

echo -e "\n${YELLOW}Creating run script...${NC}"
cat > "$PROJECT_ROOT/run-flowforge.sh" << 'EOF'
#!/bin/bash
# Run FlowForge from the build directory

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BUILD_ROOT="$SCRIPT_DIR/flatpak-build"

export PATH="$BUILD_ROOT/app/bin:$PATH"
export NODE_ENV=production

cd "$BUILD_ROOT/app/flowforge/backend"
node server.js &
BACKEND_PID=$!

sleep 2

cd "$BUILD_ROOT/app/flowforge/electron"
npx electron main.js

kill $BACKEND_PID 2>/dev/null || true
EOF
chmod +x "$PROJECT_ROOT/run-flowforge.sh"

echo -e "\n${GREEN}Build complete!${NC}"
echo -e "\nThe application has been built in: ${BLUE}$BUILD_ROOT${NC}"
echo -e "\nTo run FlowForge:"
echo -e "  ${BLUE}./run-flowforge.sh${NC}"
echo -e "\nTo create a proper Flatpak bundle, you'll need to:"
echo -e "1. Fix the npm offline sources generation"
echo -e "2. Use the full flatpak-builder with the manifest"