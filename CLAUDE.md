# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FlowForge is a Visual GitHub Actions Workflow Builder - a full-stack web application that provides a drag-and-drop interface for creating GitHub Actions CI/CD workflows with AI assistance. The project bridges visual programming and DevOps automation, making it easier to create complex workflows without manually writing YAML.

## Development Commands

### Backend Development (from `backend/` directory)

```bash
npm run dev          # Start development server with hot reload (nodemon)
npm run seed         # Seed database with initial workflow templates
npm run update-actions  # Update GitHub Actions library from Awesome Actions
npm test             # Run Jest test suite
npm run lint         # Run ESLint
```

### Frontend Development (from `frontend/` directory)

```bash
npm run dev          # Start Vite dev server (http://localhost:5173)
npm run build        # Build for production (outputs to dist/)
npm test             # Run Vitest test suite
npm run lint         # Run ESLint on src files
```

### Running Tests

- **Backend**: `npm test` runs Jest tests with environment variable loading
- **Frontend**: `npm test` runs Vitest for React component and unit tests
- **Single test**: Use `.only` or `--testNamePattern` with Jest/Vitest

### Full Stack Development

```bash
# Terminal 1: MongoDB (if not using Docker)
mongod --dbpath /path/to/data

# Terminal 2: Backend API
cd backend && npm run dev

# Terminal 3: Frontend
cd frontend && npm run dev

# Or use Docker:
docker-compose up -d
```

## High-Level Architecture

### Frontend Architecture

- **Framework**: React 18 with TypeScript, built with Vite
- **Visual Editor**: React Flow library for drag-and-drop workflow building
- **State Management**: Local state with React hooks, Zustand prepared for global state
- **Key Components**:
  - Canvas: React Flow-based visual editor with custom ActionNode components
  - Sidebar: Searchable action library with drag-to-drop functionality
  - AI Assistant: Natural language workflow generation interface
  - YAML Preview: Real-time workflow YAML with syntax highlighting

### Backend Architecture

- **Framework**: Express.js with modular route structure
- **Database**: MongoDB with Mongoose ODM
- **External Services**:
  - GitHub API (@octokit/rest): Fetches action metadata
  - OpenAI API: Powers natural language workflow generation
  - actionlint: External CLI tool for YAML validation
- **Caching**: LRU cache for API responses (6-hour TTL)

### Key Integration Points

1. **API Communication**: RESTful endpoints under `/api/*` with Axios frontend client
2. **Action Discovery**: Intelligent categorization using keywords and metadata parsing
3. **AI Workflow Generation**:
   - POST `/api/ai/generate-workflow` with natural language prompt
   - Returns structured workflow with explanations
4. **Validation Pipeline**: Frontend YAML → Backend → actionlint → Error feedback

### Database Models

**Action Schema** (`backend/models/Action.js`):

- Stores GitHub Action metadata with normalized structure
- Tracks usage statistics and last update time

**WorkflowTemplate Schema** (`backend/models/WorkflowTemplate.js`):

- Pre-built workflow templates categorized by technology
- Includes workflow content and metadata

### Environment Configuration

Required environment variables (create `.env` from `.env.example`):

```bash
MONGODB_URI=mongodb://localhost:27017/flowforge
GITHUB_TOKEN=your_github_personal_access_token  # For API access
OPENAI_API_KEY=your_openai_api_key             # For AI features
PORT=3002                                       # Backend port
FRONTEND_URL=http://localhost:5173              # For CORS
```

### Important Patterns

1. **Error Handling**: Try-catch blocks with graceful degradation and user-friendly messages
2. **Rate Limiting**: 100 req/15min general, 20 req/15min for AI endpoints
3. **Caching Strategy**: Database caching + LRU memory cache for external API responses
4. **Security**: Helmet.js, CORS configuration, environment variable protection
5. **Batch Processing**: Respects GitHub API rate limits with delayed batch fetching

### Development Workflow

1. **Feature Development**: Work in feature branches, test locally with both servers running
2. **Database Updates**: Run `npm run seed` after schema changes
3. **Action Library Updates**: Periodically run `npm run update-actions` to fetch new actions
4. **Testing**: Ensure both frontend and backend tests pass before committing
5. **Building**: Frontend production build with `npm run build` creates optimized bundle

### Docker Development

The project includes Docker configuration for containerized development:

- `docker-compose.yml` orchestrates MongoDB, backend, and frontend containers
- Frontend served via Nginx in production mode
- Volumes mounted for development hot-reload

### Future Considerations

- Authentication system is prepared but not implemented (session secret in config)
- Zustand is installed for future global state management needs
- Component structure supports easy addition of new node types and actions
