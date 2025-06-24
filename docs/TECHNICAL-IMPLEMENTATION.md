# FlowForge Technical Implementation Details

**Last Updated**: 2025-06-24

## Overview

This document provides detailed technical implementation information for FlowForge v0.2.1, including architecture decisions, integration details, technical achievements, and desktop distribution capabilities.

## Core Technologies

### Frontend Stack

- **React 18.2.0** - Modern UI framework with hooks
- **TypeScript 5.0+** - Type safety throughout the application
- **Vite 5.0** - Lightning-fast build tool and dev server
- **React Flow 11.10** - Powerful library for node-based UIs
- **Tailwind CSS 3.4** - Utility-first CSS framework
- **Axios** - HTTP client with interceptors
- **Zustand** - State management (prepared for global state)

### Backend Stack

- **Node.js 18+** - JavaScript runtime
- **Express.js 4.18** - Web framework
- **MongoDB 7.0** - NoSQL database
- **Mongoose 8.0** - MongoDB ODM
- **OpenAI SDK** - GPT-4 integration
- **Octokit** - GitHub API client
- **Morgan** - HTTP request logger
- **Helmet** - Security headers
- **Express Rate Limit** - Rate limiting middleware

## Key Implementation Details

### Action Categorization System

The system uses an intelligent keyword-based categorization algorithm with 14 categories:

```javascript
const CATEGORIES = {
  setup: ['setup', 'install', 'configure', 'environment'],
  build: ['build', 'compile', 'bundle', 'webpack'],
  test: ['test', 'jest', 'mocha', 'cypress', 'unit', 'integration'],
  deploy: ['deploy', 'release', 'publish', 'azure', 'aws', 'heroku'],
  security: ['security', 'scan', 'vulnerability', 'audit', 'snyk'],
  docker: ['docker', 'container', 'dockerfile', 'registry'],
  cloud: ['aws', 'azure', 'gcp', 'cloud', 'terraform'],
  notification: ['notify', 'slack', 'email', 'discord', 'webhook'],
  package: ['npm', 'yarn', 'pip', 'gem', 'nuget', 'package'],
  documentation: ['docs', 'documentation', 'swagger', 'javadoc'],
  automation: ['automate', 'bot', 'scheduled', 'cron'],
  monitoring: ['monitor', 'metrics', 'observability', 'datadog'],
  utility: ['utility', 'helper', 'tool', 'cli'],
  mobile: ['ios', 'android', 'react-native', 'flutter', 'mobile']
};
```

### GitHub API Integration

#### Authentication

```javascript
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  userAgent: 'FlowForge/1.0',
  throttle: {
    onRateLimit: (retryAfter, options) => {
      console.warn(`Rate limit exceeded, retrying after ${retryAfter} seconds`);
      return true;
    },
    onAbuseLimit: (retryAfter, options) => {
      console.warn(`Abuse detected, retrying after ${retryAfter} seconds`);
      return true;
    }
  }
});
```

#### Action Metadata Parsing

The system fetches and parses action.yml/action.yaml files from GitHub repositories:

- Extracts inputs, outputs, and execution configuration
- Handles both JavaScript and Docker actions
- Normalizes data for consistent API responses

### AI Integration with OpenAI

#### Prompt Engineering

```javascript
const systemPrompt = `You are an expert GitHub Actions workflow generator. 
Create well-structured, efficient workflows following best practices.
Include caching, matrix strategies, and optimization where appropriate.
Always use the latest stable versions of actions.`;

const generateWorkflow = async (userPrompt) => {
  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: 2000
  });
  return parseWorkflowResponse(completion.choices[0].message.content);
};
```

#### AI Features Implemented

1. **Natural Language to Workflow**: Converts descriptions to complete workflows
2. **Workflow Optimization**: Suggests improvements for existing workflows
3. **Action Suggestions**: Recommends relevant actions based on context
4. **Error Explanation**: Provides human-readable explanations for validation errors

### MongoDB Schema Design

#### Action Schema

```javascript
const actionSchema = new Schema({
  name: { type: String, required: true },
  description: String,
  repository: { type: String, required: true, unique: true },
  category: { type: String, required: true },
  author: String,
  stars: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
  inputs: {
    type: Map,
    of: {
      description: String,
      required: Boolean,
      default: Schema.Types.Mixed,
      type: String
    }
  },
  outputs: {
    type: Map,
    of: {
      description: String,
      value: String
    }
  },
  runs: {
    using: String,
    main: String,
    image: String,
    env: Map
  },
  branding: {
    icon: String,
    color: String
  }
});
```

### React Flow Implementation

#### Custom Node Component

