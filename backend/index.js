/**
 * FlowForge Backend API
 * 
 * This is the backend service for the FlowForge GitHub Actions Workflow Builder.
 * It provides REST API endpoints for:
 * - Fetching and caching GitHub Actions from the Awesome Actions repository
 * - AI/LLM integration for natural language workflow generation
 * - YAML validation and optimization
 * - Action metadata management
 * 
 * Architecture:
 * - Express.js for REST API framework
 * - MongoDB for caching action metadata
 * - OpenAI API for natural language processing
 * - GitHub API for fetching action details
 * - actionlint for YAML validation
 * 
 * @version 1.0.0
 * @author FlowForge Team
 */

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const _axios = require('axios');
const yaml = require('js-yaml');
const { Octokit } = require('@octokit/rest');
const OpenAI = require('openai');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Initialize Express app
const app = express();

// Global server instance for graceful shutdown
let server = null;
const PORT = process.env.PORT || 3002;

// Initialize services
const githubToken = process.env.GITHUB_TOKEN;
const octokit = new Octokit({
  auth: githubToken
});

// Log GitHub authentication status
if (!githubToken) {
  console.warn('WARNING: No GitHub token provided. API requests will be rate limited to 60/hour.');
} else if (githubToken.startsWith('ghp_')) {
  console.log('GitHub token detected (personal access token)');
} else if (githubToken.startsWith('ghs_')) {
  console.log('GitHub token detected (OAuth app token)');
} else {
  console.warn('WARNING: GitHub token format may be invalid');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Middleware configuration
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(morgan('combined')); // Logging

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // Limit each IP to 100 requests per windowMs
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20 // Limit AI requests to 20 per windowMs
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/flowforge');

/**
 * Action Schema
 * Defines the structure for storing GitHub Action metadata in MongoDB
 */
const ActionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  repository: { type: String, required: true, unique: true },
  category: String,
  version: String,
  author: String,
  stars: Number,
  lastUpdated: Date,
  inputs: {
    type: Map,
    of: new mongoose.Schema({
      description: String,
      required: { type: Boolean, default: false },
      default: String,
      type: String,
      options: [String]
    }, { _id: false })
  },
  outputs: {
    type: Map,
    of: new mongoose.Schema({
      description: String,
      value: String
    }, { _id: false })
  },
  runs: {
    using: String,
    main: String,
    pre: String,
    post: String,
    image: String,
    env: Map
  },
  branding: {
    icon: String,
    color: String
  }
}, {
  timestamps: true
});

const Action = mongoose.model('Action', ActionSchema);

/**
 * Workflow Template Schema
 * Stores pre-built workflow templates for common use cases
 */
const WorkflowTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  category: String,
  template: Object,
  tags: [String],
  usageCount: { type: Number, default: 0 }
}, {
  timestamps: true
});

const WorkflowTemplate = mongoose.model('WorkflowTemplate', WorkflowTemplateSchema);

/**
 * Workflow Schema
 * Stores user-created workflows
 */
const WorkflowSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  userId: String, // For future user authentication
  nodes: [{
    id: String,
    type: String,
    position: {
      x: Number,
      y: Number
    },
    data: Object
  }],
  edges: [{
    id: String,
    source: String,
    target: String,
    type: String
  }],
  yaml: String,
  tags: [String],
  isPublic: { type: Boolean, default: false },
  forkedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow' }
}, {
  timestamps: true
});

const Workflow = mongoose.model('Workflow', WorkflowSchema);

/**
 * Parse the Awesome Actions README to extract action repositories
 * @returns {Promise<Array>} Array of action repository URLs
 */
