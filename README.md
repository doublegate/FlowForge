# FlowForge

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg" alt="Node Version">
  <img src="https://img.shields.io/badge/status-alpha-orange.svg" alt="Status">
</p>

FlowForge is a powerful visual workflow builder for GitHub Actions that combines drag-and-drop simplicity with AI-powered assistance. Create complex CI/CD pipelines without writing YAML by hand.

## ✨ Features

- 🎨 **Visual Workflow Builder** - Intuitive drag-and-drop interface powered by React Flow
- 🤖 **AI-Powered Generation** - Natural language to workflow conversion using OpenAI
- 📚 **Action Discovery** - Browse and search 500+ GitHub Actions from Awesome Actions
- ✅ **Real-time Validation** - Instant YAML validation with actionlint
- 🚀 **Smart Optimization** - Get suggestions for faster, more efficient workflows
- 📝 **Template Library** - Pre-built workflows for common scenarios
- 🔍 **Live YAML Preview** - See generated YAML in real-time

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
   git clone https://github.com/yourusername/flowforge.git
   cd flowforge
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
   - Frontend: http://localhost:5173
   - API: http://localhost:3001

## 📖 Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [API Documentation](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

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

FlowForge is currently in **alpha**. We're actively developing core features and would love your feedback!

### Roadmap

- [x] Phase 1: MVP with visual builder and action discovery
- [ ] Phase 2: AI integration and advanced features (in progress)
- [ ] Phase 3: Enterprise features and marketplace
- [ ] Phase 4: Multi-platform support

## 💬 Support

- 📧 Email: support@flowforge.dev
- 💬 Discord: [Join our community](https://discord.gg/flowforge)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/flowforge/issues)

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=yourusername/flowforge&type=Date)](https://star-history.com/#yourusername/flowforge&Date)

---

<p align="center">Made with ❤️ by the FlowForge Team</p>