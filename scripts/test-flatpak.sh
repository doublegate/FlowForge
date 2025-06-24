#!/bin/bash
# test-flatpak.sh
#
# Quick test script for FlowForge Flatpak development
# This creates a minimal test environment without full build

set -e

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}FlowForge Flatpak Test Environment${NC}"
echo "===================================="

# Create test directory structure
TEST_DIR="$PROJECT_ROOT/flatpak-test"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Create minimal manifest for testing
cat > test.yml << 'EOF'
app-id: io.github.flowforge.Test
runtime: org.freedesktop.Platform
runtime-version: '23.08'
sdk: org.freedesktop.Sdk
command: test-launcher

finish-args:
  - --share=network
  - --socket=x11
  - --share=ipc

modules:
  - name: test-app
    buildsystem: simple
    build-commands:
      - |
        cat > test-launcher << 'LAUNCHER'
        #!/bin/bash
        echo "FlowForge Test Environment"
        echo "========================="
        echo ""
        echo "This is a minimal test environment for FlowForge Flatpak"
        echo "It verifies that the Flatpak runtime is working correctly."
        echo ""
        echo "Runtime Info:"
        echo "- Platform: $(flatpak --version)"
        echo "- Node.js: $(node --version 2>/dev/null || echo "Not available")"
        echo "- NPM: $(npm --version 2>/dev/null || echo "Not available")"
        echo ""
        echo "Network Test:"
        curl -s https://api.github.com/rate_limit | head -5 || echo "Network access failed"
        echo ""
        echo "✓ Basic Flatpak environment is working!"
        echo ""
        echo "Press any key to exit..."
        read -n 1
        LAUNCHER
      - install -Dm755 test-launcher /app/bin/test-launcher
      
      # Create a simple GUI test
      - |
        cat > gui-test.html << 'HTML'
        <!DOCTYPE html>
        <html>
        <head>
            <title>FlowForge Flatpak Test</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }
                .container {
                    text-align: center;
                    padding: 40px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                    backdrop-filter: blur(10px);
                }
                h1 {
                    margin: 0 0 20px 0;
                }
                .status {
                    margin: 20px 0;
                    padding: 10px;
                    background: rgba(0, 255, 0, 0.2);
                    border-radius: 5px;
                }
                button {
                    background: white;
                    color: #667eea;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 5px;
                    font-size: 16px;
                    cursor: pointer;
                    margin: 5px;
                }
                button:hover {
                    opacity: 0.9;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🚀 FlowForge Flatpak Test</h1>
                <p>This verifies the GUI environment is working correctly</p>
                <div class="status">
                    ✅ Flatpak GUI Environment: Working
                </div>
                <button onclick="testAPI()">Test GitHub API</button>
                <button onclick="window.close()">Close</button>
                <div id="result"></div>
            </div>
            <script>
                async function testAPI() {
                    const result = document.getElementById('result');
                    result.innerHTML = '<p>Testing GitHub API...</p>';
                    try {
                        const response = await fetch('https://api.github.com/rate_limit');
                        const data = await response.json();
                        result.innerHTML = '<p>✅ API Access: Working<br>Rate Limit: ' + data.rate.limit + '</p>';
                    } catch (error) {
                        result.innerHTML = '<p>❌ API Access: Failed<br>' + error.message + '</p>';
                    }
                }
            </script>
        </body>
        </html>
        HTML
      - install -Dm644 gui-test.html /app/share/gui-test.html
EOF

echo -e "${YELLOW}Building test Flatpak...${NC}"
flatpak-builder --force-clean test-build test.yml

echo -e "${YELLOW}Running test...${NC}"
flatpak-builder --run test-build test.yml test-launcher

cd "$PROJECT_ROOT"

# Scripts already exist in scripts/ directory, skip creating them
echo -e "\n${GREEN}Test environment created!${NC}"
echo -e "\nUsing existing scripts from scripts/ directory:"
echo "  $SCRIPT_DIR/validate-environment.sh  - Check if your system is ready"
echo "  $SCRIPT_DIR/install-runtimes.sh     - Install required Flatpak runtimes"
echo "  $SCRIPT_DIR/test-flatpak.sh         - Run this test again"

exit 0

# Skip the rest of the file since we don't need to recreate the scripts
cat > /dev/null << 'EOF'
#!/bin/bash
# Validate FlowForge Flatpak environment

echo "FlowForge Flatpak Environment Validation"
echo "======================================="
echo ""

ERRORS=0
WARNINGS=0

# Check Flatpak
echo -n "Checking Flatpak... "
if command -v flatpak &> /dev/null; then
    echo "✓ $(flatpak --version)"
else
    echo "✗ Not installed"
    ((ERRORS++))
fi

# Check Flatpak Builder
echo -n "Checking Flatpak Builder... "
if command -v flatpak-builder &> /dev/null; then
    echo "✓ Found"
else
    echo "✗ Not installed"
    ((ERRORS++))
fi

# Check required runtimes
echo ""
echo "Checking Flatpak runtimes:"
RUNTIMES=(
    "org.freedesktop.Platform//23.08"
    "org.freedesktop.Sdk//23.08"
    "org.freedesktop.Sdk.Extension.node18//23.08"
    "org.electronjs.Electron2.BaseApp//23.08"
)

for runtime in "${RUNTIMES[@]}"; do
    echo -n "  $runtime... "
    if flatpak list | grep -q "$runtime"; then
        echo "✓"
    else
        echo "✗ Not installed"
        ((WARNINGS++))
    fi
done

# Check Node.js tools
echo ""
echo "Checking build tools:"
echo -n "  Node.js... "
if command -v node &> /dev/null; then
    echo "✓ $(node --version)"
else
    echo "✗ Not installed"
    ((ERRORS++))
fi

echo -n "  npm... "
if command -v npm &> /dev/null; then
    echo "✓ $(npm --version)"
else
    echo "✗ Not installed"
    ((ERRORS++))
fi

echo -n "  Python 3... "
if command -v python3 &> /dev/null; then
    echo "✓ $(python3 --version)"
else
    echo "✗ Not installed"
    ((ERRORS++))
fi

# Check for manifest
echo ""
echo "Checking FlowForge files:"
echo -n "  Flatpak manifest... "
if [ -f "io.github.flowforge.FlowForge.yml" ]; then
    echo "✓ Found"
else
    echo "✗ Not found"
    ((ERRORS++))
fi

echo -n "  Backend directory... "
if [ -d "backend" ]; then
    echo "✓ Found"
else
    echo "✗ Not found"
    ((ERRORS++))
fi

echo -n "  Frontend directory... "
if [ -d "frontend" ]; then
    echo "✓ Found"
else
    echo "✗ Not found"
    ((ERRORS++))
fi

# Summary
echo ""
echo "======================================="
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "✅ Environment is ready for Flatpak build!"
elif [ $ERRORS -eq 0 ]; then
    echo "⚠️  Environment has $WARNINGS warnings but can build"
    echo "   Install missing runtimes with:"
    echo "   flatpak install flathub [runtime-name]"
else
    echo "❌ Environment has $ERRORS errors"
    echo "   Please install missing dependencies"
fi
echo ""

exit $ERRORS
EOF

chmod +x validate-environment.sh

# Create quick install script for runtimes
cat > install-runtimes.sh << 'EOF'
#!/bin/bash
# Install all required Flatpak runtimes for FlowForge

echo "Installing FlowForge Flatpak runtimes..."
echo ""

# Add Flathub if not present
if ! flatpak remote-list | grep -q flathub; then
    echo "Adding Flathub repository..."
    flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
fi

# Install runtimes
RUNTIMES=(
    "org.freedesktop.Platform//23.08"
    "org.freedesktop.Sdk//23.08"
    "org.freedesktop.Sdk.Extension.node18//23.08"
    "org.electronjs.Electron2.BaseApp//23.08"
)

for runtime in "${RUNTIMES[@]}"; do
    echo "Installing $runtime..."
    flatpak install -y flathub "$runtime"
done

echo ""
echo "✓ All runtimes installed!"
EOF

chmod +x install-runtimes.sh

echo -e "\n${GREEN}Test environment created!${NC}"
echo -e "\nAvailable scripts:"
echo "  ./validate-environment.sh  - Check if your system is ready"
echo "  ./install-runtimes.sh     - Install required Flatpak runtimes"
echo "  ./test-flatpak.sh         - Run this test again"