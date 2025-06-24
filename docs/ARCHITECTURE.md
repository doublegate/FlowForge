# FlowForge Architecture

**Last Updated**: 2025-06-24

## Overview

FlowForge is a full-stack web application built with a modern microservices-oriented architecture, now available as both a web application and desktop distribution. The system is divided into four main components:

1. **Frontend**: React-based SPA with visual workflow builder
2. **Backend**: Express.js REST API with MongoDB persistence
3. **Desktop Distribution**: Flatpak packaging with Electron wrapper
4. **External Services**: GitHub API, OpenAI API, and actionlint

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           Frontend (React)                       │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │   UI Layer  │  │ State Mgmt   │  │  API Client        │    │
│  │  - React    │  │  - Zustand   │  │  - Axios          │    │
│  │  - ReactFlow│  │  - Hooks     │  │  - WebSocket      │    │
│  └─────────────┘  └──────────────┘  └────────────────────┘    │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTPS/WSS
┌─────────────────────────────┴───────────────────────────────────┐
│                         Backend (Node.js)                        │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │  API Layer  │  │Service Layer │  │  Data Layer       │    │
│  │  - Express  │  │ - Business   │  │  - MongoDB        │    │
│  │  - REST     │  │   Logic      │  │  - Mongoose       │    │
│  └─────────────┘  └──────────────┘  └────────────────────┘    │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                      External Services                           │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ GitHub API  │  │  OpenAI API  │  │   actionlint       │    │
│  │ - Actions   │  │  - GPT-4     │  │  - Validation     │    │
│  │ - Repos     │  │  - Workflow  │  │  - Linting        │    │
│  └─────────────┘  └──────────────┘  └────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Frontend Architecture

### Technology Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: React Flow for visual workflow building
- **Styling**: Tailwind CSS
- **State Management**: Zustand (global state), React hooks (local state)
- **HTTP Client**: Axios
- **Icons**: Lucide React

### Component Structure
```
frontend/src/
├── components/
│   ├── ActionNode.tsx       # Custom node component for actions
│   ├── Sidebar.tsx          # Action browser and search
│   ├── Canvas.tsx           # React Flow canvas wrapper
│   ├── YamlPreview.tsx      # YAML generation and display
│   └── AIAssistant.tsx      # Natural language interface
├── hooks/
│   ├── useActions.ts        # Action fetching and caching
│   ├── useWorkflow.ts       # Workflow state management
│   └── useAI.ts             # AI integration hooks
├── services/
│   ├── api.ts               # API client configuration
│   ├── actionService.ts     # Action-related API calls
│   └── workflowService.ts   # Workflow operations
└── utils/
    ├── yamlGenerator.ts     # YAML generation utilities
    └── validation.ts        # Client-side validation
```

### Key Design Patterns
1. **Drag-and-Drop**: Actions can be dragged from sidebar to canvas
2. **Visual Programming**: Nodes represent actions, edges represent dependencies
3. **Real-time Preview**: YAML updates as workflow changes
4. **Responsive Design**: Works on desktop and tablet devices
5. **AI Integration**: Natural language input for workflow generation
6. **Smart Categorization**: 14 categories for intuitive action discovery
7. **State Management**: Zustand for global state, React hooks for local state
8. **Error Boundaries**: Graceful error handling throughout the UI

## Backend Architecture

### Technology Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Session-based (prepared for JWT)
- **API Integration**: Octokit (GitHub), OpenAI SDK
- **Security**: Helmet, CORS, Rate Limiting
- **Logging**: Morgan

### API Structure
```
backend/
├── models/
│   ├── Action.js            # GitHub Action metadata schema
│   └── WorkflowTemplate.js  # Pre-built workflow templates
├── routes/
│   ├── actions.js           # Action discovery endpoints
│   ├── workflows.js         # Workflow operations
│   ├── ai.js                # AI/LLM endpoints
│   └── health.js            # Health check endpoints
├── services/
│   ├── githubService.js     # GitHub API integration
│   ├── aiService.js         # OpenAI integration
│   └── validationService.js # actionlint wrapper
├── utils/
│   ├── actionDiscovery.js   # Action parsing utilities
│   ├── cache.js             # LRU cache implementation
│   └── errorHandler.js      # Centralized error handling
└── middleware/
    ├── auth.js              # Authentication middleware
    ├── rateLimiter.js       # Rate limiting config
    └── validation.js        # Request validation
```

### API Endpoints