async function fetchAwesomeActions() {
  try {
    console.log('Fetching Awesome Actions repository...');
    const { data } = await octokit.repos.getContent({
      owner: 'sdras',
      repo: 'awesome-actions',
      path: 'README.md'
    });

    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    
    // Regular expression to match GitHub repository URLs
    // Updated to handle various edge cases and formats
    const repoRegex = /https:\/\/github\.com\/([a-zA-Z0-9-]+\/[a-zA-Z0-9-_.]+)(?:[/\s)#]|$)/g;
    const matches = content.matchAll(repoRegex);
    
    const repositories = [];
    const seen = new Set();
    
    for (const match of matches) {
      let fullName = match[1];
      
      // Clean up the repository name
      fullName = fullName.replace(/[).,;:]+$/, ''); // Remove trailing punctuation
      
      const parts = fullName.split('/');
      if (parts.length !== 2) continue;
      
      const [owner, repo] = parts;
      
      // Skip if already processed
      if (seen.has(fullName)) continue;
      seen.add(fullName);
      
      // Filter out non-action repositories and special cases
      if (repo.includes('.github') || 
          repo.includes('awesome') || 
          repo === 'actions' ||
          repo === 'marketplace' ||
          repo.endsWith('.md') ||
          repo.endsWith('.yml') ||
          repo.endsWith('.yaml')) {
        continue;
      }
      
      repositories.push({
        owner: owner.trim(),
        repo: repo.trim(),
        full_name: fullName
      });
    }

    console.log(`Found ${repositories.length} unique action repositories`);
    return repositories;
  } catch (error) {
    console.error('Error fetching Awesome Actions:', error);
    throw error;
  }
}

/**
 * Fetch action.yml metadata from a GitHub repository
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Object>} Parsed action metadata
 */
async function fetchActionMetadata(owner, repo) {
  try {
    // First check if we can access the GitHub API
    if (!githubToken) {
      console.warn(`Skipping ${owner}/${repo} - No GitHub token provided`);
      return null;
    }

    // Try to fetch action.yml or action.yaml
    let actionFile;
    try {
      actionFile = await octokit.repos.getContent({
        owner,
        repo,
        path: 'action.yml'
      });
    } catch (e) {
      // If action.yml not found, try action.yaml
      if (e.status === 404) {
        try {
          actionFile = await octokit.repos.getContent({
            owner,
            repo,
            path: 'action.yaml'
          });
        } catch (e2) {
          // Neither file found - this might not be an action repository
          if (e2.status === 404) {
            console.log(`No action file found for ${owner}/${repo} - skipping`);
            return null;
          }
          throw e2;
        }
      } else {
        throw e;
      }
    }

    const content = Buffer.from(actionFile.data.content, 'base64').toString('utf-8');
    const metadata = yaml.load(content);

    // Fetch repository details for additional info
    const { data: repoData } = await octokit.repos.get({ owner, repo });

    return {
      name: metadata.name || repo,
      description: metadata.description || repoData.description,
      repository: `${owner}/${repo}@${repoData.default_branch}`,
      author: metadata.author || owner,
      stars: repoData.stargazers_count,
      lastUpdated: repoData.updated_at,
      inputs: metadata.inputs || {},
      outputs: metadata.outputs || {},
      runs: metadata.runs || {},
      branding: metadata.branding || {},
      category: categorizeAction(metadata, repo)
    };
  } catch (error) {
    // Handle specific GitHub API errors
    if (error.status === 401) {
      console.error(`Authentication failed for ${owner}/${repo} - GitHub token may be invalid or expired`);
    } else if (error.status === 403) {
      console.error(`Rate limit exceeded or forbidden access for ${owner}/${repo}`);
    } else if (error.status === 404) {
      console.error(`Repository not found: ${owner}/${repo}`);
    } else {
      console.error(`Error fetching metadata for ${owner}/${repo}:`, error.message);
    }
    return null;
  }
}

// Import the advanced categorizer
const { categorizeAction } = require('./utils/actionCategorizer');

/**
 * Update the action database with latest information
 * This function is called periodically to keep the database fresh
 */
async function updateActionDatabase() {
  console.log('Starting action database update...');
  
  try {
    // Check rate limit before starting
    const { data: rateLimit } = await octokit.rest.rateLimit.get();
    console.log(`GitHub API rate limit: ${rateLimit.rate.remaining}/${rateLimit.rate.limit}`);
    
    if (rateLimit.rate.remaining < 100) {
      console.warn('Low GitHub API rate limit, postponing update');
      return;
    }
    
    const repositories = await fetchAwesomeActions();
    let updated = 0;
    let failed = 0;
    let skipped = 0;

    // Process repositories in batches to avoid rate limiting
    const batchSize = 5; // Reduced batch size for safety
    for (let i = 0; i < repositories.length && i < 50; i += batchSize) { // Limit to first 50 for now
      const batch = repositories.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async ({ owner, repo }) => {
        const metadata = await fetchActionMetadata(owner, repo);
        
        if (metadata) {
          try {
            await Action.findOneAndUpdate(
              { repository: metadata.repository },
              metadata,
              { upsert: true, new: true }
            );
            updated++;
            console.log(`✓ Updated ${owner}/${repo}`);
          } catch (error) {
            console.error(`Failed to save ${owner}/${repo}:`, error.message);
            failed++;
          }
        } else {
          skipped++;
        }
      }));

      // Add delay between batches to respect rate limits
      if (i + batchSize < Math.min(repositories.length, 50)) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // Increased delay
      }
    }

    console.log(`Update complete. Updated: ${updated}, Failed: ${failed}, Skipped: ${skipped}`);
  } catch (error) {
    console.error('Database update failed:', error);
  }
}

