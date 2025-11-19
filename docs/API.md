# FlowForge API Documentation

**Last Updated**: 2025-11-19
**Version**: 0.7.0

## Base URL

```ascii
Development: http://localhost:3002/api
Production: https://api.flowforge.dev/api
Desktop: http://localhost:3002/api (embedded in Flatpak)
```

## Authentication

FlowForge uses JWT (JSON Web Token) based authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

Tokens are obtained via registration, login, or OAuth authentication.

## Rate Limiting

- General endpoints: 100 requests per 15 minutes
- AI endpoints: 20 requests per 15 minutes

**Rate Limit Headers**:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## Table of Contents

1. [Authentication](#authentication-endpoints)
2. [Workflows](#workflows)
3. [Import/Export](#importexport)
4. [GitHub Integration](#github-integration)
5. [Comments](#comments)
6. [Actions](#actions)
7. [AI Integration](#ai-integration)
8. [Analytics](#analytics)
9. [Templates](#templates)
10. [Error Handling](#error-responses)

## Endpoints

---

## Authentication Endpoints

### Register User

```http
POST /api/auth/register
```

Request Body:
```json
{
  "username": "string (required, 3-30 chars)",
  "email": "string (required, valid email)",
  "password": "string (required, min 8 chars)",
  "displayName": "string (optional)"
}
```

Response (201):
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "displayName": "string"
  },
  "token": "string (JWT)"
}
```

---

### Login

```http
POST /api/auth/login
```

Request Body:
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

Response (200):
```json
{
  "message": "Login successful",
  "user": {
    "id": "string",
    "username": "string",
    "email": "string"
  },
  "token": "string (JWT)"
}
```

---

### OAuth Authentication

```http
GET /api/auth/github
GET /api/auth/google
```

Initiates OAuth flow with the specified provider.

**Callback**: `/api/auth/{provider}/callback`

---

## Workflows

### List Workflows

```http
GET /api/workflows
```

**Authentication**: Required

Query Parameters:
- `category` (string): Filter by category
- `visibility` (string): Filter by visibility (private, team, public)
- `limit` (number): Results per page (default: 20)
- `offset` (number): Pagination offset (default: 0)

Response (200):
```json
{
  "workflows": [
    {
      "_id": "string",
      "name": "string",
      "description": "string",
      "category": "string",
      "visibility": "string",
      "owner": "string",
      "ownerName": "string",
      "nodes": [],
      "edges": [],
      "yaml": "string",
      "tags": ["string"],
      "stats": {
        "views": 0,
        "stars": 0,
        "forks": 0
      },
      "createdAt": "ISO date",
      "updatedAt": "ISO date"
    }
  ],
  "total": 0
}
```

---

### Search Workflows

```http
GET /api/workflows/search
```

**Authentication**: Required

**New in v0.7.0**: Advanced search with multiple filters

Query Parameters:
- `q` (string): Search query (name, description, tags)
- `category` (string): Filter by category
- `tags` (string): Comma-separated tags
- `visibility` (string): Filter by visibility (all, private, team, public)
- `owner` (string): Filter by owner username
- `dateFrom` (string): ISO date (created after)
- `dateTo` (string): ISO date (created before)
- `sortBy` (string): Sort option (relevance, newest, oldest, name, stars, views, updated)
- `limit` (number): Results per page (default: 20)
- `offset` (number): Pagination offset (default: 0)

Response (200):
```json
{
  "workflows": [...],
  "total": 42,
  "offset": 0,
  "limit": 20,
  "query": "string"
}
```

Example:
```
GET /api/workflows/search?q=docker&category=deployment&sortBy=stars&limit=10
```

---

### Get Workflow

```http
GET /api/workflows/:id
```

**Authentication**: Required

Response (200):
```json
{
  "_id": "string",
  "name": "string",
  "description": "string",
  "category": "string",
  "visibility": "string",
  "owner": "string",
  "ownerName": "string",
  "nodes": [],
  "edges": [],
  "yaml": "string",
  "tags": ["string"],
  "collaborators": [
    {
      "userId": "string",
      "username": "string",
      "role": "viewer|editor|admin"
    }
  ],
  "stats": {...},
  "githubDeployments": [...],
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### Create Workflow

```http
POST /api/workflows
```

**Authentication**: Required

Request Body:
```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "category": "string (required)",
  "visibility": "string (default: private)",
  "nodes": "array (required)",
  "edges": "array (required)",
  "yaml": "string (optional)",
  "tags": "array (optional)"
}
```

Response (201):
```json
{
  "workflow": {...},
  "message": "Workflow created successfully"
}
```

---

### Update Workflow

```http
PUT /api/workflows/:id
```

**Authentication**: Required (editor role)

Request Body: Same as Create (all fields optional)

Response (200):
```json
{
  "workflow": {...},
  "message": "Workflow updated successfully"
}
```

---

### Delete Workflow

```http
DELETE /api/workflows/:id
```

**Authentication**: Required (admin role)

Response (200):
```json
{
  "success": true,
  "message": "Workflow deleted successfully"
}
```

---

### Fork Workflow

```http
POST /api/workflows/:id/fork
```

**Authentication**: Required

Request Body:
```json
{
  "name": "string (optional)",
  "visibility": "string (optional)"
}
```

Response (201):
```json
{
  "workflow": {...},
  "message": "Workflow forked successfully"
}
```

---

### Star Workflow

```http
POST /api/workflows/:id/star
```

**Authentication**: Required

Response (200):
```json
{
  "starred": true,
  "stars": 42
}
```

---

### Manage Collaborators

#### List Collaborators

```http
GET /api/workflows/:id/collaborators
```

**Authentication**: Required

Response (200):
```json
{
  "collaborators": [
    {
      "userId": "string",
      "username": "string",
      "displayName": "string",
      "role": "viewer|editor|admin",
      "addedAt": "ISO date"
    }
  ]
}
```

#### Add Collaborator

```http
POST /api/workflows/:id/collaborators
```

**Authentication**: Required (admin role)

Request Body:
```json
{
  "userId": "string (required)",
  "role": "viewer|editor|admin (default: viewer)"
}
```

#### Update Collaborator Role

```http
PUT /api/workflows/:id/collaborators/:userId
```

**Authentication**: Required (admin role)

Request Body:
```json
{
  "role": "viewer|editor|admin"
}
```

#### Remove Collaborator

```http
DELETE /api/workflows/:id/collaborators/:userId
```

**Authentication**: Required (admin role)

---

## Import/Export

**New in v0.7.0**: Workflow portability features

### Export Workflow

```http
GET /api/workflows/:id/export
```

**Authentication**: Required

Query Parameters:
- `format` (string): Export format (json or yaml, default: json)
- `includeMetadata` (boolean): Include metadata (default: true)
- `includeStats` (boolean): Include statistics (default: false)
- `includeCollaborators` (boolean): Include collaborators (default: false)

Response (200) - JSON Format:
```json
{
  "version": "1.0",
  "exportDate": "ISO date",
  "source": "FlowForge",
  "workflow": {
    "name": "string",
    "description": "string",
    "category": "string",
    "tags": [],
    "nodes": [],
    "edges": [],
    "yaml": "string"
  },
  "metadata": {...},
  "stats": {...},
  "collaborators": [...]
}
```

Response (200) - YAML Format (Content-Type: text/yaml):
```yaml
name: Workflow Name
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
```

---

### Import Workflow

```http
POST /api/workflows/import
```

**Authentication**: Required

Request Body:
```json
{
  "data": "string (JSON or YAML content)",
  "format": "json|yaml",
  "source": "flowforge|github|custom (optional)"
}
```

Response (201):
```json
{
  "workflow": {...},
  "message": "Workflow imported successfully",
  "warnings": ["string (optional)"]
}
```

---

### Validate Import

```http
POST /api/workflows/validate-import
```

**Authentication**: Required

Request Body:
```json
{
  "data": "string (JSON or YAML content)",
  "format": "json|yaml"
}
```

Response (200):
```json
{
  "valid": true,
  "errors": [],
  "warnings": [],
  "preview": {
    "name": "string",
    "nodeCount": 0,
    "edgeCount": 0,
    "category": "string"
  }
}
```

---

## GitHub Integration

**New in v0.7.0**: Deploy workflows directly to GitHub repositories

### Connection Status

```http
GET /api/github/status
```

**Authentication**: Required

Response (200):
```json
{
  "connected": true,
  "tokenValid": true,
  "user": {
    "login": "username",
    "id": 12345,
    "name": "Full Name",
    "email": "email@example.com",
    "avatarUrl": "https://..."
  }
}
```

---

### Connect GitHub

```http
POST /api/github/connect
```

**Authentication**: Required

Request Body:
```json
{
  "accessToken": "string (required, GitHub Personal Access Token)"
}
```

Response (200):
```json
{
  "success": true,
  "user": {
    "login": "username",
    "id": 12345,
    "name": "Full Name",
    "email": "email@example.com"
  },
  "message": "GitHub account connected successfully"
}
```

**Token Requirements**:
- `repo` scope for private repositories
- `workflow` scope for deploying workflows
- `read:user` scope for user information

---

### Disconnect GitHub

```http
POST /api/github/disconnect
```

**Authentication**: Required

Response (200):
```json
{
  "success": true,
  "message": "GitHub account disconnected successfully"
}
```

---

### List Repositories

```http
GET /api/github/repositories
```

**Authentication**: Required

Query Parameters:
- `sort` (string): Sort order (updated, pushed, created, full_name)
- `page` (number): Page number (default: 1)

Response (200):
```json
{
  "repositories": [
    {
      "id": 12345,
      "name": "repo-name",
      "fullName": "owner/repo-name",
      "owner": "owner",
      "private": false,
      "description": "string",
      "defaultBranch": "main",
      "url": "https://github.com/owner/repo",
      "hasWorkflows": false
    }
  ],
  "total": 42
}
```

---

### List Repository Workflows

```http
GET /api/github/repositories/:owner/:repo/workflows
```

**Authentication**: Required

Response (200):
```json
{
  "workflows": [
    {
      "name": "ci.yml",
      "path": ".github/workflows/ci.yml",
      "sha": "abc123",
      "size": 1024,
      "url": "https://github.com/...",
      "downloadUrl": "https://..."
    }
  ],
  "total": 3
}
```

---

### Fetch Workflow Content

```http
GET /api/github/repositories/:owner/:repo/workflows/:path(*)
```

**Authentication**: Required

Response (200):
```json
{
  "content": "name: CI\non:\n  push:\n...",
  "path": ".github/workflows/ci.yml"
}
```

---

### Deploy Workflow

```http
POST /api/github/workflows/:id/deploy
```

**Authentication**: Required (editor role)

Request Body:
```json
{
  "owner": "string (required, repo owner)",
  "repo": "string (required, repo name)",
  "branch": "string (optional, default: main)",
  "path": "string (optional, default: .github/workflows/{name}.yml)",
  "commitMessage": "string (optional)",
  "createPullRequest": "boolean (default: false)",
  "prTitle": "string (optional, required if createPullRequest)",
  "prBody": "string (optional)"
}
```

Response (200):
```json
{
  "success": true,
  "deployment": {
    "commit": {
      "sha": "abc123",
      "url": "https://github.com/..."
    },
    "file": {
      "path": ".github/workflows/workflow.yml",
      "url": "https://github.com/..."
    },
    "branch": "main",
    "pullRequest": {
      "number": 42,
      "url": "https://github.com/.../pull/42",
      "title": "Add workflow: My Workflow"
    }
  },
  "message": "Pull request created successfully"
}
```

---

## Comments

**New in v0.7.0**: Workflow discussions and collaboration

### Get Workflow Comments

```http
GET /api/comments/workflow/:workflowId
```

**Authentication**: Required

Query Parameters:
- `includeReplies` (boolean): Include threaded replies (default: true)
- `limit` (number): Results per page (default: 50)
- `offset` (number): Pagination offset (default: 0)

Response (200):
```json
{
  "comments": [
    {
      "_id": "string",
      "workflowId": "string",
      "content": "string",
      "authorId": "string",
      "authorName": "string",
      "parentId": null,
      "nodeId": null,
      "mentions": [
        {
          "userId": "string",
          "username": "string"
        }
      ],
      "reactions": [
        {
          "userId": "string",
          "type": "like"
        }
      ],
      "isEdited": false,
      "editedAt": null,
      "isDeleted": false,
      "createdAt": "ISO date",
      "updatedAt": "ISO date",
      "replies": [...]
    }
  ],
  "total": 42
}
```

---

### Create Comment

```http
POST /api/comments
```

**Authentication**: Required

Request Body:
```json
{
  "workflowId": "string (required)",
  "content": "string (required, max 5000 chars)",
  "parentId": "string (optional, for replies)",
  "nodeId": "string (optional, comment on specific node)"
}
```

Response (201):
```json
{
  "_id": "string",
  "workflowId": "string",
  "content": "string",
  "authorId": "string",
  "authorName": "string",
  "mentions": [...],
  "reactions": [],
  "createdAt": "ISO date"
}
```

**Features**:
- Automatically extracts @mentions from content
- Sends email notifications to mentioned users
- Supports threaded replies
- Comment on specific workflow nodes

---

### Edit Comment

```http
PUT /api/comments/:id
```

**Authentication**: Required (author only)

Request Body:
```json
{
  "content": "string (required, max 5000 chars)"
}
```

Response (200):
```json
{
  "_id": "string",
  "content": "string (updated)",
  "isEdited": true,
  "editedAt": "ISO date",
  "editHistory": [...]
}
```

---

### Delete Comment

```http
DELETE /api/comments/:id
```

**Authentication**: Required (author or workflow admin)

Response (200):
```json
{
  "success": true,
  "message": "Comment deleted"
}
```

---

### Add Reaction

```http
POST /api/comments/:id/reactions
```

**Authentication**: Required

Request Body:
```json
{
  "type": "like|love|laugh|surprised|sad|angry"
}
```

Response (200):
```json
{
  "_id": "string",
  "reactions": [...]
}
```

---

### Remove Reaction

```http
DELETE /api/comments/:id/reactions
```

**Authentication**: Required

Response (200):
```json
{
  "_id": "string",
  "reactions": [...]
}
```

---

### Get Edit History

```http
GET /api/comments/:id/history
```

**Authentication**: Required

Response (200):
```json
{
  "commentId": "string",
  "isEdited": true,
  "editedAt": "ISO date",
  "history": [
    {
      "content": "string",
      "editedAt": "ISO date"
    }
  ]
}
```

---

## Analytics

### Get Overview

```http
GET /api/analytics/overview
```

**Authentication**: Required

Response (200):
```json
{
  "totalWorkflows": 150,
  "totalUsers": 50,
  "totalExecutions": 1000,
  "avgExecutionTime": 45.5,
  "topCategories": [
    {
      "category": "ci-cd",
      "count": 50
    }
  ],
  "recentActivity": [...]
}
```

---

### Get Workflow Analytics

```http
GET /api/analytics/workflows/:id
```

**Authentication**: Required

Query Parameters:
- `period` (string): Time period (7d, 30d, 90d, all)

Response (200):
```json
{
  "workflowId": "string",
  "period": "30d",
  "views": 150,
  "stars": 10,
  "forks": 5,
  "executions": 50,
  "avgExecutionTime": 45.5,
  "successRate": 95.5,
  "timeline": [
    {
      "date": "2024-01-01",
      "views": 10,
      "executions": 5
    }
  ]
}
```

---

## Templates

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
  baseURL: 'http://localhost:3002/api',
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

BASE_URL = 'http://localhost:3002/api'

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
curl "http://localhost:3002/api/actions?category=deployment&limit=10"

# Generate workflow with AI
curl -X POST http://localhost:3002/api/ai/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Create a Docker build and push workflow"}'

# Validate workflow
curl -X POST http://localhost:3002/api/workflows/validate \
  -H "Content-Type: application/json" \
  -d '{"yaml": "name: Test\non: [push]"}'
```