#### Actions
- `GET /api/actions` - List all actions with filtering
- `GET /api/actions/:id` - Get specific action details
- `POST /api/actions/search` - Advanced action search

#### Workflows
- `GET /api/templates` - Get workflow templates
- `POST /api/workflows/validate` - Validate YAML syntax
- `POST /api/workflows/optimize` - Get optimization suggestions
- `POST /api/workflows/save` - Save custom workflow

#### AI Integration
- `POST /api/ai/generate` - Generate workflow from prompt
- `POST /api/ai/suggest` - Get action suggestions
- `POST /api/ai/explain` - Explain workflow purpose

## Data Models

### Action Schema
```javascript
{
  name: String,
  description: String,
  repository: String,        // owner/repo@version
  category: String,          // One of 14 intelligent categories
  author: String,
  stars: Number,
  lastUpdated: Date,
  inputs: Map,              // Input parameters with validation
  outputs: Map,             // Output variables  
  runs: Object,             // Execution config
  branding: Object,         // Icon and color
  keywords: [String],       // For enhanced search
  verified: Boolean,        // GitHub verified actions
  usage: {
    count: Number,          // Usage statistics
    lastUsed: Date
  }
}
```

### Categories
The system uses 14 intelligent categories:
- **setup**: Environment and tool setup (Node.js, Python, etc.)
- **build**: Compilation and building
- **test**: Testing and quality assurance  
- **deploy**: Deployment to various platforms
- **security**: Security scanning and compliance
- **docker**: Container operations
- **cloud**: Cloud provider integrations
- **notification**: Alerts and notifications
- **package**: Package management and publishing
- **documentation**: Doc generation and publishing
- **automation**: General automation tools
- **monitoring**: Monitoring and observability
- **utility**: Helper actions and utilities
- **mobile**: Mobile app specific actions

### WorkflowTemplate Schema
```javascript
{
  name: String,
  description: String,
  category: String,
  template: Object,         // Complete workflow YAML
  tags: [String],
  usageCount: Number
}
```

## External Integrations

### GitHub API
- **Purpose**: Fetch action metadata and repository information
- **Authentication**: Personal Access Token with proper scopes
- **Rate Limiting**: 5000 requests/hour (authenticated)
- **Caching**: 6-hour TTL for action metadata
- **Features**:
  - Action.yml parsing from repositories
  - Star count and popularity metrics
  - Author and organization information
  - Version tag resolution
  - Batch processing for efficiency

### OpenAI API
- **Purpose**: Natural language workflow generation
- **Model**: GPT-4 (gpt-4-turbo-preview)
- **Rate Limiting**: Custom limits (20 req/15min)
- **Context**: System prompts for workflow expertise
- **Features**:
  - Intelligent prompt engineering
  - Context-aware workflow generation
  - Error explanation in plain English
  - Optimization suggestions
  - Multi-step workflow understanding

### actionlint
- **Purpose**: YAML syntax validation
- **Integration**: CLI tool via child process
- **Performance**: Sub-second validation

## Security Considerations

1. **API Security**
   - Helmet.js for security headers
   - CORS configuration for frontend origin
   - Rate limiting per IP address
   - Input validation and sanitization

2. **Authentication** (Planned)
   - JWT-based authentication
   - OAuth integration with GitHub
   - Role-based access control

3. **Data Protection**
   - Environment variables for secrets
   - No sensitive data in logs
   - HTTPS enforcement in production

## Performance Optimizations

1. **Caching Strategy**
   - LRU cache for API responses
   - Database caching for actions
   - Browser caching for static assets

2. **Batch Processing**
   - Batch API requests to respect rate limits
   - Bulk database operations

3. **Lazy Loading**
   - On-demand action metadata fetching
   - Pagination for large result sets

## Deployment Architecture

### Docker Deployment
```yaml
Services:
  - MongoDB (Database)
  - Backend (Node.js API)
  - Frontend (Nginx + Static Files)
```

### Production Considerations
- Horizontal scaling for API servers
- MongoDB replica set for high availability
- CDN for static assets
- Load balancer for traffic distribution

## Future Architecture Enhancements

1. **Microservices Split**
   - Separate action discovery service
   - Dedicated AI service
   - Independent validation service

2. **Event-Driven Architecture**
   - WebSocket for real-time collaboration
   - Event sourcing for workflow history
   - Pub/sub for service communication

3. **Advanced Features**
   - Workflow versioning
   - Collaborative editing
   - Custom action marketplace
   - CI/CD integration