# FlowForge - Visual GitHub Actions Workflow Builder

<p align="center">
  <img src="logo.png" alt="FlowForge Logo" width="200">
</p>

<p align="center">
  <strong>Build powerful GitHub Actions workflows visually with AI assistance</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#api-reference">API</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## 🚀 Overview

FlowForge is a powerful web-based application that revolutionizes how developers create GitHub Actions workflows. By combining an intuitive drag-and-drop interface with AI-powered assistance, FlowForge makes it easy to build, visualize, and optimize CI/CD pipelines without wrestling with YAML syntax.

### Why FlowForge?

- **Visual Workflow Design**: Drag and drop actions to build workflows visually
- **AI-Powered Assistance**: Describe what you want in natural language, and let AI generate the workflow
- **Extensive Action Library**: Access hundreds of actions from the Awesome Actions repository
- **Real-time Validation**: Get instant feedback on workflow syntax and compatibility
- **Smart Suggestions**: Receive optimization recommendations for better performance
- **Export to YAML**: Generate production-ready GitHub Actions workflow files

## ✨ Features

### 🎨 Visual Workflow Builder
- **Drag-and-Drop Interface**: Intuitive canvas for building workflows
- **Node-Based Editor**: Connect actions with visual flow lines
- **Real-time Preview**: See your workflow structure as you build
- **Action Configuration**: Configure inputs directly in the interface

### 🤖 AI Integration
- **Natural Language Processing**: Describe workflows in plain English
- **Smart Recommendations**: Get action suggestions based on your needs
- **Workflow Optimization**: AI-powered performance improvements
- **Error Prevention**: Intelligent validation before deployment

### 📚 Action Discovery
- **Comprehensive Library**: Access to 500+ GitHub Actions
- **Smart Search**: Find actions by name, description, or category
- **Categorized Browse**: Explore actions by type (build, test, deploy, etc.)
- **Metadata Display**: View inputs, outputs, and requirements

### 🔧 Advanced Features
- **YAML Generation**: Export clean, valid GitHub Actions YAML
- **Template Library**: Start with pre-built workflows for common scenarios
- **Validation Engine**: Ensure workflows meet GitHub's requirements
- **Version Control**: Track and manage workflow versions

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- MongoDB 4.4+
- GitHub Personal Access Token
- OpenAI API Key (for AI features)

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/flowforge.git
cd flowforge
```

### 2. Set Up Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your credentials
nano .env
```

Required environment variables:
```env
MONGODB_URI=mongodb://localhost:27017/flowforge
GITHUB_TOKEN=your_github_personal_access_token
OPENAI_API_KEY=your_openai_api_key
```

### 3. Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 4. Initialize Database

```bash
# From the backend directory
npm run seed
```

### 5. Start the Application

```bash
# Terminal 1: Start the backend
cd backend
npm run dev

# Terminal 2: Start the frontend
cd frontend
npm run dev
```

Visit `http://localhost:5173` to access FlowForge!

## 📖 Installation

### Production Deployment with Docker

FlowForge includes Docker configuration for easy deployment:

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

### Manual Installation

#### Backend Setup

1. **Install MongoDB**
   ```bash
   # macOS
   brew tap mongodb/brew
   brew install mongodb-community

   # Ubuntu
   sudo apt-get install mongodb

   # Start MongoDB
   mongod --dbpath /path/to/data
   ```

2. **Configure Backend**
   ```bash
   cd backend
   npm install
   
   # Install actionlint for workflow validation
   curl -L https://github.com/rhysd/actionlint/releases/latest/download/actionlint_linux_amd64.tar.gz | tar xz
   sudo mv actionlint /usr/local/bin/
   ```

3. **Initialize Database**
   ```bash
   npm run seed
   npm run update-actions  # Fetch latest actions
   ```

#### Frontend Setup

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure API Endpoint**
   ```javascript
   // frontend/src/config.js
   export const API_URL = process.env.VITE_API_URL || 'http://localhost:3001';
   ```

3. **Build for Production**
   ```bash
   npm run build
   ```

## 🎯 Usage

### Creating Your First Workflow

1. **Using the Visual Builder**
   - Browse available actions in the sidebar
   - Drag actions onto the canvas
   - Connect actions by drawing lines between nodes
   - Configure action inputs by clicking on nodes
   - Generate YAML by clicking "Show YAML"

2. **Using AI Assistant**
   - Type a description: "Deploy a Node.js app to AWS"
   - Click the AI button
   - Review suggested workflow
   - Customize as needed

3. **Starting from a Template**
   - Click "Templates" in the sidebar
   - Choose a template (e.g., "Node.js CI/CD")
   - Customize the template
   - Save your workflow

### Example Workflows

#### Node.js Testing Pipeline
```yaml
name: Node.js CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
```

#### Docker Build and Push
```yaml
name: Docker Build
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: user/app:latest
```

## 🔌 API Reference

### Actions Endpoints

#### GET /api/actions
Retrieve available GitHub Actions

**Query Parameters:**
- `category` (string): Filter by category
- `search` (string): Search term
- `limit` (number): Results per page
- `offset` (number): Pagination offset

**Response:**
```json
{
  "actions": [{
    "name": "Checkout",
    "repository": "actions/checkout@v4",
    "description": "Checkout a Git repository",
    "category": "setup",
    "inputs": {...}
  }],
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

#### GET /api/actions/:id
Get detailed action information

### AI Endpoints

#### POST /api/ai/generate
Generate workflow from natural language

**Request Body:**
```json
{
  "prompt": "Build and test a Python application"
}
```

**Response:**
```json
{
  "name": "Python CI",
  "description": "Build and test Python application",
  "actions": [...],
  "workflow": {...}
}
```

### Workflow Endpoints

#### POST /api/workflows/validate
Validate a GitHub Actions workflow

**Request Body:**
```json
{
  "yaml": "name: Test\non: push\n..."
}
```

#### POST /api/workflows/optimize
Get optimization suggestions

## 🏗️ Architecture

### Frontend Architecture
```
frontend/
├── src/
│   ├── components/
│   │   ├── Canvas/          # React Flow canvas
│   │   ├── Sidebar/         # Action browser
│   │   ├── AIAssistant/     # AI interface
│   │   └── YamlPreview/     # YAML viewer
│   ├── hooks/               # Custom React hooks
│   ├── services/            # API clients
│   └── stores/              # State management
```

### Backend Architecture
```
backend/
├── routes/                  # API routes
├── models/                  # MongoDB schemas
├── services/               
│   ├── github/             # GitHub API integration
│   ├── ai/                 # OpenAI integration
│   └── validation/         # Workflow validation
├── utils/                  # Utility functions
└── middleware/             # Express middleware
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

### Code Style

- Use ESLint configuration
- Follow React best practices
- Write comprehensive comments
- Add tests for new features

## 📄 License

FlowForge is MIT licensed. See [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- [Awesome Actions](https://github.com/sdras/awesome-actions) for the comprehensive action list
- [React Flow](https://reactflow.dev/) for the visual workflow editor
- [OpenAI](https://openai.com/) for AI capabilities
- The GitHub Actions community

## 📞 Support

- 📧 Email: support@flowforge.dev
- 💬 Discord: [Join our community](https://discord.gg/flowforge)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/flowforge/issues)

---

<p align="center">
  Made with ❤️ by the FlowForge Team
</p>