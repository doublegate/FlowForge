# FlowForge

<p align="center">
  <img src="images/FlowForge_logo.png" alt="FlowForge Logo" width="300">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.7.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg" alt="Node Version">
  <img src="https://img.shields.io/badge/status-production--ready-green.svg" alt="Status">
</p>

**FlowForge** is a comprehensive collaborative platform for creating GitHub Actions workflows. Combining visual drag-and-drop design, AI-powered assistance, real-time collaboration, and enterprise-grade features, FlowForge transforms CI/CD pipeline creation from complex YAML editing to intuitive team collaboration.

---

## ✨ Features

### 🎨 Core Features
- **Visual Workflow Builder** - Intuitive drag-and-drop interface powered by React Flow
- **AI-Powered Generation** - Natural language to workflow conversion using OpenAI GPT-4
- **Action Discovery** - Browse and search 500+ GitHub Actions with intelligent categorization
- **Real-time Validation** - Instant YAML validation with actionlint integration
- **Live YAML Preview** - See generated YAML in real-time with syntax highlighting
- **Full CRUD Operations** - Complete workflow management with MongoDB persistence

### 🚀 v0.7.0 - Collaboration & Enterprise Features (NEW!)
- **Workflow Import/Export** - Share workflows in JSON or GitHub Actions YAML format
- **GitHub Integration** - Deploy workflows directly to repositories with PR support
- **Real-time Collaboration** - WebSocket-powered live editing with presence tracking
- **Comments & Discussions** - Threaded comments with @mentions and emoji reactions
- **Email Notifications** - Stay updated on mentions, deployments, and collaborations
- **Advanced Search** - Powerful multi-filter search with 7 sort options
- **Multiple OAuth Providers** - Sign in with GitHub, Google, Microsoft, GitLab, or Bitbucket
- **Per-User Rate Limiting** - Sophisticated tier-based rate limiting for fair usage

### 👥 v0.6.0 - Enterprise Plus Features
- **Team Collaboration** - Role-based access control (viewer, editor, admin)
- **Workflow Marketplace** - Share and discover community workflows
- **Advanced Analytics** - Comprehensive usage insights and performance metrics
- **Workflow Versioning** - Complete version control with diff viewing
- **Activity Feed** - Real-time notifications and team activity tracking
- **Approval Workflows** - Multi-step approval process for critical workflows

### 🔐 v0.4.0 - Authentication & Security
- **JWT Authentication** - Secure token-based authentication system
- **User Management** - Complete user registration, login, and profile management
- **OAuth Integration** - Sign in with GitHub, Google, Microsoft, GitLab, Bitbucket
- **Role-Based Access** - Admin, moderator, and user roles with permissions
- **Workflow Ownership** - Private, team, and public workflow visibility
- **Password Security** - Bcrypt hashing with secure token management

### 🤖 AI & Intelligence
- **Smart Optimization** - AI-powered suggestions for faster, more efficient workflows
- **Multi-Job Generation** - Intelligent job grouping with automatic dependency tracking
- **Critical Path Detection** - Find and optimize the longest execution chains
- **Performance Suggestions** - Identifies optimization opportunities automatically
- **Template Library** - Pre-built workflows for common scenarios
- **Natural Language Processing** - Convert plain English to complete workflows

### 📦 Desktop & Distribution
- **Desktop Application** - Complete Flatpak packaging for Linux deployment
- **Native Desktop App** - Electron wrapper with embedded MongoDB
- **Unified Build System** - Automated build scripts for all platforms
- **Cross-platform** - Works on Linux, with Windows/macOS support planned

