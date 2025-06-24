# FlowForge Build Scripts

**Last Updated**: 2025-06-24

This directory contains the unified build system for FlowForge, supporting both distributable packages and Flatpak desktop applications.

## Main Build Script

### build-flowforge.sh

The primary build script with three modes:

```bash
./build-flowforge.sh           # Create distributable package (default)
./build-flowforge.sh --flatpak # Build as Flatpak
./build-flowforge.sh --dev     # Quick development build
./build-flowforge.sh --help    # Show usage
```

## Core Scripts

### package-flowforge.sh

Creates a distributable tar.gz package with installer:

- Builds frontend and backend
- Includes all dependencies
- Creates installer script
- Output: `flowforge-0.2.1-linux-x64.tar.gz`

### build-flatpak.sh

Full Flatpak build with offline npm sources:

- Generates npm source files for offline builds
- Creates proper Flatpak bundle
- Options: `--install`, `--run`, `--export`

### build-flatpak-dev.sh

Quick development build without Flatpak infrastructure:

- Builds to `flatpak-build/` directory
- Creates `run-flowforge.sh` for testing
- No Flatpak runtime required

## Support Scripts

### flatpak-node-generator.py

Converts package-lock.json to Flatpak sources for offline builds

### validate-environment.sh

Checks build prerequisites and environment

### install-runtimes.sh

Installs required Flatpak runtimes

### setup-config.sh

Interactive configuration for API keys

## Manifest Files

### io.github.flowforge.FlowForge.yml

Main Flatpak manifest with full application definition

### io.github.flowforge.FlowForge.devel.yml

Development manifest with mock services

## Generated Files

These files are generated during builds:

- `generated-sources-backend.json` - Backend npm packages
- `generated-sources-frontend.json` - Frontend npm packages
- `flowforge-electron-sources.json` - Electron packages

## Quick Start

For most users, simply run:

```bash
# From project root
./scripts/build-flowforge.sh
```

This creates a complete distributable package (`flowforge-0.2.1-linux-x64.tar.gz`) that can be installed on any Linux system with a single command.

### Build Status

✅ **Complete unified build system implemented (2025-06-24)**
- Single entry point with multiple build modes
- Production-ready distributable packages
- Comprehensive Flatpak support
- All scripts consolidated and organized

## Archive

The `archive/` subdirectory contains reference files and intermediate scripts from development.