/**
 * Generate workflow suggestions using OpenAI
 * @param {string} prompt - User's natural language prompt
 * @returns {Promise<Object>} Workflow suggestion
 */
async function generateWorkflowWithAI(prompt) {
  try {
    // Fetch available actions for context
    const availableActions = await Action.find({}).limit(50).select('name repository description category');
    
    const systemPrompt = `You are an expert GitHub Actions workflow engineer. Generate a complete, production-ready workflow based on the user's request.

Available GitHub Actions (use these when relevant):
${availableActions.map(a => `- ${a.repository}: ${a.description}`).join('\n')}

IMPORTANT GUIDELINES:
1. Use the latest stable versions of actions (e.g., actions/checkout@v4, actions/setup-node@v4)
2. Include appropriate triggers (push, pull_request, workflow_dispatch, schedule, etc.)
3. Add proper job dependencies and conditions when needed
4. Include caching strategies for dependencies (npm, pip, gradle, etc.)
5. Add error handling and continue-on-error where appropriate
6. Use matrix builds for testing multiple versions/platforms
7. Include artifact upload/download for build outputs
8. Add proper environment variables and secrets usage
9. Consider adding status checks and notifications
10. Include comments explaining complex steps

Return a JSON object with this EXACT structure:
{
  "name": "Descriptive workflow name",
  "description": "Detailed explanation of what this workflow does and when it runs",
  "explanation": "Step-by-step explanation of the workflow for the user",
  "workflow": {
    "name": "Workflow Name",
    "on": {
      "push": { "branches": ["main"] },
      "pull_request": { "branches": ["main"] }
    },
    "env": {},
    "jobs": {
      "job-name": {
        "runs-on": "ubuntu-latest",
        "steps": [
          {
            "name": "Step name",
            "uses": "action/name@version",
            "with": { "param": "value" }
          }
        ]
      }
    }
  },
  "actions": [
    {
      "name": "Action display name",
      "repository": "owner/repo@version",
      "category": "setup|build|test|deploy|utility",
      "inputs": { "param": "value" }
    }
  ],
  "suggestions": [
    "Additional features you might want to add",
    "Security improvements",
    "Performance optimizations"
  ]
}`;

    const enhancedPrompt = `${prompt}

Please ensure the workflow includes:
- Proper error handling and retry logic where appropriate
- Caching for faster builds
- Clear step names and comments
- Security best practices (no hardcoded secrets, proper permissions)
- Efficient job structure with parallelization where possible`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: enhancedPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2500,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content;
    const result = JSON.parse(content);
    
    // Validate the response structure
    if (!result.workflow || !result.workflow.jobs) {
      throw new Error('Invalid workflow structure generated');
    }
    
    // Add timestamps and metadata
    result.generatedAt = new Date().toISOString();
    result.version = '1.0.0';
    
    return result;
  } catch (error) {
    console.error('AI generation error:', error);
    
    // Fallback to a simple template if AI fails
    return {
      name: 'Basic CI Workflow',
      description: 'A simple continuous integration workflow',
      explanation: 'This is a basic workflow template. The AI service is temporarily unavailable.',
      workflow: {
        name: 'CI',
        on: ['push', 'pull_request'],
        jobs: {
          build: {
            'runs-on': 'ubuntu-latest',
            steps: [
              { uses: 'actions/checkout@v4' },
              { 
                name: 'Run a one-line script',
                run: 'echo Hello, world!'
              }
            ]
          }
        }
      },
      actions: [],
      suggestions: ['Add your specific build and test steps']
    };
  }
}

/**
 * Validate GitHub Actions YAML using actionlint
 * @param {string} yamlContent - YAML content to validate
 * @returns {Promise<Object>} Validation result
 */
