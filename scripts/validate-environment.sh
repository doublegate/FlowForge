#!/bin/bash
# Validate FlowForge Flatpak environment

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

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
if [ -f "$SCRIPT_DIR/io.github.flowforge.FlowForge.yml" ]; then
    echo "✓ Found"
else
    echo "✗ Not found"
    ((ERRORS++))
fi

echo -n "  Backend directory... "
if [ -d "$PROJECT_ROOT/backend" ]; then
    echo "✓ Found"
else
    echo "✗ Not found"
    ((ERRORS++))
fi

echo -n "  Frontend directory... "
if [ -d "$PROJECT_ROOT/frontend" ]; then
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