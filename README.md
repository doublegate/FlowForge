<!-- markdownlint-disable MD033 -->
# FlowForge

<p align="center">
  <img src="images/FlowForge_logo.png" alt="FlowForge Logo" width="300">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.3.4-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg" alt="Node Version">
  <img src="https://img.shields.io/badge/status-stable-green.svg" alt="Status">
</p>

FlowForge is a powerful visual workflow builder for GitHub Actions that combines drag-and-drop simplicity with AI-powered assistance. Create complex CI/CD pipelines without writing YAML by hand.

## ✨ Features

### Core Features
- 🎨 **Visual Workflow Builder** - Intuitive drag-and-drop interface powered by React Flow
- 🤖 **AI-Powered Generation** - Natural language to workflow conversion using OpenAI GPT-4
- 📚 **Action Discovery** - Browse and search 500+ GitHub Actions with intelligent categorization
- ✅ **Real-time Validation** - Instant YAML validation with enhanced error/warning feedback
- 🔍 **Live YAML Preview** - See generated YAML in real-time with syntax highlighting
- 💾 **Workflow Persistence** - Save and load workflows from MongoDB
- 🔄 **Full CRUD Operations** - Create, read, update, and delete workflows

### Advanced Features (NEW in v0.3.4)
- 🔀 **Multi-Job Workflow Generation** - Intelligent job grouping with automatic dependency tracking
- 📊 **Edge Analysis & Optimization** - Detects parallelization opportunities and bottlenecks
- ⚡ **Performance Suggestions** - AI identifies workflow optimization opportunities
- 🎯 **Critical Path Detection** - Find and optimize the longest execution chains
- 🔍 **Isolated Node Detection** - Identifies disconnected workflow components
- 📋 **Enhanced Validation** - Structured errors, warnings, and suggestions with line numbers
- 🏗️ **TypeScript Type System** - 11+ comprehensive interfaces for full type safety

### Workflow Intelligence
- 🚀 **Smart Optimization** - AI-powered suggestions for faster, more efficient workflows
- 📝 **Template Library** - Pre-built workflows for common scenarios
- 🏷️ **Advanced Categorization** - 14 intelligent categories for easy action discovery
- 🌳 **Dependency Analysis** - BFS/DFS algorithms for workflow structure analysis
- 🔄 **Topological Sorting** - Ensures correct processing order in complex workflows

### Desktop & Distribution
- 📦 **Desktop Distribution** - Complete Flatpak packaging for Linux deployment
- 🖥️ **Native Desktop App** - Electron wrapper with embedded MongoDB
- 🔧 **Unified Build System** - Automated build scripts for all platforms

### Security & Quality
- 🔒 **Security Hardened** - Comprehensive input validation and injection protection
- 🛡️ **Security Scanning** - Automated vulnerability detection with CodeQL
- 📊 **Performance Monitoring** - Lighthouse CI with accessibility testing
- 🚀 **CI/CD Pipeline** - Comprehensive GitHub Actions with advanced caching
- ✅ **Zero Vulnerabilities** - All security issues resolved in latest release

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
   - API: <http://localhost:3002>

### Desktop Build

FlowForge can be built as a desktop application using our unified build system:

```bash
# Build distributable package
./scripts/build-flowforge.sh

# Build and install Flatpak
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

FlowForge is currently in **production** with **Phase 1 & 2 FULLY COMPLETE** and comprehensive CI/CD automation. All core features including advanced UI components, AI integration, desktop distribution, and automated quality assurance are production-ready!

### Roadmap

- [x] **Phase 1: MVP** - Visual builder and action discovery ✅ **100% COMPLETE**
  - [x] Advanced React Flow canvas with drag-and-drop
  - [x] Professional ActionNode components with status indicators
  - [x] Intelligent sidebar with 14+ action categories
  - [x] Real-time YAML generation and syntax highlighting
  - [x] MongoDB integration with comprehensive schemas
  - [x] RESTful API with 15+ endpoints
  
- [x] **Phase 2: AI Integration & Advanced Features** ✅ **100% COMPLETE**
  - [x] OpenAI GPT-4 integration with context-aware prompts
  - [x] Natural language to workflow conversion
  - [x] AI Assistant with conversation history
  - [x] Intelligent workflow suggestions and optimization
  - [x] Advanced action categorization (14 categories)
  - [x] Workflow persistence and full CRUD operations
  - [x] Enhanced GitHub API integration with authentication
  - [x] ActionLint integration for real-time YAML validation
  - [x] Professional UI components (Canvas, Node Config, YAML Preview)
  - [x] Undo/Redo functionality and workflow import/export
  
- [x] **Desktop Distribution** ✅ **100% COMPLETE**
  - [x] Complete Flatpak packaging for Linux
  - [x] Electron wrapper for native desktop experience
  - [x] Embedded MongoDB for self-contained deployment
  - [x] Unified build system with automated scripts
  
- [x] **CI/CD & Infrastructure** ✅ **100% COMPLETE**
  - [x] Comprehensive GitHub Actions pipeline with 40%+ speed optimization
  - [x] Advanced caching strategy for dependencies and Docker layers
  - [x] Security scanning with npm audit and CodeQL
  - [x] Performance monitoring with Lighthouse CI
  - [x] Automated dependency updates and maintenance
  - [x] Release automation with semantic versioning
  - [x] Accessibility testing and compliance (98+ score)
  - [x] Comprehensive security hardening with injection protection
  
- [ ] **Phase 3: Enterprise Features** (Next - Planning Stage)
  - [ ] JWT-based authentication and team collaboration
  - [ ] Workflow versioning and role-based access control
  - [ ] Advanced analytics and workflow marketplace
  - [ ] SSO integration and audit logging
  
- [ ] **Phase 4: Multi-platform Support** (Future)
  - [ ] Windows and macOS desktop applications
  - [ ] Mobile companion app
  - [ ] Cloud hosting and SaaS deployment

## 💬 Support

- 📧 Email: <support@flowforge.dev>
- 💬 Discord: [Join our community](https://discord.gg/flowforge)
- 🐛 Issues: [GitHub Issues](https://github.com/doublegate/FlowForge/issues)

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=doublegate/FlowForge&type=Date)](https://star-history.com/#doublegate/FlowForge&Date)

---

<p align="center">
  <img src="images/flowforge-banner.png" alt="FlowForge Banner" width="800">
</p>

![Alt](https://repobeats.axiom.co/api/embed/97a3ce43d9f25e97e415cd5561e7caff44e5c397.svg "Repobeats analytics image")

<p align="center">Made with ❤️ by the FlowForge Team</p>
<!-- markdownlint-enable MD033 -->
