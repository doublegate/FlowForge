# Building FlowForge as a Flatpak

**Last Updated**: 2025-06-24

This guide explains how to build FlowForge as a Flatpak package for easy distribution and sandboxed execution. FlowForge now includes a complete unified build system for desktop distribution.

## Prerequisites

1. **Install Flatpak and Flatpak Builder**:

   ```bash
   # Ubuntu/Debian
   sudo apt install flatpak flatpak-builder

   # Fedora
   sudo dnf install flatpak flatpak-builder

   # Arch
   sudo pacman -S flatpak flatpak-builder
   ```

2. **Add Flathub repository**:

   ```bash
   flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
   ```

3. **Install required tools**:

   ```bash
   # Node.js and npm for generating sources
   sudo apt install nodejs npm  # or equivalent for your distro

   # Python for node source generator
   sudo apt install python3
   ```

## Quick Build

FlowForge now includes a unified build system. The easiest way to build and run FlowForge:

```bash
# Build distributable package (recommended)
./scripts/build-flowforge.sh

# Or build and install Flatpak directly
./scripts/build-flatpak.sh --install --run
```

**Unified Build System Features:**

- Single entry point with `build-flowforge.sh`
- Automatic generation of distributable packages
- All build scripts consolidated in `scripts/` directory
- Enhanced error handling and validation
- Support for both development and production builds

The build scripts will:

- Install required Flatpak runtimes
- Generate offline sources for npm packages
- Build the Flatpak
- Create distributable package (`flowforge-0.2.0-linux-x64.tar.gz`)
- Optionally install and launch FlowForge

## Manual Build Process

### 1. Install Flatpak Runtimes

```bash
# Use the automated script (recommended)
./scripts/install-runtimes.sh

# Or install manually
flatpak install -y flathub org.freedesktop.Platform//23.08
flatpak install -y flathub org.freedesktop.Sdk//23.08
flatpak install -y flathub org.freedesktop.Sdk.Extension.node18//23.08
flatpak install -y flathub org.electronjs.Electron2.BaseApp//23.08
```

### 2. Generate NPM Sources

For offline builds, we need to generate source files for all npm dependencies:

```bash
# Backend dependencies
cd backend
python3 ../scripts/flatpak-node-generator.py npm package-lock.json -o ../generated-sources-backend.json
cd ..

# Frontend dependencies
cd frontend
python3 ../scripts/flatpak-node-generator.py npm package-lock.json -o ../generated-sources-frontend.json
cd ..
```

### 3. Build the Flatpak

```bash
flatpak-builder --force-clean build-dir scripts/io.github.flowforge.FlowForge.yml
```

### 4. Install Locally

```bash
flatpak-builder --user --install --force-clean build-dir scripts/io.github.flowforge.FlowForge.yml
```

### 5. Run FlowForge

```bash
flatpak run io.github.flowforge.FlowForge
```

## Creating a Distributable Bundle

FlowForge includes automated bundle creation as part of the unified build system:

```bash
# Create complete distributable package
./scripts/build-flowforge.sh

# Or create just the Flatpak bundle
./scripts/create-bundle.sh
```

This creates both:

- `FlowForge.flatpak` - Flatpak bundle for installation
- `flowforge-0.2.0-linux-x64.tar.gz` - Complete distributable package

Install the Flatpak bundle with:

```bash
flatpak install --user FlowForge.flatpak
```

## Configuration

On first run, FlowForge will need API keys configured. Run the setup script:

```bash
./scripts/setup-config.sh
```

Or manually create the config at:

```bash
~/.var/app/io.github.flowforge.FlowForge/config/flowforge/.env
```

With content:

```env
GITHUB_TOKEN=your_github_token_here
OPENAI_API_KEY=your_openai_api_key_here
```

## Testing

To test the Flatpak environment without a full build:

```bash
./scripts/test-flatpak.sh
```

To validate your build environment:

```bash
./scripts/validate-environment.sh
```

## Troubleshooting

### Build Errors

1. **Missing runtimes**: Install them with `./scripts/install-runtimes.sh`
2. **NPM source generation fails**: Ensure you have `package-lock.json` files
3. **MongoDB fails to start**: Clear data with `rm -rf ~/.var/app/io.github.flowforge.FlowForge/data/mongodb`

### Debug Mode

Run with debug output:

```bash
flatpak run --env=FLOWFORGE_DEBUG=1 io.github.flowforge.FlowForge
```

View logs:

```bash
journalctl --user -f | grep flowforge
```

## File Locations

When running as a Flatpak, FlowForge uses these directories:

- **Config**: `~/.var/app/io.github.flowforge.FlowForge/config/`
- **Data**: `~/.var/app/io.github.flowforge.FlowForge/data/`
- **Cache**: `~/.var/app/io.github.flowforge.FlowForge/cache/`

## Permissions

The Flatpak requests these permissions:

- `--share=network`: For API calls
- `--filesystem=home`: For saving/loading workflows
- `--socket=x11` & `--socket=wayland`: For GUI
- `--device=dri`: For hardware acceleration

## Development

For development builds, use:

```bash
flatpak-builder --force-clean build-dev scripts/io.github.flowforge.FlowForge.devel.yml
flatpak-builder --run build-dev scripts/io.github.flowforge.FlowForge.devel.yml flowforge-launcher
```

This provides a development environment with mock services and no API key requirements.
