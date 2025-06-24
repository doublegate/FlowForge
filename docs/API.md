# FlowForge API Documentation

**Last Updated**: 2025-06-24
**Version**: 0.2.1

## Base URL
```
Development: http://localhost:3001/api
Production: https://api.flowforge.dev/api
Desktop: http://localhost:3001/api (embedded in Flatpak)
```

## Authentication
Currently, the API is open. Future versions will implement JWT-based authentication.

## Rate Limiting
- General endpoints: 100 requests per 15 minutes
- AI endpoints: 20 requests per 15 minutes

## Endpoints

### Actions

#### List Actions
```http
GET /api/actions
```

Query Parameters:
- `category` (string): Filter by category (build, test, deploy, etc.)
- `search` (string): Search in name, description, or repository
- `limit` (number): Results per page (default: 50)
- `offset` (number): Pagination offset (default: 0)

Response:
```json
{
  "actions": [
    {
      "_id": "action_id",
      "name": "Checkout",
      "description": "Checkout a Git repository",
      "repository": "actions/checkout@v4",
      "category": "setup",
      "stars": 5000,
      "inputs": {
        "repository": {
          "description": "Repository name with owner",
          "required": false,
          "default": "${{ github.repository }}"
        }
      }
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

#### Get Action Details
```http
GET /api/actions/:id
```

Response:
```json
{
  "_id": "action_id",
  "name": "Setup Node.js",
  "description": "Set up a specific version of Node.js",
  "repository": "actions/setup-node@v4",
  "category": "setup",
  "author": "actions",
  "stars": 3000,
  "lastUpdated": "2024-01-15T10:30:00Z",
  "inputs": {
    "node-version": {
      "description": "Version Spec of the version to use",
      "required": true,
      "type": "string"
    }
  },
  "outputs": {
    "node-version": {
      "description": "The installed node version"
    }
  },
  "runs": {
    "using": "node20",
    "main": "dist/index.js"
  },
  "branding": {
    "icon": "code",
    "color": "green"
  }
}
```

### AI Integration

#### Generate Workflow
```http
POST /api/ai/generate-workflow
```

Request Body:
```json
{
  "prompt": "Create a workflow that builds and tests a Node.js application",
  "options": {
    "complexity": "medium",    // simple, medium, complex
    "optimize": true,         // Include optimization suggestions
    "explain": true          // Include explanations
  }
}
```

Response:
```json
{
  "success": true,
  "workflow": {
    "name": "Node.js CI",
    "description": "Comprehensive CI/CD pipeline for Node.js applications",
    "on": {
      "push": {
        "branches": ["main", "develop"]
      },
      "pull_request": {
        "branches": ["main"]
      }
    },
    "jobs": {
      "test": {
        "runs-on": "ubuntu-latest",
        "strategy": {
          "matrix": {
            "node-version": [16, 18, 20]
          }
        },
        "steps": [
          {
            "name": "Checkout code",
            "uses": "actions/checkout@v4"
          },
          {
            "name": "Setup Node.js",
            "uses": "actions/setup-node@v4",
            "with": {
              "node-version": "${{ matrix.node-version }}",
              "cache": "npm"
            }
          },
          {
            "name": "Install dependencies",
            "run": "npm ci"
          },
          {
            "name": "Run tests",
            "run": "npm test"
          }
        ]
      }
    }
  },
  "explanation": "This workflow runs on push to main/develop branches and on pull requests. It tests against multiple Node.js versions for compatibility.",
  "optimizations": [
    "Uses npm ci for faster, reproducible installs",
    "Caches npm dependencies for speed",
    "Tests multiple Node.js versions in parallel"
  ]
}
```

#### Get Workflow Suggestions
```http
POST /api/ai/suggest
```

Request Body:
```json
{
  "context": "React application with TypeScript",
  "currentWorkflow": {}, // Optional: existing workflow to enhance
  "goals": ["testing", "deployment", "security"]
}
```

Response:
```json
{
  "suggestions": [
    {
      "action": "codecov/codecov-action@v3",
      "reason": "Add code coverage reporting for better visibility",
      "placement": "after-tests"
    },
    {
      "action": "actions/upload-artifact@v3",
      "reason": "Save build artifacts for deployment",
      "placement": "after-build"
    }
  ]
}
```

### Workflows

#### Validate Workflow
```http
POST /api/workflows/validate
```

Request Body:
```json
{
  "yaml": "name: My Workflow\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest"
}
```

Response:
```json
{
  "valid": true,
  "errors": []
}
```

Error Response:
```json
{
  "valid": false,
  "errors": [
    "Line 5: Invalid YAML syntax",
    "Line 10: Unknown action 'invalid/action'"
  ]
}
```

#### Get Workflow Templates
```http
GET /api/templates
```

Query Parameters:
- `category` (string): Filter by category
- `search` (string): Search in name, description, or tags

Response:
```json
[
  {
    "_id": "template_id",
    "name": "Node.js CI/CD Pipeline",
    "description": "Complete CI/CD pipeline for Node.js",
    "category": "nodejs",
    "tags": ["node", "javascript", "npm", "test"],
    "template": {
      "name": "Node.js CI/CD",
      "on": {
        "push": {
          "branches": ["main"]
        }
      },
      "jobs": {...}
    },
    "usageCount": 245
  }
]
```

#### Optimize Workflow
```http
POST /api/workflows/optimize
```

Request Body:
```json
{
  "workflow": {
    "name": "My Workflow",
    "jobs": {
      "build": {
        "steps": [...]
      }
    }
  }
}
```

Response:
```json
{
  "optimizations": [
    {
      "type": "cache",
      "message": "Consider adding dependency caching to speed up builds",
      "suggestion": {
        "uses": "actions/cache@v3",
        "with": {
          "path": "~/.npm",
          "key": "${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}"
        }
      }
    }
  ]
}
```

### Health Check

#### System Health
```http
GET /api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "database": "connected"
}
```

## Error Responses

All endpoints follow a consistent error format:

```json
{
  "error": "Error message",
  "details": "Additional error details (optional)",
  "code": "ERROR_CODE"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request
- `404`: Not Found
- `429`: Too Many Requests
- `500`: Internal Server Error

## Webhook Events (Future)

The API will support webhooks for:
- Workflow execution status
- Action updates
- Template usage statistics

## SDK Examples

### JavaScript/TypeScript
```typescript
import axios from 'axios';

const flowforgeAPI = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// List actions
const actions = await flowforgeAPI.get('/actions', {
  params: { category: 'build', limit: 20 }
});

// Generate workflow with AI
const workflow = await flowforgeAPI.post('/ai/generate', {
  prompt: 'Deploy a React app to GitHub Pages'
});
```

### Python
```python
import requests

BASE_URL = 'http://localhost:3001/api'

# List actions
response = requests.get(f'{BASE_URL}/actions', params={
    'category': 'testing',
    'search': 'jest'
})
actions = response.json()

# Validate workflow
response = requests.post(f'{BASE_URL}/workflows/validate', json={
    'yaml': workflow_content
})
validation = response.json()
```

### cURL
```bash
# List actions
curl "http://localhost:3001/api/actions?category=deployment&limit=10"

# Generate workflow with AI
curl -X POST http://localhost:3001/api/ai/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Create a Docker build and push workflow"}'

# Validate workflow
curl -X POST http://localhost:3001/api/workflows/validate \
  -H "Content-Type: application/json" \
  -d '{"yaml": "name: Test\non: [push]"}'
```