async function validateWorkflow(yamlContent) {
  const execAsync = promisify(exec);
  const tempFile = path.join(__dirname, `temp_${Date.now()}.yml`);
  
  try {
    // Write YAML to temporary file
    await fs.writeFile(tempFile, yamlContent);
    
    // Run actionlint
    const { stdout: _stdout, stderr } = await execAsync(`actionlint ${tempFile}`);
    
    // Clean up temp file
    await fs.unlink(tempFile);
    
    if (stderr) {
      return {
        valid: false,
        errors: stderr.split('\n').filter(line => line.trim())
      };
    }
    
    return {
      valid: true,
      errors: []
    };
  } catch (error) {
    // Clean up temp file on error
    try {
      await fs.unlink(tempFile);
    } catch (e) {
      // Ignore file cleanup errors
    }
    
    // Parse actionlint errors
    const errors = error.stdout ? error.stdout.split('\n').filter(line => line.trim()) : ['Unknown validation error'];
    
    return {
      valid: false,
      errors
    };
  }
}

// API Routes

/**
 * GET /api/actions
 * Retrieve all available actions with optional filtering
 */
app.get('/api/actions', apiLimiter, async (req, res) => {
  try {
    const { category, search, limit = 50, offset = 0 } = req.query;
    
    let query = {};
    if (category) {
      query.category = category;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { repository: { $regex: search, $options: 'i' } }
      ];
    }

    const actions = await Action.find(query)
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .sort({ stars: -1 });

    const total = await Action.countDocuments(query);

    res.json({
      actions,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching actions:', error);
    res.status(500).json({ error: 'Failed to fetch actions' });
  }
});

/**
 * GET /api/actions/:id
 * Get detailed information about a specific action
 */
app.get('/api/actions/:id', apiLimiter, async (req, res) => {
  try {
    const action = await Action.findById(req.params.id);
    
    if (!action) {
      return res.status(404).json({ error: 'Action not found' });
    }

    res.json(action);
  } catch (error) {
    console.error('Error fetching action:', error);
    res.status(500).json({ error: 'Failed to fetch action' });
  }
});

/**
 * POST /api/ai/generate-workflow
 * Generate complete workflow using AI
 */
app.post('/api/ai/generate-workflow', aiLimiter, async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const suggestion = await generateWorkflowWithAI(prompt);
    res.json(suggestion);
  } catch (error) {
    console.error('Error generating workflow:', error);
    res.status(500).json({ error: 'Failed to generate workflow' });
  }
});

/**
 * POST /api/ai/suggest
 * Get AI suggestions for improving a workflow
 */
app.post('/api/ai/suggest', aiLimiter, async (req, res) => {
  try {
    const { workflow, context } = req.body;
    
    if (!workflow) {
      return res.status(400).json({ error: 'Workflow is required' });
    }
    
    const suggestions = await getWorkflowSuggestions(workflow, context);
    res.json(suggestions);
  } catch (error) {
    console.error('Error getting suggestions:', error);
    res.status(500).json({ error: 'Failed to get workflow suggestions' });
  }
});

/**
 * Get AI suggestions for workflow improvements
 */
