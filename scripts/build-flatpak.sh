#!/bin/bash
# build-flatpak.sh
#
# Script to build the FlowForge Flatpak package
# This script handles dependency generation and the build process
#
# Usage: ./build-flatpak.sh [--install] [--run]
#
# Options:
#   --install    Install the Flatpak after building
#   --run        Run the application after installation
#   --export     Export to repository format

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_ID="io.github.flowforge.FlowForge"
MANIFEST="io.github.flowforge.FlowForge.yml"
BUILD_DIR="build-dir"
REPO_DIR="repo"

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Parse command line arguments
INSTALL=false
RUN=false
EXPORT=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --install)
            INSTALL=true
            shift
            ;;
        --run)
            RUN=true
            INSTALL=true  # Running requires installation
            shift
            ;;
        --export)
            EXPORT=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}FlowForge Flatpak Builder${NC}"
echo "================================"

# Check for required tools
echo -e "\n${YELLOW}Checking dependencies...${NC}"

check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}Error: $1 is not installed${NC}"
        echo "Please install $1 and try again"
        exit 1
    else
        echo -e "${GREEN}✓${NC} $1 found"
    fi
}

check_command flatpak
check_command flatpak-builder
check_command npm
check_command node

# Install required Flatpak runtimes and SDKs
echo -e "\n${YELLOW}Installing Flatpak runtimes...${NC}"
flatpak install -y flathub org.freedesktop.Platform//23.08 || true
flatpak install -y flathub org.freedesktop.Sdk//23.08 || true
flatpak install -y flathub org.freedesktop.Sdk.Extension.node18//23.08 || true
flatpak install -y flathub org.electronjs.Electron2.BaseApp//23.08 || true

# Generate node sources for offline builds
echo -e "\n${YELLOW}Generating Node.js dependency sources...${NC}"

# Check for flatpak-node-generator.py in scripts directory
if [ ! -f "$SCRIPT_DIR/flatpak-node-generator.py" ]; then
    echo -e "${RED}Error: flatpak-node-generator.py not found in scripts directory${NC}"
    exit 1
fi

# Generate sources for backend
echo -e "${BLUE}Generating backend sources...${NC}"
cd "$PROJECT_ROOT/backend"
python3 "$SCRIPT_DIR/flatpak-node-generator.py" npm package-lock.json -o "$SCRIPT_DIR/generated-sources-backend.json"
cd "$PROJECT_ROOT"

# Generate sources for frontend
echo -e "${BLUE}Generating frontend sources...${NC}"
cd "$PROJECT_ROOT/frontend"
python3 "$SCRIPT_DIR/flatpak-node-generator.py" npm package-lock.json -o "$SCRIPT_DIR/generated-sources-frontend.json"
cd "$PROJECT_ROOT"

# Create minimal Electron package.json and generate sources
echo -e "${BLUE}Generating Electron sources...${NC}"
cd "$PROJECT_ROOT"
mkdir -p electron-temp
cat > electron-temp/package.json << 'EOF'
{
  "name": "flowforge-electron",
  "version": "1.0.0",
  "main": "main.js",
  "dependencies": {
    "electron": "^28.1.0"
  }
}
EOF

cd electron-temp
npm install --package-lock-only
python3 "$SCRIPT_DIR/flatpak-node-generator.py" npm package-lock.json -o "$SCRIPT_DIR/flowforge-electron-sources.json"
cd "$PROJECT_ROOT"
rm -rf electron-temp

# Clean previous build
echo -e "\n${YELLOW}Cleaning previous build...${NC}"
rm -rf "$BUILD_DIR" "$REPO_DIR" .flatpak-builder

