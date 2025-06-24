# FlowForge Flatpak Edition

<p align="center">
  <img src="https://raw.githubusercontent.com/flowforge/flowforge/main/assets/icon.svg" alt="FlowForge Logo" width="128">
</p>

<p align="center">
  <strong>Visual GitHub Actions Workflow Builder - Flatpak Package</strong>
</p>

## 📦 About This Flatpak

This is the official Flatpak distribution of FlowForge, providing a sandboxed, easy-to-install version of the GitHub Actions workflow builder. The Flatpak includes:

- **Complete FlowForge application** with Electron wrapper
- **Embedded MongoDB** for data persistence
- **Offline-capable** build system
- **Desktop integration** with menu entries and file associations
- **Automatic updates** through Flatpak

## 🚀 Quick Install

### From Flathub (Recommended)

```bash
flatpak install flathub io.github.flowforge.FlowForge
flatpak run io.github.flowforge.FlowForge
```

### From Bundle File

If you have a `.flatpak` bundle file:

```bash
flatpak install --user FlowForge.flatpak
flatpak run io.github.flowforge.FlowForge
```

## 🔨 Building from Source

### Prerequisites

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

3. **Install required dependencies**:
   ```bash
   # Node.js and npm for generating sources
   sudo apt install nodejs npm  # or equivalent for your distro

   # Python for node source generator
   sudo apt install python3
   ```

### Build Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/flowforge/flowforge.git
   cd flowforge
   ```

2. **Run the build script**:
   ```bash
   chmod +x build-flatpak.sh
   ./build-flatpak.sh --install --run
   ```

   This script will:
   - Install required Flatpak runtimes
   - Generate offline sources for npm packages
   - Build the Flatpak
   - Install it locally
   - Launch FlowForge

### Manual Build

For more control over the build process:

```bash
# Install runtimes
flatpak install -y flathub org.freedesktop.Platform//23.08
flatpak install -y flathub org.freedesktop.Sdk//23.08
flatpak install -y flathub org.freedesktop.Sdk.Extension.node18//23.08
flatpak install -y flathub org.electronjs.Electron2.BaseApp//23.08

# Generate npm sources
cd backend && npm install --package-lock-only
python3 ../flatpak-node-generator.py npm package-lock.json -o ../generated-sources-backend.json
cd ../frontend && npm install --package-lock-only
python3 ../flatpak-node-generator.py npm package-lock.json -o ../generated-sources-frontend.json
cd ..

# Build
flatpak-builder --force-clean build-dir io.github.flowforge.FlowForge.yml

# Install
flatpak-builder --user --install --force-clean build-dir io.github.flowforge.FlowForge.yml
```

## ⚙️ Configuration

### First Run Setup

On first run, FlowForge will prompt you to configure your API keys. You can also run the setup manually:

```bash
./setup-config.sh
```

### Manual Configuration

Configuration files are stored in:
```
~/.var/app/io.github.flowforge.FlowForge/config/flowforge/.env
```

Required configuration:
```env
# GitHub Personal Access Token (required)
# Create at: https://github.com/settings/tokens
# Scopes needed: repo (for reading action metadata)
GITHUB_TOKEN=your_github_token_here

# OpenAI API Key (optional, for AI features)
# Get at: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here
```

### Data Storage

FlowForge stores data in:
```
~/.var/app/io.github.flowforge.FlowForge/
├── config/          # Configuration files
├── data/
│   └── mongodb/     # Database files
└── cache/           # Temporary files
```

## 🎯 Usage

### Launching FlowForge

```bash
# From command line
flatpak run io.github.flowforge.FlowForge

# Or use your desktop environment's application menu
```

### Command Line Options

```bash
# Open with a specific workflow file
flatpak run io.github.flowforge.FlowForge workflow.yml

# Enable debug mode
flatpak run --env=DEBUG=1 io.github.flowforge.FlowForge

# Use custom config directory
flatpak run --env=CONFIG_DIR=/path/to/config io.github.flowforge.FlowForge
```

### File Associations

FlowForge registers as a handler for:
- `.yml` files (YAML workflow files)
- `.yaml` files

Right-click on any workflow file and select "Open with FlowForge".

## 🔧 Troubleshooting

### Common Issues

1. **"Failed to start MongoDB"**
   ```bash
   # Clear MongoDB data and retry
   rm -rf ~/.var/app/io.github.flowforge.FlowForge/data/mongodb
   flatpak run io.github.flowforge.FlowForge
   ```

2. **"Cannot connect to backend"**
   ```bash
   # Check if all services are running
   flatpak run --command=sh io.github.flowforge.FlowForge
   ps aux | grep -E "mongod|node"
   ```

3. **"GitHub API rate limit exceeded"**
   - Ensure you've configured a valid GitHub token
   - Check your rate limit: https://api.github.com/rate_limit

### Debug Mode

Run FlowForge with debug output:
```bash
flatpak run --env=FLOWFORGE_DEBUG=1 io.github.flowforge.FlowForge
```

Check logs:
```bash
# Application logs
~/.var/app/io.github.flowforge.FlowForge/data/logs/

# Flatpak logs
journalctl --user -f | grep flowforge
```

## 📦 Creating a Bundle

To create a distributable `.flatpak` file:

```bash
./create-bundle.sh
```

This creates `FlowForge.flatpak` that can be shared and installed with:
```bash
flatpak install --user FlowForge.flatpak
```

## 🔐 Permissions

The Flatpak requests these permissions:

| Permission | Purpose |
|------------|---------|
| `--share=network` | API calls to GitHub and OpenAI |
| `--filesystem=home` | Save/load workflow files |
| `--socket=x11` | Display the GUI |
| `--socket=wayland` | Wayland display support |
| `--device=dri` | Hardware acceleration |

To modify permissions:
```bash
flatpak override --user io.github.flowforge.FlowForge --nofilesystem=home
```

## 🆙 Updates

### Automatic Updates

If installed from Flathub, FlowForge updates automatically with:
```bash
flatpak update
```

### Manual Updates

For locally built versions:
```bash
git pull
./build-flatpak.sh --install
```

## 🧪 Development

### Development Build

Use the development manifest for easier testing:
```bash
flatpak-builder --force-clean build-dev io.github.flowforge.FlowForge.devel.yml
flatpak-builder --run build-dev io.github.flowforge.FlowForge.devel.yml flowforge-launcher
```

### Testing Changes

1. Make your changes to the source code
2. Rebuild only the changed module:
   ```bash
   flatpak-builder --force-clean --rebuild-on-sdk-change \
     --subject="Test build" \
     build-dir io.github.flowforge.FlowForge.yml
   ```

### Debugging Electron

```bash
# Run with Electron DevTools enabled
flatpak run --env=ELECTRON_ENABLE_LOGGING=1 io.github.flowforge.FlowForge

# Access Electron console
# Press F12 or Ctrl+Shift+I in the app
```

## 📄 License

FlowForge is distributed under the MIT License. See [LICENSE](LICENSE) for details.

## 🤝 Contributing

Contributions to the Flatpak package are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Test your changes with the Flatpak build
4. Submit a pull request

## 📞 Support

- **Flatpak Issues**: [GitHub Issues](https://github.com/flowforge/flowforge/issues)
- **General Support**: support@flowforge.dev
- **Flatpak Documentation**: [flatpak.org](https://flatpak.org)

---

<p align="center">
  Built with ❤️ for the Flatpak community
</p>