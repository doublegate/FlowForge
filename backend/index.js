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
const yaml = require('js-yaml');
const { Octokit } = require('@octokit/rest');
const OpenAI = require('openai');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

// Import utilities
const logger = require('./utils/logger');
const requestLogger = require('./middleware/requestLogger');
const errorLogger = require('./middleware/errorLogger');

// Import route modules
const authRoutes = require('./routes/auth');
const workflowRoutes = require('./routes/workflows');
const analyticsRoutes = require('./routes/analytics');
const githubRoutes = require('./routes/github');
const commentsRoutes = require('./routes/comments');

// Import services
const scheduler = require('./services/scheduler');

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
  logger.warn('No GitHub token provided. API requests will be rate limited to 60/hour.');
} else if (githubToken.startsWith('ghp_')) {
  logger.info('GitHub token detected (personal access token)');
} else if (githubToken.startsWith('ghs_')) {
  logger.info('GitHub token detected (OAuth app token)');
} else {
  logger.warn('GitHub token format may be invalid');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Middleware configuration
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(requestLogger); // Request logging with Winston

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
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Owner of the workflow
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

// Add indexes for performance
WorkflowSchema.index({ userId: 1, createdAt: -1 });
WorkflowSchema.index({ isPublic: 1, createdAt: -1 });

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
    } catch (_e) {
      // If action.yml not found, try action.yaml
      if (_e.status === 404) {
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
        throw _e;
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
      model: 'gpt-4o',
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
    console.error('AI generation error:', error.message);
    console.error('Error details:', error);
    console.error('OpenAI API Key present:', !!process.env.OPENAI_API_KEY);
    
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
  const execFileAsync = promisify(execFile);

  // Input validation and sanitization
  if (typeof yamlContent !== 'string') {
    return {
      valid: false,
      errors: [{ message: 'Invalid YAML content: must be a string', severity: 'error' }],
      warnings: [],
      suggestions: []
    };
  }

  // Limit YAML size to prevent DoS
  if (yamlContent.length > 100000) { // 100KB limit
    return {
      valid: false,
      errors: [{ message: 'YAML content too large (max 100KB)', severity: 'error' }],
      warnings: [],
      suggestions: []
    };
  }

  // Basic YAML structure validation
  try {
    yaml.load(yamlContent);
  } catch (yamlError) {
    return {
      valid: false,
      errors: [{ message: `Invalid YAML syntax: ${yamlError.message}`, severity: 'error' }],
      warnings: [],
      suggestions: []
    };
  }

  // Generate secure temp filename with random suffix
  const randomSuffix = Math.random().toString(36).substring(2, 15);
  const tempFile = path.join(__dirname, `temp_workflow_${Date.now()}_${randomSuffix}.yml`);

  /**
   * Parse actionlint output line
   * Format: filename:line:col: message [rule-name]
   */
  const parseActionlintLine = (line) => {
    if (!line.trim()) return null;

    // Match pattern: filename:line:col: message [rule-name]
    const match = line.match(/^(.+?):(\d+):(\d+):\s*(.+?)(?:\s+\[(.+?)\])?$/);

    if (match) {
      const [, , lineNum, colNum, message, rule] = match;

      // Determine severity based on keywords
      let severity = 'warning';
      const lowerMessage = message.toLowerCase();

      if (lowerMessage.includes('error') || lowerMessage.includes('invalid') || lowerMessage.includes('required')) {
        severity = 'error';
      } else if (lowerMessage.includes('deprecated') || lowerMessage.includes('recommend') || lowerMessage.includes('should')) {
        severity = 'info';
      }

      return {
        line: parseInt(lineNum),
        column: parseInt(colNum),
        message: message.trim(),
        severity,
        rule: rule || undefined
      };
    }

    // Fallback for unformatted lines
    return {
      line: 0,
      column: 0,
      message: line.trim(),
      severity: 'warning'
    };
  };

  try {
    // Sanitize YAML content before writing - remove control characters
    const sanitizedContent = yamlContent
      .split('').filter(char => {
        const code = char.charCodeAt(0);
        // Keep printable characters, newlines, tabs, and carriage returns
        return code >= 32 || code === 9 || code === 10 || code === 13;
      }).join('')
      .substring(0, 100000); // Enforce size limit

    // Write YAML to temporary file
    await fs.writeFile(tempFile, sanitizedContent, { mode: 0o600 }); // Restrict file permissions

    // Run actionlint using execFile for security (prevents shell injection)
    // Use -format option for structured output
    const { stdout, stderr } = await execFileAsync('actionlint', ['-format', '{{range $ }}{{$.filepath}}:{{$.line}}:{{$.column}}: {{$.message}} [{{$.kind}}]{{"\n"}}{{end}}', tempFile], {
      timeout: 10000, // 10 second timeout
      maxBuffer: 1024 * 1024 // 1MB max output
    });

    // Clean up temp file
    await fs.unlink(tempFile);

    // Parse output
    const errors = [];
    const warnings = [];
    const suggestions = [];

    // Process stdout (actionlint outputs to stdout)
    const outputLines = (stdout || stderr || '').split('\n').filter(line => line.trim());

    outputLines.forEach(line => {
      const parsed = parseActionlintLine(line);
      if (parsed) {
        if (parsed.severity === 'error') {
          errors.push(parsed);
        } else if (parsed.severity === 'info') {
          suggestions.push(parsed.message);
        } else {
          warnings.push(parsed);
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  } catch (error) {
    // Clean up temp file on error
    try {
      await fs.unlink(tempFile);
    } catch (cleanupError) {
      // Log cleanup error but don't throw - the main error is more important
      console.debug(`Failed to clean up temp file ${tempFile}: ${cleanupError.message}`);
    }

    // Handle different types of errors
    if (error.code === 'ENOENT') {
      return {
        valid: false,
        errors: [{ message: 'actionlint not found - please install actionlint binary', severity: 'error' }],
        warnings: [],
        suggestions: []
      };
    }

    if (error.killed || error.signal === 'SIGTERM') {
      return {
        valid: false,
        errors: [{ message: 'Validation timeout - YAML file too complex', severity: 'error' }],
        warnings: [],
        suggestions: []
      };
    }

    // Parse actionlint errors/warnings from stdout
    const errors = [];
    const warnings = [];
    const suggestions = [];

    if (error.stdout || error.stderr) {
      const outputLines = ((error.stdout || '') + (error.stderr || '')).split('\n').filter(line => line.trim());

      outputLines.forEach(line => {
        const parsed = parseActionlintLine(line);
        if (parsed) {
          if (parsed.severity === 'error') {
            errors.push(parsed);
          } else if (parsed.severity === 'info') {
            suggestions.push(parsed.message);
          } else {
            warnings.push(parsed);
          }
        }
      });
    }

    // If no parsed errors, add generic error
    if (errors.length === 0 && warnings.length === 0) {
      errors.push({ message: `Validation error: ${error.message}`, severity: 'error', line: 0, column: 0 });
    }

    return {
      valid: false,
      errors,
      warnings,
      suggestions
    };
  }
}

// API Routes

/**
 * API Routes
 */
app.use('/api/auth', authRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/comments', commentsRoutes);

/**
 * GET /api/actions
 * Retrieve all available actions with optional filtering
 */
app.get('/api/actions', apiLimiter, async (req, res) => {
  try {
    const { category, search, limit = 50, offset = 0 } = req.query;
    
    // Input validation and sanitization
    const sanitizedLimit = Math.max(1, Math.min(100, parseInt(limit) || 50));
    const sanitizedOffset = Math.max(0, parseInt(offset) || 0);
    
    let query = {};
    if (category) {
      if (typeof category === 'string') {
        query.category = { $eq: category };
      } else {
        return res.status(400).json({ error: 'Invalid category parameter' });
      }
    }
    if (search) {
      if (typeof search === 'string') {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { repository: { $regex: search, $options: 'i' } }
        ];
      } else {
        return res.status(400).json({ error: 'Invalid search parameter' });
      }
    }

    const actions = await Action.find(query)
      .limit(sanitizedLimit)
      .skip(sanitizedOffset)
      .sort({ stars: -1 });

    const total = await Action.countDocuments(query);

    res.json({
      actions,
      total,
      limit: sanitizedLimit,
      offset: sanitizedOffset
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
    
    // Sanitize and validate prompt
    const sanitizedPrompt = String(prompt).substring(0, 2000).trim();
    if (sanitizedPrompt.length < 5) {
      return res.status(400).json({ error: 'Prompt must be at least 5 characters long' });
    }

    const suggestion = await generateWorkflowWithAI(sanitizedPrompt);
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
      model: 'gpt-4o',
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
      query.category = { $eq: category }; // Use $eq to ensure category is treated as a literal value
    }
    if (search && typeof search === 'string') { // Validate search is a string
      const sanitizedSearch = search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'); // Sanitize search input
      
      query.$or = [
        { name: { $regex: sanitizedSearch, $options: 'i' } },
        { description: { $regex: sanitizedSearch, $options: 'i' } },
        { tags: { $in: [new RegExp(sanitizedSearch, 'i')] } }
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
 * Optional auth - if authenticated, shows user's workflows + public workflows
 * If not authenticated, shows only public workflows
 */
app.get('/api/workflows', apiLimiter, optionalAuth, async (req, res) => {
  try {
    // Input validation and sanitization for pagination
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    // Build query based on authentication and filters
    let query = {};

    if (req.query.public === 'true') {
      // Only public workflows
      query = { isPublic: true };
    } else if (req.query.mine === 'true' && req.userId) {
      // Only user's workflows
      query = { userId: req.userId };
    } else if (req.userId) {
      // User's workflows + public workflows
      query = {
        $or: [
          { userId: req.userId },
          { isPublic: true }
        ]
      };
    } else {
      // Not authenticated - only public workflows
      query = { isPublic: true };
    }

    const workflows = await Workflow.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .select('-yaml') // Exclude yaml for list view
      .populate('userId', 'username displayName');

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
 * Optional auth - public workflows accessible to all, private workflows only to owner
 */
app.get('/api/workflows/:id', apiLimiter, optionalAuth, async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id)
      .populate('userId', 'username displayName');

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Check access permissions
    if (!workflow.isPublic) {
      // Private workflow - check if user is the owner
      if (!req.userId || workflow.userId._id.toString() !== req.userId) {
        return res.status(403).json({ error: 'Access denied to private workflow' });
      }
    }

    res.json(workflow);
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
});

/**
 * POST /api/workflows
 * Create a new workflow (requires authentication)
 */
app.post('/api/workflows', apiLimiter, authenticate, async (req, res) => {
  try {
    const { name, description, nodes, edges, yaml, tags, isPublic } = req.body;

    // Input validation
    if (!name || !nodes || !edges) {
      return res.status(400).json({ error: 'Name, nodes, and edges are required' });
    }

    // Sanitize string inputs
    const sanitizedName = String(name).substring(0, 200).trim();
    const sanitizedDescription = description ? String(description).substring(0, 1000).trim() : undefined;
    const sanitizedYaml = yaml ? String(yaml).substring(0, 50000) : undefined;

    // Validate arrays
    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      return res.status(400).json({ error: 'Nodes and edges must be arrays' });
    }

    // Validate tags if provided
    const sanitizedTags = Array.isArray(tags) ?
      tags.slice(0, 20).map(tag => String(tag).substring(0, 50).trim()) :
      undefined;

    const workflow = new Workflow({
      name: sanitizedName,
      description: sanitizedDescription,
      userId: req.userId, // Set from authenticated user
      nodes: nodes.slice(0, 100), // Limit number of nodes
      edges: edges.slice(0, 200), // Limit number of edges
      yaml: sanitizedYaml,
      tags: sanitizedTags,
      isPublic: Boolean(isPublic)
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
 * Update a workflow (requires authentication and ownership)
 */
app.put('/api/workflows/:id', apiLimiter, authenticate, async (req, res) => {
  try {
    const { name, description, nodes, edges, yaml, tags, isPublic } = req.body;

    const workflow = await Workflow.findById(req.params.id);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Check ownership
    if (workflow.userId && workflow.userId.toString() !== req.userId) {
      return res.status(403).json({ error: 'You do not have permission to edit this workflow' });
    }

    // Update fields with sanitization
    if (name !== undefined) {
      workflow.name = String(name).substring(0, 200).trim();
    }
    if (description !== undefined) {
      workflow.description = description ? String(description).substring(0, 1000).trim() : '';
    }
    if (nodes !== undefined) {
      if (!Array.isArray(nodes)) {
        return res.status(400).json({ error: 'Nodes must be an array' });
      }
      workflow.nodes = nodes.slice(0, 100);
    }
    if (edges !== undefined) {
      if (!Array.isArray(edges)) {
        return res.status(400).json({ error: 'Edges must be an array' });
      }
      workflow.edges = edges.slice(0, 200);
    }
    if (yaml !== undefined) {
      workflow.yaml = yaml ? String(yaml).substring(0, 50000) : '';
    }
    if (tags !== undefined) {
      workflow.tags = Array.isArray(tags) ?
        tags.slice(0, 20).map(tag => String(tag).substring(0, 50).trim()) :
        [];
    }
    if (isPublic !== undefined) {
      workflow.isPublic = Boolean(isPublic);
    }

    await workflow.save();

    res.json(workflow);
  } catch (error) {
    console.error('Error updating workflow:', error);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

/**
 * DELETE /api/workflows/:id
 * Delete a workflow (requires authentication and ownership)
 */
app.delete('/api/workflows/:id', apiLimiter, authenticate, async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Check ownership
    if (workflow.userId && workflow.userId.toString() !== req.userId) {
      return res.status(403).json({ error: 'You do not have permission to delete this workflow' });
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
 * Fork a public workflow (requires authentication)
 */
app.post('/api/workflows/:id/fork', apiLimiter, authenticate, async (req, res) => {
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
      userId: req.userId, // Set to current user
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
    updateActionDatabase().catch(err => logger.logError(err, { operation: 'updateActionDatabase' }));

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

// Error handling middleware (must be after all routes)
app.use(errorLogger);

// Global error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// 404 handler for undefined routes
app.use((req, res) => {
  logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Initialize server
async function startServer() {
  try {
    // Wait for MongoDB connection FIRST
    await mongoose.connection.asPromise();
    logger.info('Connected to MongoDB');

    // Only start server AFTER database is confirmed working
    server = app.listen(PORT, (err) => {
      if (err) {
        logger.error('Failed to start server', err);
        process.exit(1);
      }
      logger.info(`FlowForge API server running on port ${PORT}`);
      logger.info(`Server PID: ${process.pid}`);
    });

    // Schedule periodic updates (every 6 hours)
    setInterval(() => {
      updateActionDatabase().catch(err => logger.logError(err, { operation: 'scheduledUpdate' }));
    }, 6 * 60 * 60 * 1000);

    // Perform initial update if database is empty
    const actionCount = await Action.countDocuments();
    if (actionCount === 0) {
      logger.info('Database is empty, performing initial update...');
      updateActionDatabase().catch(err => logger.logError(err, { operation: 'initialUpdate' }));
    }

    // Initialize workflow scheduler
    logger.info('Initializing workflow scheduler...');
    await scheduler.initialize();
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, starting graceful shutdown...`);

  // Stop workflow scheduler
  logger.info('Stopping workflow scheduler...');
  scheduler.shutdown();

  // Stop accepting new connections
  if (server) {
    logger.info('Closing HTTP server...');
    await new Promise((resolve) => {
      server.close(resolve);
    });
    logger.info('HTTP server closed');
  }

  // Close database connection
  if (mongoose.connection.readyState === 1) {
    logger.info('Closing MongoDB connection...');
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  }

  logger.info('Graceful shutdown complete');
  process.exit(0);
};

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
startServer();