# Build the Flatpak
echo -e "\n${YELLOW}Building Flatpak...${NC}"
cd "$PROJECT_ROOT"
flatpak-builder --force-clean "$BUILD_DIR" "$SCRIPT_DIR/$MANIFEST"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build completed successfully!${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi

# Install if requested
if [ "$INSTALL" = true ]; then
    echo -e "\n${YELLOW}Installing Flatpak...${NC}"
    flatpak-builder --user --install --force-clean "$BUILD_DIR" "$SCRIPT_DIR/$MANIFEST"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Installation completed!${NC}"
    else
        echo -e "${RED}✗ Installation failed${NC}"
        exit 1
    fi
fi

# Export to repository if requested
if [ "$EXPORT" = true ]; then
    echo -e "\n${YELLOW}Exporting to repository...${NC}"
    flatpak-builder --repo="$REPO_DIR" --force-clean "$BUILD_DIR" "$SCRIPT_DIR/$MANIFEST"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Exported to repository!${NC}"
        echo -e "${BLUE}You can now distribute the .flatpak file:${NC}"
        echo "flatpak build-bundle $REPO_DIR flowforge.flatpak $APP_ID"
    fi
fi

# Run if requested
if [ "$RUN" = true ]; then
    echo -e "\n${YELLOW}Starting FlowForge...${NC}"
    flatpak run "$APP_ID"
fi

echo -e "\n${GREEN}Done!${NC}"

# Print usage instructions
if [ "$INSTALL" = false ]; then
    echo -e "\n${BLUE}To install and run:${NC}"
    echo "  ./build-flatpak.sh --install --run"
    echo -e "\n${BLUE}Or manually:${NC}"
    echo "  flatpak-builder --user --install --force-clean $BUILD_DIR $MANIFEST"
    echo "  flatpak run $APP_ID"
fi

# Create a bundle creation script
cat > "$SCRIPT_DIR/create-bundle.sh" << 'EOF'
#!/bin/bash
# Create a distributable .flatpak bundle

APP_ID="io.github.flowforge.FlowForge"
REPO_DIR="repo"
BUNDLE_NAME="FlowForge.flatpak"

echo "Creating Flatpak bundle..."

# First build and export to repo
./build-flatpak.sh --export

# Create bundle
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
EOF

chmod +x create-bundle.sh

# Create configuration setup script
cat > "$SCRIPT_DIR/setup-config.sh" << 'EOF'
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
PORT=3001
EOL

echo ""
echo "✓ Configuration saved to: $CONFIG_DIR/.env"
echo ""
echo "You can now run FlowForge with:"
echo "  flatpak run $APP_ID"
EOF

chmod +x setup-config.sh

# Create a development manifest for easier testing
cat > "$SCRIPT_DIR/io.github.flowforge.FlowForge.devel.yml" << 'EOF'
# Development version of FlowForge Flatpak
# This version includes development tools and doesn't require API keys

app-id: io.github.flowforge.FlowForge.Devel
runtime: org.freedesktop.Platform
runtime-version: '23.08'
sdk: org.freedesktop.Sdk
command: flowforge-launcher

finish-args:
  - --share=network
  - --filesystem=home
  - --device=dri
  - --socket=pulseaudio
  - --socket=x11
  - --share=ipc
  - --socket=wayland
  - --env=NODE_ENV=development
  - --env=FLATPAK_DEVEL=1

modules:
  # Include a mock MongoDB for development
  - name: mongomock
    buildsystem: simple
    build-commands:
      - |
        cat > mongomock.js << 'EOJS'
        // Simple in-memory MongoDB mock for development
        const express = require('express');
        const app = express();
        const port = 27017;
        
        app.use(express.json());
        
        const db = {
          actions: [],
          templates: []
        };
        
        app.post('/flowforge/:collection/insert', (req, res) => {
          db[req.params.collection].push(req.body);
          res.json({ ok: 1 });
        });
        
        app.get('/flowforge/:collection/find', (req, res) => {
          res.json({ docs: db[req.params.collection] });
        });
        
        app.listen(port, () => {
          console.log(`MongoDB mock listening on port ${port}`);
        });
        EOJS
      - install -Dm755 mongomock.js /app/bin/mongomock.js

  # Simplified launcher for development
  - name: flowforge-launcher-devel
    buildsystem: simple
    build-commands:
      - |
        cat > flowforge-launcher << 'EOSH'
        #!/bin/bash
        echo "FlowForge Development Mode"
        echo "========================="
        echo ""
        echo "This is a development version with:"
        echo "- Mock MongoDB"
        echo "- Mock API responses"
        echo "- No API key requirements"
        echo ""
        echo "Starting mock services..."
        
        # Start mock MongoDB
        node /app/bin/mongomock.js &
        MONGO_PID=$!
        
        # Set development environment
        export NODE_ENV=development
        export MOCK_MODE=true
        export MONGODB_URI=mongodb://localhost:27017/flowforge
        
        # Wait for services
        sleep 2
        
        # Start the application
        echo "Starting FlowForge..."
        cd /app
        # Add your application start command here
        
        # Cleanup on exit
        trap "kill $MONGO_PID" EXIT
        
        # Keep running
        wait
        EOSH
      - install -Dm755 flowforge-launcher /app/bin/flowforge-launcher
EOF

echo -e "\n${GREEN}Build scripts created successfully!${NC}"
echo -e "\n${BLUE}Available scripts in scripts/ directory:${NC}"
echo "  $SCRIPT_DIR/build-flatpak.sh      - Build the Flatpak"
echo "  $SCRIPT_DIR/create-bundle.sh      - Create distributable .flatpak file"
echo "  $SCRIPT_DIR/setup-config.sh       - Configure API keys after installation"
echo ""
echo -e "${BLUE}Quick start:${NC}"
echo "  $SCRIPT_DIR/build-flatpak.sh --install --run"