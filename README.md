<!-- markdownlint-disable MD033 -->
# FlowForge

<p align="center">
  <img src="https://img.shields.io/badge/version-0.2.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg" alt="Node Version">
  <img src="https://img.shields.io/badge/status-beta-yellow.svg" alt="Status">
</p>

FlowForge is a powerful visual workflow builder for GitHub Actions that combines drag-and-drop simplicity with AI-powered assistance. Create complex CI/CD pipelines without writing YAML by hand.

## ✨ Features

- 🎨 **Visual Workflow Builder** - Intuitive drag-and-drop interface powered by React Flow
- 🤖 **AI-Powered Generation** - Natural language to workflow conversion using OpenAI GPT-4
- 📚 **Action Discovery** - Browse and search 500+ GitHub Actions with intelligent categorization
- ✅ **Real-time Validation** - Instant YAML validation with actionlint
- 🚀 **Smart Optimization** - AI-powered suggestions for faster, more efficient workflows
- 📝 **Template Library** - Pre-built workflows for common scenarios
- 🔍 **Live YAML Preview** - See generated YAML in real-time with syntax highlighting
- 💾 **Workflow Persistence** - Save and load workflows from MongoDB
- 🏷️ **Advanced Categorization** - 14 intelligent categories for easy action discovery
- 🔄 **Full CRUD Operations** - Create, read, update, and delete workflows
- 📦 **Desktop Distribution** - Flatpak support for Linux desktop deployment
- 🖥️ **Native Desktop App** - Electron wrapper for desktop experience

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- MongoDB 4.4+
- Docker and Docker Compose (optional)
- GitHub Personal Access Token
- OpenAI API Key (for AI features)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/doublegate/FlowForge.git
   cd FlowForge
   ```

2. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Using Docker (Recommended)**

   ```bash
   docker-compose up -d
   ```

4. **Manual Setup**

   ```bash
   # Backend
   cd backend
   npm install
   npm run seed
   npm run dev

   # Frontend (new terminal)
   cd frontend
   npm install
   npm run dev
   ```

5. **Access the application**
   - Frontend: <http://localhost:5173>
   - API: <http://localhost:3001>

### Flatpak Build

FlowForge can also be built as a Flatpak for easy distribution:

```bash
./scripts/build-flatpak.sh --install --run
```

See the [Flatpak Build Guide](docs/FLATPAK-BUILD.md) for detailed instructions.

## 📖 Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [API Documentation](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Flatpak Build Guide](docs/FLATPAK-BUILD.md)

## 🛠️ Technology Stack

### Frontend

- React 18 with TypeScript
- React Flow for visual workflows
- Tailwind CSS for styling
- Vite for fast builds
- Zustand for state management

### Backend

- Node.js with Express.js
- MongoDB with Mongoose
- GitHub API integration
- OpenAI API for AI features
- actionlint for validation

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Awesome Actions](https://github.com/sdras/awesome-actions) for the curated action list
- [React Flow](https://reactflow.dev/) for the amazing flow library
- [actionlint](https://github.com/rhysd/actionlint) for YAML validation

## 📊 Project Status

FlowForge is currently in **beta**. Core features including AI integration are complete and we're preparing for enterprise features!

### Roadmap

- [x] Phase 1: MVP with visual builder and action discovery
- [x] Phase 2: AI integration and advanced features ✅ COMPLETED
  - [x] OpenAI GPT-4 integration for workflow generation
  - [x] Natural language to workflow conversion
  - [x] AI-powered workflow suggestions
  - [x] Intelligent action categorization (14 categories)
  - [x] Workflow persistence to MongoDB
  - [x] Enhanced GitHub API integration with authentication
  - [x] Advanced action metadata parsing
- [x] Desktop Distribution: Flatpak support for Linux ✅ COMPLETED
  - [x] Complete Flatpak packaging
  - [x] Electron wrapper for native experience
  - [x] Embedded MongoDB for self-contained deployment
  - [x] Automated build scripts
- [ ] Phase 3: Enterprise features and marketplace (next)
- [ ] Phase 4: Multi-platform support

## 💬 Support

- 📧 Email: <support@flowforge.dev>
- 💬 Discord: [Join our community](https://discord.gg/flowforge)
- 🐛 Issues: [GitHub Issues](https://github.com/doublegate/FlowForge/issues)

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=doublegate/FlowForge&type=Date)](https://star-history.com/#doublegate/FlowForge&Date)

---

<p align="center">Made with ❤️ by the FlowForge Team</p>
<!-- markdownlint-enable MD033 -->
