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
const axios = require('axios');
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
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Initialize services
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

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
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/flowforge', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

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
    of: {
      description: String,
      required: Boolean,
      default: String,
      type: String
    }
  },
  outputs: {
    type: Map,
    of: {
      description: String
    }
  },
  runs: {
    using: String,
    main: String,
    pre: String,
    post: String
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
    const repoRegex = /https:\/\/github\.com\/([^\/\s]+\/[^\/\s]+)(?:\/|$|\s)/g;
    const matches = content.matchAll(repoRegex);
    
    const repositories = [];
    for (const match of matches) {
      const [owner, repo] = match[1].split('/');
      // Filter out non-action repositories
      if (!repo.includes('.github') && !repo.includes('awesome')) {
        repositories.push({
          owner,
          repo,
          full_name: match[1]
        });
      }
    }

    console.log(`Found ${repositories.length} action repositories`);
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
    // Try to fetch action.yml or action.yaml
    let actionFile;
    try {
      actionFile = await octokit.repos.getContent({
        owner,
        repo,
        path: 'action.yml'
      });
    } catch (e) {
      actionFile = await octokit.repos.getContent({
        owner,
        repo,
        path: 'action.yaml'
      });
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
    console.error(`Error fetching metadata for ${owner}/${repo}:`, error.message);
    return null;
  }
}

/**
 * Categorize an action based on its metadata and repository name
 * @param {Object} metadata - Action metadata
 * @param {string} repoName - Repository name
 * @returns {string} Category name
 */
function categorizeAction(metadata, repoName) {
  const name = (metadata.name || repoName).toLowerCase();
  const description = (metadata.description || '').toLowerCase();
  
  if (name.includes('deploy') || description.includes('deploy')) return 'deployment';
  if (name.includes('test') || description.includes('test')) return 'testing';
  if (name.includes('build') || name.includes('compile')) return 'build';
  if (name.includes('setup') || name.includes('install')) return 'setup';
  if (name.includes('security') || name.includes('scan')) return 'security';
  if (name.includes('notify') || name.includes('slack') || name.includes('email')) return 'notification';
  if (name.includes('docker') || name.includes('container')) return 'containerization';
  if (name.includes('cache') || name.includes('artifact')) return 'utilities';
  
  return 'other';
}

/**
 * Update the action database with latest information
 * This function is called periodically to keep the database fresh
 */
async function updateActionDatabase() {
  console.log('Starting action database update...');
  
  try {
    const repositories = await fetchAwesomeActions();
    let updated = 0;
    let failed = 0;

    // Process repositories in batches to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < repositories.length; i += batchSize) {
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
          } catch (error) {
            console.error(`Failed to save ${owner}/${repo}:`, error.message);
            failed++;
          }
        } else {
          failed++;
        }
      }));

      // Add delay between batches to respect rate limits
      if (i + batchSize < repositories.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`Update complete. Updated: ${updated}, Failed: ${failed}`);
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
    const systemPrompt = `You are a GitHub Actions workflow expert. Generate a workflow configuration based on the user's request.
    Return a JSON object with the following structure:
    {
      "name": "Workflow name",
      "description": "Brief description",
      "actions": [
        {
          "name": "Action name",
          "repository": "owner/repo@version",
          "inputs": { "key": "value" },
          "order": 1
        }
      ],
      "workflow": {
        "name": "Workflow Name",
        "on": ["push"],
        "jobs": { ... }
      }
    }`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });

    const content = response.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    console.error('AI generation error:', error);
    throw new Error('Failed to generate workflow with AI');
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
    const { stdout, stderr } = await execAsync(`actionlint ${tempFile}`);
    
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
    } catch (e) {}
    
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
 * POST /api/ai/generate
 * Generate workflow suggestions using AI
 */
app.post('/api/ai/generate', aiLimiter, async (req, res) => {
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
                  key: "${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}",
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

// Initialize server
async function startServer() {
  try {
    // Wait for MongoDB connection
    await mongoose.connection.asPromise();
    console.log('Connected to MongoDB');

    // Start server
    app.listen(PORT, () => {
      console.log(`FlowForge API server running on port ${PORT}`);
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
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

// Start the server
startServer();