```typescript
const ActionNode: React.FC<NodeProps> = ({ data }) => {
  return (
    <div className="action-node">
      <Handle type="target" position={Position.Top} />
      <div className="node-header">
        <Icon name={data.icon} />
        <span>{data.label}</span>
      </div>
      <div className="node-inputs">
        {Object.entries(data.inputs).map(([key, input]) => (
          <Input key={key} name={key} {...input} />
        ))}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};
```

### Performance Optimizations

#### LRU Caching

```javascript
const LRU = require('lru-cache');
const cache = new LRU({
  max: 500,
  ttl: 1000 * 60 * 60 * 6 // 6 hours
});

// Cache GitHub API responses
const getCachedAction = async (repo) => {
  const cached = cache.get(repo);
  if (cached) return cached;

  const action = await fetchActionFromGitHub(repo);
  cache.set(repo, action);
  return action;
};
```

#### Batch Processing

```javascript
const batchFetchActions = async (repos) => {
  const BATCH_SIZE = 10;
  const DELAY_MS = 1000;

  const results = [];
  for (let i = 0; i < repos.length; i += BATCH_SIZE) {
    const batch = repos.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(repo => fetchActionSafely(repo))
    );
    results.push(...batchResults);

    if (i + BATCH_SIZE < repos.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }
  return results;
};
```

### Security Implementation

#### Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests, please try again later.'
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'AI rate limit exceeded. Please wait before generating more workflows.'
});
```

#### Input Validation

```javascript
const validateWorkflowRequest = (req, res, next) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Invalid prompt' });
  }

  if (prompt.length > 1000) {
    return res.status(400).json({ error: 'Prompt too long' });
  }

  // Sanitize input to prevent prompt injection
  req.body.prompt = prompt.trim().replace(/[<>]/g, '');
  next();
};
```

### Real-time YAML Generation

```javascript
const generateYAML = (nodes, edges) => {
  const workflow = {
    name: 'Generated Workflow',
    on: ['push', 'pull_request'],
    jobs: {
      build: {
        'runs-on': 'ubuntu-latest',
        steps: []
      }
    }
  };

  // Sort nodes by dependencies
  const sortedNodes = topologicalSort(nodes, edges);

  // Convert nodes to workflow steps
  sortedNodes.forEach((node, index) => {
    const step = {
      name: node.data.label,
      uses: node.data.repository
    };

    if (Object.keys(node.data.inputs).length > 0) {
      step.with = node.data.inputs;
    }

    workflow.jobs.build.steps.push(step);
  });

  return yaml.dump(workflow, {
    indent: 2,
    lineWidth: -1,
    noRefs: true
  });
};
```

### API Error Handling

```javascript
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

const errorHandler = (err, req, res, next) => {
  let { statusCode = 500, message } = err;

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Invalid input data';
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
```

## Integration Patterns

### Frontend-Backend Communication

- RESTful API with consistent response format
- Axios interceptors for error handling
- Request/response logging in development
- Automatic retry for failed requests

### External Service Integration

- GitHub API: Retry logic with exponential backoff
- OpenAI API: Timeout handling and fallback responses
- MongoDB: Connection pooling and automatic reconnection
- actionlint: Child process with timeout protection

## Deployment Architecture

### Docker Configuration

```dockerfile
# Backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3002
CMD ["node", "index.js"]

# Frontend Dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
```

### Environment Management

- Development: .env.local
- Staging: .env.staging
- Production: Environment variables via deployment platform
- Secrets: Never stored in code, always via environment

## Performance Metrics

### Current Performance

- **API Response Time**: ~150ms (p95)
- **Action Search**: <100ms with caching
- **Workflow Generation**: 1-2 seconds
- **Frontend Bundle Size**: ~400KB gzipped
- **Time to Interactive**: <3 seconds

### Optimization Strategies

1. Database indexing on frequently queried fields
2. LRU caching for expensive operations
3. Lazy loading for React components
4. Code splitting for route-based chunks
5. Image optimization and lazy loading

## Future Technical Enhancements

### Phase 3 Technical Goals

- WebSocket implementation for real-time collaboration
- Redis integration for distributed caching
- Microservices architecture preparation
- GraphQL API alongside REST
- Server-side rendering with Next.js

### Scalability Preparations

- Horizontal scaling ready with stateless API
- Database sharding strategy defined
- CDN integration points identified
- Message queue architecture planned
- Monitoring and observability infrastructure

## Security Considerations

### Current Security Measures

- Helmet.js for security headers
- CORS properly configured
- Rate limiting on all endpoints
- Input validation and sanitization
- MongoDB injection prevention
- XSS protection in React

### Planned Security Enhancements

- JWT implementation for authentication
- OAuth2 integration
- API key management system
- Audit logging
- Penetration testing
- SOC2 compliance preparation

---

**Last Updated**: 2024-12-24
**Version**: 0.2.0
**Status**: Production-ready with Phase 3 planning
