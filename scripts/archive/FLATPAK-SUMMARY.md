# FlowForge Flatpak Files - Updated Structure

This document summarizes the new structure after moving Flatpak files to the `scripts/` directory.

## Main Files (in scripts/ directory)

1. **scripts/io.github.flowforge.FlowForge.yml** - Main Flatpak manifest
   - Defines the complete Flatpak package structure
   - Includes MongoDB, Node.js backend, React frontend, and Electron wrapper
   - Sets up proper sandboxing permissions

2. **scripts/io.github.flowforge.FlowForge.devel.yml** - Development manifest
   - Simplified version for testing
   - Uses mock services instead of real MongoDB
   - No API key requirements

3. **docs/FLATPAK-BUILD.md** - Comprehensive build documentation
   - Step-by-step build instructions
   - Troubleshooting guide
   - Configuration details
   - Updated with new script paths

## Build Scripts (all in scripts/ directory)

4. **scripts/build-flatpak.sh** - Main build script
   - Automates the entire build process
   - Options: --install, --run, --export
   - Handles dependency generation
   - Updated to use proper relative paths

5. **scripts/flatpak-node-generator.py** - NPM source generator
   - Converts package-lock.json to Flatpak sources
   - Required for offline builds
   - Simple implementation for npm packages

6. **scripts/create-bundle.sh** - Bundle creation script
   - Creates distributable .flatpak file
   - Exports to repository format first
   - Generates FlowForge.flatpak in project root

7. **scripts/setup-config.sh** - Configuration helper
   - Interactive API key configuration
   - Creates .env file in Flatpak data directory
   - For post-installation setup

8. **scripts/validate-environment.sh** - Environment checker
   - Validates build prerequisites
   - Checks for required tools and runtimes
   - Provides clear error/warning messages
   - Updated to check for files in correct locations

9. **scripts/install-runtimes.sh** - Runtime installer
   - Installs all required Flatpak runtimes
   - Adds Flathub repository if needed
   - One-command runtime setup

10. **scripts/test-flatpak.sh** - Test environment script
    - Creates minimal test Flatpak
    - Validates basic functionality
    - Quick sanity check
    - Updated to reference scripts in new location

## Supporting Files

11. **electron/package.json** - Electron wrapper config
    - Defines Electron dependencies
    - Required for desktop integration

## How to Build

Quick start:
```bash
./scripts/validate-environment.sh  # Check prerequisites
./scripts/install-runtimes.sh      # Install Flatpak runtimes
./scripts/build-flatpak.sh --install --run  # Build and run
```

Create distributable:
```bash
./scripts/create-bundle.sh  # Creates FlowForge.flatpak
```

## Next Steps

1. Ensure MongoDB is not running (the Flatpak will run its own)
2. Add your API keys to .env or use setup-config.sh after installation
3. Test the Flatpak build with `./build-flatpak.sh --install --run`
4. For distribution, use `./create-bundle.sh` to create a .flatpak file

## Notes

- The Flatpak includes its own MongoDB instance
- All data is stored in ~/.var/app/io.github.flowforge.FlowForge/
- The Electron wrapper provides desktop integration
- API keys are configured post-installation for security