### 🛡️ Security & Quality
- **Security Hardened** - Comprehensive input validation and injection protection
- **Security Scanning** - Automated vulnerability detection with CodeQL
- **Per-User Rate Limiting** - Tier-based limits prevent abuse
- **Email Verification** - OAuth providers provide verified emails
- **Audit Logging** - Track all workflow changes and access
- **Zero Vulnerabilities** - All security issues resolved

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **MongoDB** 4.4+ (or use Docker)
- **GitHub Personal Access Token** (for action discovery)
- **OpenAI API Key** (for AI features)
- **SMTP Server** (optional, for email notifications)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/doublegate/FlowForge.git
   cd FlowForge
   ```

2. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

   Required variables:
   ```bash
   MONGODB_URI=mongodb://admin:flowforge123@localhost:27017/flowforge?authSource=admin
   GITHUB_TOKEN=your_github_token
   OPENAI_API_KEY=your_openai_key
   JWT_SECRET=your_jwt_secret

   # Optional - OAuth Providers
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   MICROSOFT_CLIENT_ID=your_microsoft_client_id
   MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
   GITLAB_CLIENT_ID=your_gitlab_client_id
   GITLAB_CLIENT_SECRET=your_gitlab_client_secret
   BITBUCKET_CLIENT_ID=your_bitbucket_client_id
   BITBUCKET_CLIENT_SECRET=your_bitbucket_client_secret

   # Optional - Email Notifications
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   ```

3. **Using Docker (Recommended)**

   ```bash
   docker-compose up -d
   ```

4. **Manual Setup**

   ```bash
   # Install dependencies
   cd backend && npm install
   cd ../frontend && npm install

   # Seed database with actions
   cd backend && npm run seed

   # Start backend (Terminal 1)
   cd backend && npm run dev

   # Start frontend (Terminal 2)
   cd frontend && npm run dev
   ```

5. **Access the application**
   - **Frontend**: http://localhost:5173
   - **API**: http://localhost:3002

### First Steps

1. **Register an account** at http://localhost:5173/register
2. **Connect GitHub** to deploy workflows (Settings > Integrations)
3. **Create your first workflow** using the visual builder or AI assistant
4. **Deploy to GitHub** or export as YAML

---

## 📖 Documentation

### User Documentation
- **[User Guide](docs/USER_GUIDE.md)** - Complete guide for users
- **[v0.7.0 Features](docs/V0.7.0-FEATURES.md)** - Latest feature documentation

### Technical Documentation
- **[API Documentation](docs/API.md)** - Complete API reference (50+ endpoints)
- **[Architecture Overview](docs/ARCHITECTURE.md)** - System architecture
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment
- **[Flatpak Build Guide](docs/FLATPAK-BUILD.md)** - Desktop distribution

### Developer Documentation
- **[CLAUDE.md](CLAUDE.md)** - Development guidelines
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute
- **[CHANGELOG.md](CHANGELOG.md)** - Version history

---

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **React Flow** for visual workflows
- **Tailwind CSS** for styling
- **Vite** for fast builds
- **Socket.IO Client** for real-time collaboration
- **Zustand** for state management

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **Socket.IO** for WebSocket connections
- **Passport.js** for OAuth (5 providers)
- **JWT** for authentication
- **Nodemailer** for email notifications
- **GitHub API** (@octokit/rest)
- **OpenAI API** for AI features
- **actionlint** for YAML validation

### Infrastructure
- **Docker** & Docker Compose
- **Flatpak** for desktop distribution
- **GitHub Actions** for CI/CD
- **MongoDB** for data persistence

---

## 🎯 Key Features by Version

### v0.7.0 - Collaboration Platform (Current) ✅
- ✅ Workflow Import/Export (JSON & YAML)
- ✅ GitHub Actions Integration
- ✅ Real-time Collaboration (WebSockets)
- ✅ Comments & Discussions
- ✅ Email Notifications
- ✅ Advanced Search
- ✅ Additional OAuth Providers (Microsoft, GitLab, Bitbucket)
- ✅ Per-User Rate Limiting

### v0.6.0 - Enterprise Plus ✅
- ✅ Team Collaboration with RBAC
- ✅ Workflow Marketplace
- ✅ Advanced Analytics
- ✅ Workflow Versioning
- ✅ Activity Feed
- ✅ Approval Workflows

### v0.4.0 - Authentication ✅
- ✅ JWT Authentication System
- ✅ User Management
- ✅ OAuth Integration (GitHub, Google)
- ✅ Role-Based Access Control
- ✅ Workflow Ownership

### v0.3.x - Core Features ✅
- ✅ Visual Workflow Builder
- ✅ AI-Powered Generation
- ✅ Action Discovery (500+ actions)
- ✅ Real-time YAML Validation
- ✅ Workflow Persistence
- ✅ Desktop Distribution

---

## 🗺️ Roadmap

### Current: v0.7.0 ✅ **COMPLETE**
Full-featured collaboration platform with real-time editing, GitHub integration, and enterprise authentication.

### Next: v0.8.0 (Planned)
- **Webhook Integrations** - External system notifications
- **Advanced Permissions** - Fine-grained access control
- **API Keys** - Programmatic access
- **Workflow Templates SDK** - Create custom templates
- **Advanced Analytics Dashboard** - Deep insights

### Future: v1.0.0
- **Multi-platform Desktop** - Windows and macOS applications
- **Mobile Companion App** - iOS and Android support
- **Cloud Hosting** - SaaS deployment option
- **Enterprise SSO** - SAML, LDAP integration
- **Compliance** - SOC2, GDPR compliance
- **99.9% Uptime SLA** - Production-grade reliability

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with tests
4. Run tests (`npm test` in both backend/ and frontend/)
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Standards

- **TypeScript** for frontend components
- **ESLint** for code quality
- **Prettier** for formatting
- **Jest/Vitest** for testing
- **Conventional Commits** for commit messages

---

## 📊 Project Status

**Current Version**: v0.7.0 - Production Ready

FlowForge is a **production-ready** collaborative platform with **100% feature completion** through v0.7.0, including:

- ✅ **Phase 1**: MVP (Visual Builder)
- ✅ **Phase 2**: AI Integration
- ✅ **Phase 3**: Enterprise Features (Authentication, Teams, Analytics)
- ✅ **v0.7.0**: Collaboration Platform (Real-time, GitHub, Comments)

### Statistics

- **50+ API Endpoints** - Complete RESTful API
- **500+ GitHub Actions** - Comprehensive action library
- **10+ Components** - Professional UI components
- **5 OAuth Providers** - Multiple sign-in options
- **Real-time Collaboration** - WebSocket-powered
- **6,000+ Lines** - Production-quality code
- **3 Documentation Files** - Comprehensive guides
- **Zero Vulnerabilities** - Security hardened

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Awesome Actions](https://github.com/sdras/awesome-actions) for the curated action list
- [React Flow](https://reactflow.dev/) for the amazing flow library
- [actionlint](https://github.com/rhysd/actionlint) for YAML validation
- [Socket.IO](https://socket.io/) for real-time communication
- [Passport.js](http://www.passportjs.org/) for OAuth integration

---

## 💬 Support

- 📧 **Email**: support@flowforge.dev
- 💬 **Discord**: [Join our community](https://discord.gg/flowforge)
- 🐛 **Issues**: [GitHub Issues](https://github.com/doublegate/FlowForge/issues)
- 📖 **Documentation**: [docs/](docs/)

---

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=doublegate/FlowForge&type=Date)](https://star-history.com/#doublegate/FlowForge&Date)

---

<p align="center">
  <img src="images/flowforge-banner.png" alt="FlowForge Banner" width="800">
</p>

![Alt](https://repobeats.axiom.co/api/embed/97a3ce43d9f25e97e415cd5561e7caff44e5c397.svg "Repobeats analytics image")

<p align="center">Made with ❤️ by the FlowForge Team</p>
<p align="center"><strong>v0.7.0 - The Collaboration Platform Release</strong></p>