async function getWorkflowSuggestions(workflow, context = '') {
  try {
    const systemPrompt = `You are a GitHub Actions workflow optimization expert. Analyze the provided workflow and suggest improvements.

Focus on:
1. Performance optimizations (caching, parallelization, job dependencies)
2. Security improvements (permissions, secret management, vulnerability scanning)
3. Best practices (naming conventions, reusability, maintainability)
4. Cost optimization (reducing runner time, efficient resource usage)
5. Error handling and reliability (retry logic, timeout configurations)
6. Additional useful features (notifications, artifacts, releases)

Return a JSON object with this structure:
{
  "suggestions": [
    {
      "type": "performance|security|best-practice|cost|reliability|feature",
      "priority": "high|medium|low",
      "title": "Brief suggestion title",
      "description": "Detailed explanation of the suggestion",
      "implementation": "Code snippet or specific steps to implement",
      "impact": "Expected improvement or benefit"
    }
  ],
  "optimizedWorkflow": {
    // The improved workflow incorporating high-priority suggestions
  },
  "summary": "Overall assessment of the workflow"
}`;

    const userPrompt = `Analyze this GitHub Actions workflow and provide improvement suggestions:

${JSON.stringify(workflow, null, 2)}

${context ? `Additional context: ${context}` : ''}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result;
  } catch (error) {
    console.error('Suggestion generation error:', error);
    return {
      suggestions: [
        {
          type: 'best-practice',
          priority: 'medium',
          title: 'Add workflow documentation',
          description: 'Consider adding comments to explain complex steps',
          implementation: '# Add comments before each major step',
          impact: 'Improves maintainability'
        }
      ],
      summary: 'Unable to generate AI suggestions at this time'
    };
  }
}

/**
 * POST /api/workflows/validate
 * Validate a GitHub Actions workflow YAML
 */
app.post('/api/workflows/validate', apiLimiter, async (req, res) => {
  try {
    const { yaml: yamlContent } = req.body;
    
    if (!yamlContent) {
      return res.status(400).json({ error: 'YAML content is required' });
    }

    const validation = await validateWorkflow(yamlContent);
    res.json(validation);
  } catch (error) {
    console.error('Error validating workflow:', error);
    res.status(500).json({ error: 'Failed to validate workflow' });
  }
});

/**
 * GET /api/templates
 * Get workflow templates
 */
app.get('/api/templates', apiLimiter, async (req, res) => {
  try {
    const { category, search } = req.query;
    
    let query = {};
    if (category) {
      query.category = category;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const templates = await WorkflowTemplate.find(query).sort({ usageCount: -1 });
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

/**
 * POST /api/workflows/optimize
 * Optimize a workflow configuration
 */
app.post('/api/workflows/optimize', apiLimiter, async (req, res) => {
  try {
    const { workflow } = req.body;
    
    // Optimization logic
    const optimizations = [];
    
    // Check for caching opportunities
    if (workflow.jobs) {
      Object.values(workflow.jobs).forEach(job => {
        if (job.steps) {
          const hasNodeSetup = job.steps.some(step => 
            step.uses && step.uses.includes('actions/setup-node')
          );
          const hasCaching = job.steps.some(step => 
            step.uses && step.uses.includes('actions/cache')
          );
          
          if (hasNodeSetup && !hasCaching) {
            optimizations.push({
              type: 'cache',
              message: 'Consider adding dependency caching to speed up builds',
              suggestion: {
                uses: 'actions/cache@v3',
                with: {
                  path: '~/.npm',
                  key: '${{ runner.os }}-node-${{ hashFiles(\'**/package-lock.json\') }}',
                  'restore-keys': '${{ runner.os }}-node-'
                }
              }
            });
          }
        }
      });
    }
    
    res.json({ optimizations });
  } catch (error) {
    console.error('Error optimizing workflow:', error);
    res.status(500).json({ error: 'Failed to optimize workflow' });
  }
});

/**
 * Workflow CRUD endpoints
 */

/**
 * GET /api/workflows
 * Get all workflows (with pagination)
 */
app.get('/api/workflows', apiLimiter, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const query = req.query.public === 'true' ? { isPublic: true } : {};
    
    const workflows = await Workflow.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .select('-yaml'); // Exclude yaml for list view
    
    const total = await Workflow.countDocuments(query);
    
    res.json({
      workflows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

/**
 * GET /api/workflows/:id
 * Get a specific workflow
 */
app.get('/api/workflows/:id', apiLimiter, async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    res.json(workflow);
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
});

/**
 * POST /api/workflows
 * Create a new workflow
 */
app.post('/api/workflows', apiLimiter, async (req, res) => {
  try {
    const { name, description, nodes, edges, yaml, tags, isPublic } = req.body;
    
    if (!name || !nodes || !edges) {
      return res.status(400).json({ error: 'Name, nodes, and edges are required' });
    }
    
    const workflow = new Workflow({
      name,
      description,
      nodes,
      edges,
      yaml,
      tags,
      isPublic: isPublic || false
    });
    
    await workflow.save();
    
    res.status(201).json(workflow);
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

/**
 * PUT /api/workflows/:id
 * Update a workflow
 */
app.put('/api/workflows/:id', apiLimiter, async (req, res) => {
  try {
    const { name, description, nodes, edges, yaml, tags, isPublic } = req.body;
    
    const workflow = await Workflow.findById(req.params.id);
    
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    // Update fields
    if (name !== undefined) workflow.name = name;
    if (description !== undefined) workflow.description = description;
    if (nodes !== undefined) workflow.nodes = nodes;
    if (edges !== undefined) workflow.edges = edges;
    if (yaml !== undefined) workflow.yaml = yaml;
    if (tags !== undefined) workflow.tags = tags;
    if (isPublic !== undefined) workflow.isPublic = isPublic;
    
    await workflow.save();
    
    res.json(workflow);
  } catch (error) {
    console.error('Error updating workflow:', error);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

/**
 * DELETE /api/workflows/:id
 * Delete a workflow
 */
app.delete('/api/workflows/:id', apiLimiter, async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    await workflow.deleteOne();
    
    res.json({ message: 'Workflow deleted successfully' });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

/**
 * POST /api/workflows/:id/fork
 * Fork a public workflow
 */
app.post('/api/workflows/:id/fork', apiLimiter, async (req, res) => {
  try {
    const originalWorkflow = await Workflow.findById(req.params.id);
    
    if (!originalWorkflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    if (!originalWorkflow.isPublic) {
      return res.status(403).json({ error: 'Cannot fork private workflow' });
    }
    
    const forkedWorkflow = new Workflow({
      name: `${originalWorkflow.name} (Fork)`,
      description: originalWorkflow.description,
      nodes: originalWorkflow.nodes,
      edges: originalWorkflow.edges,
      yaml: originalWorkflow.yaml,
      tags: originalWorkflow.tags,
      isPublic: false,
      forkedFrom: originalWorkflow._id
    });
    
    await forkedWorkflow.save();
    
    res.status(201).json(forkedWorkflow);
  } catch (error) {
    console.error('Error forking workflow:', error);
    res.status(500).json({ error: 'Failed to fork workflow' });
  }
});

/**
 * GET /api/categories
 * Get all available action categories
 */
app.get('/api/categories', (req, res) => {
  const { CATEGORIES } = require('./utils/actionCategorizer');
  
  const categories = Object.entries(CATEGORIES).map(([key, value]) => ({
    id: key,
    name: value.name,
    description: value.description,
    keywords: value.keywords
  }));
  
  res.json(categories);
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

/**
 * GET /api/github/test
 * Test GitHub API authentication
 */
app.get('/api/github/test', async (req, res) => {
  try {
    // Test authentication by getting the authenticated user
    const { data: user } = await octokit.rest.users.getAuthenticated();
    
    // Get rate limit info
    const { data: rateLimit } = await octokit.rest.rateLimit.get();
    
    res.json({
      authenticated: true,
      user: user.login,
      rateLimitRemaining: rateLimit.rate.remaining,
      rateLimitReset: new Date(rateLimit.rate.reset * 1000).toISOString()
    });
  } catch (error) {
    res.status(401).json({
      authenticated: false,
      error: error.message,
      hint: 'Please check your GitHub token in the .env file'
    });
  }
});

/**
 * POST /api/actions/update
 * Manually trigger action database update
 */
app.post('/api/actions/update', async (req, res) => {
  try {
    // Start the update in the background
    updateActionDatabase().catch(console.error);
    
    res.json({
      message: 'Action database update started',
      hint: 'Check server logs for progress'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to start update',
      message: error.message
    });
  }
});

// Initialize server
async function startServer() {
  try {
    // Wait for MongoDB connection FIRST
    await mongoose.connection.asPromise();
    console.log('Connected to MongoDB');

    // Only start server AFTER database is confirmed working
    server = app.listen(PORT, (err) => {
      if (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
      }
      console.log(`FlowForge API server running on port ${PORT}`);
      console.log(`Server PID: ${process.pid}`);
    });

    // Schedule periodic updates (every 6 hours)
    setInterval(updateActionDatabase, 6 * 60 * 60 * 1000);

    // Perform initial update if database is empty
    const actionCount = await Action.countDocuments();
    if (actionCount === 0) {
      console.log('Database is empty, performing initial update...');
      updateActionDatabase();
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received, starting graceful shutdown...`);
  
  // Stop accepting new connections
  if (server) {
    console.log('Closing HTTP server...');
    await new Promise((resolve) => {
      server.close(resolve);
    });
    console.log('HTTP server closed');
  }
  
  // Close database connection
  if (mongoose.connection.readyState === 1) {
    console.log('Closing MongoDB connection...');
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
  
  console.log('Graceful shutdown complete');
  process.exit(0);
};

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
startServer();