#!/bin/bash
# build-flowforge.sh - Main build script for FlowForge
#
# This script provides multiple build options:
# 1. Flatpak build (requires Flatpak infrastructure)
# 2. Package build (creates distributable tar.gz)
# 3. Development build (local testing)
#
# Usage: ./build-flowforge.sh [OPTION]
# Options:
#   --flatpak    Build as Flatpak (requires flatpak-builder)
#   --package    Create distributable package (default)
#   --dev        Build for development/testing
#   --help       Show this help message

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Default to package build
BUILD_TYPE="package"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --flatpak)
            BUILD_TYPE="flatpak"
            shift
            ;;
        --package)
            BUILD_TYPE="package"
            shift
            ;;
        --dev)
            BUILD_TYPE="dev"
            shift
            ;;
        --help)
            echo "FlowForge Build Script"
            echo ""
            echo "Usage: $0 [OPTION]"
            echo ""
            echo "Options:"
            echo "  --flatpak    Build as Flatpak (requires flatpak-builder)"
            echo "  --package    Create distributable package (default)"
            echo "  --dev        Build for development/testing"
            echo "  --help       Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                  # Create distributable package"
            echo "  $0 --flatpak        # Build Flatpak"
            echo "  $0 --dev            # Quick development build"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}FlowForge Build System${NC}"
echo "======================="
echo -e "Build type: ${YELLOW}$BUILD_TYPE${NC}"
echo ""

case $BUILD_TYPE in
    flatpak)
        echo -e "${YELLOW}Starting Flatpak build...${NC}"
        if ! command -v flatpak-builder &> /dev/null; then
            echo -e "${RED}Error: flatpak-builder not found${NC}"
            echo "Please install Flatpak development tools"
            exit 1
        fi
        
        # Check for generated sources
        if [ ! -f "$SCRIPT_DIR/generated-sources-backend.json" ] || [ ! -f "$SCRIPT_DIR/generated-sources-frontend.json" ]; then
            echo -e "${YELLOW}Generating npm sources...${NC}"
            "$SCRIPT_DIR/build-flatpak.sh" --export
        else
            echo -e "${GREEN}Using existing npm sources${NC}"
            "$SCRIPT_DIR/build-flatpak.sh" --install --run
        fi
        ;;
        
    package)
        echo -e "${YELLOW}Creating distribution package...${NC}"
        "$SCRIPT_DIR/package-flowforge.sh"
        ;;
        
    dev)
        echo -e "${YELLOW}Building for development...${NC}"
        "$SCRIPT_DIR/build-flatpak-dev.sh"
        echo -e "\n${GREEN}Development build complete!${NC}"
        echo -e "Run with: ${BLUE}./run-flowforge.sh${NC}"
        ;;
        
    *)
        echo -e "${RED}Invalid build type: $BUILD_TYPE${NC}"
        exit 1
        ;;
esac

echo -e "\n${GREEN}Build completed successfully!${NC}"