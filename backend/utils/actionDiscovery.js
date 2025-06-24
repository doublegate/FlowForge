/**
 * FlowForge Action Discovery Utilities
 * 
 * This module provides utilities for discovering, fetching, and parsing
 * GitHub Actions from various sources including the Awesome Actions repository.
 * It includes intelligent categorization, metadata extraction, and validation.
 * 
 * Features:
 * - Parse Awesome Actions README for action repositories
 * - Extract action.yml/action.yaml metadata
 * - Categorize actions based on keywords and usage patterns
 * - Validate action compatibility and requirements
 * - Cache results for performance optimization
 * 
 * @module actionDiscovery
 * @version 1.0.0
 */

const yaml = require('js-yaml');
const { Octokit } = require('@octokit/rest');
const { LRUCache } = require('lru-cache');
const path = require('path');

// Ensure environment variables are loaded
if (!process.env.GITHUB_TOKEN) {
  console.warn('⚠️  GITHUB_TOKEN not found, GitHub API will be rate-limited');
}

// Initialize GitHub API client with enhanced configuration
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  userAgent: 'FlowForge/1.0',
  throttle: {
    onRateLimit: (retryAfter, _options, _octokit) => {
      console.warn(`⚠️  Rate limit exceeded, retrying after ${retryAfter} seconds`);
      return true; // Enable automatic retries
    },
    onAbuseLimit: (retryAfter, _options, _octokit) => {
      console.warn(`⚠️  Abuse detection triggered, retrying after ${retryAfter} seconds`);
      return true; // Enable automatic retries
    }
  }
});

// Cache configuration for API responses
const cache = new LRUCache({
  max: 500, // Maximum number of items
  ttl: 1000 * 60 * 60 * 6, // 6 hours TTL
  updateAgeOnGet: true,
  updateAgeOnHas: true
});

/**
 * Category definitions with keywords and patterns
 * Used for intelligent action categorization
 */
const CATEGORY_DEFINITIONS = {
  setup: {
    keywords: ['setup', 'install', 'configure', 'init', 'environment'],
    patterns: [/setup-\w+/, /install-\w+/],
    priority: 1
  },
  build: {
    keywords: ['build', 'compile', 'bundle', 'webpack', 'transpile', 'make'],
    patterns: [/build/, /compile/],
    priority: 2
  },
  testing: {
    keywords: ['test', 'jest', 'mocha', 'pytest', 'unit', 'integration', 'e2e', 'coverage'],
    patterns: [/test/, /spec/, /coverage/],
    priority: 3
  },
  security: {
    keywords: ['security', 'scan', 'vulnerability', 'audit', 'snyk', 'trivy', 'codeql'],
    patterns: [/security/, /scan/, /audit/],
    priority: 4
  },
  deployment: {
    keywords: ['deploy', 'publish', 'release', 'push', 'upload', 'ship'],
    patterns: [/deploy/, /publish/, /release/],
    priority: 5
  },
  containerization: {
    keywords: ['docker', 'container', 'kubernetes', 'k8s', 'helm', 'image'],
    patterns: [/docker/, /container/, /k8s/],
    priority: 6
  },
  notification: {
    keywords: ['notify', 'slack', 'email', 'webhook', 'alert', 'message'],
    patterns: [/notify/, /slack/, /email/],
    priority: 7
  },
  utilities: {
    keywords: ['cache', 'artifact', 'download', 'upload', 'helper', 'utility'],
    patterns: [/cache/, /artifact/],
    priority: 8
  },
  monitoring: {
    keywords: ['monitor', 'metrics', 'logging', 'observability', 'datadog', 'prometheus'],
    patterns: [/monitor/, /metrics/, /log/],
    priority: 9
  },
  documentation: {
    keywords: ['docs', 'documentation', 'changelog', 'readme', 'wiki'],
    patterns: [/doc/, /changelog/],
    priority: 10
  }
};

/**
 * Fetch and parse the Awesome Actions README
 * @returns {Promise<Array>} Array of categorized action repositories
 */
async function fetchAwesomeActions() {
  const cacheKey = 'awesome-actions-list';
  const cached = cache.get(cacheKey);
  
  if (cached) {
    console.log('Using cached Awesome Actions list');
    return cached;
  }

  try {
    console.log('Fetching Awesome Actions repository...');
    
    // Fetch the raw README content
    const { data } = await octokit.repos.getContent({
      owner: 'sdras',
      repo: 'awesome-actions',
      path: 'README.md',
      mediaType: {
        format: 'raw'
      }
    });

    // Parse the markdown to extract structured data
    const actions = parseAwesomeActionsMarkdown(data);
    
    // Cache the results
    cache.set(cacheKey, actions);
    
    console.log(`Discovered ${actions.length} actions across ${Object.keys(CATEGORY_DEFINITIONS).length} categories`);
    return actions;
  } catch (error) {
    console.error('Error fetching Awesome Actions:', error.message);
    throw new Error(`Failed to fetch Awesome Actions: ${error.message}`);
  }
}

/**
 * Parse the Awesome Actions markdown content
 * @param {string} markdown - Raw markdown content
 * @returns {Array} Parsed and categorized actions
 */
function parseAwesomeActionsMarkdown(markdown) {
  const actions = [];
  const lines = markdown.split('\n');
  
  let currentSection = null;
  let currentCategory = 'other';
  
  for (const line of lines) {
    // Detect section headers
    if (line.startsWith('## ')) {
      currentSection = line.replace('## ', '').trim();
      currentCategory = detectCategoryFromSection(currentSection);
      continue;
    }
    
    // Extract GitHub repository links
    const repoMatches = line.matchAll(/\[([^\]]+)\]\(https:\/\/github\.com\/([^)]+)\)/g);
    
    for (const match of repoMatches) {
      const [fullMatch, title, repoPath] = match;
      const [owner, repo] = repoPath.split('/').slice(0, 2);
      
      if (owner && repo && !isExcludedRepo(owner, repo)) {
        // Extract description from the line
        const descriptionMatch = line.match(/\s-\s(.+)$/);
        const description = descriptionMatch ? 
          descriptionMatch[1].replace(fullMatch, '').trim() : 
          title;
        
        actions.push({
          title,
          owner,
          repo,
          fullName: `${owner}/${repo}`,
          description: cleanDescription(description),
          category: currentCategory,
          section: currentSection,
          stars: null, // Will be populated when fetching metadata
          lastUpdated: null
        });
      }
    }
  }
  
  return actions;
}

/**
 * Detect category from section name
 * @param {string} section - Section name from markdown
 * @returns {string} Detected category
 */
function detectCategoryFromSection(section) {
  const sectionLower = section.toLowerCase();
  
  for (const [category, definition] of Object.entries(CATEGORY_DEFINITIONS)) {
    // Check if section name contains category keywords
    if (definition.keywords.some(keyword => sectionLower.includes(keyword))) {
      return category;
    }
    
    // Check patterns
    if (definition.patterns.some(pattern => pattern.test(sectionLower))) {
      return category;
    }
  }
  
  return 'other';
}

/**
 * Clean and normalize description text
 * @param {string} description - Raw description
 * @returns {string} Cleaned description
 */
function cleanDescription(description) {
  return description
    .replace(/\s+/g, ' ')
    .replace(/^\s*-\s*/, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links
    .replace(/[*_~`]/g, '') // Remove markdown formatting
    .trim();
}

/**
 * Check if a repository should be excluded
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {boolean} True if should be excluded
 */
function isExcludedRepo(owner, repo) {
  const excludePatterns = [
    /^\.github$/,
    /awesome/i,
    /example/i,
    /template/i,
    /^test-/
  ];
  
  return excludePatterns.some(pattern => 
    pattern.test(owner) || pattern.test(repo)
  );
}

/**
 * Check if a repository is a special case (not a traditional action)
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {boolean} Whether this is a special case repo
 */
function isSpecialCaseRepo(owner, repo) {
  const specialCases = [
    { owner: 'actions', repo: 'virtual-environments' },
    { owner: 'actions', repo: 'runner' },
    { owner: 'actions', repo: 'starter-workflows' },
    { owner: 'features', repo: 'actions' },
    { owner: 'github', repo: 'super-linter' }, // Has action in .automation/
    { owner: 'release-drafter', repo: 'release-drafter' } // Has action in subdirectory
  ];
  
  return specialCases.some(sc => sc.owner === owner && sc.repo === repo);
}

/**
 * Check if repository contains workflows instead of being an action
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<boolean>} Whether workflows exist
 */
async function checkForWorkflows(owner, repo) {
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: '.github/workflows'
    });
    
    return Array.isArray(data) && data.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Fetch reusable workflows from a repository
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Array>} Array of reusable workflow metadata
 */
async function fetchReusableWorkflows(owner, repo) {
  const workflows = [];
  
  try {
    // Get all workflow files
    const { data: files } = await octokit.repos.getContent({
      owner,
      repo,
      path: '.github/workflows'
    });
    
    if (!Array.isArray(files)) {
      return workflows;
    }
    
    // Check each workflow file
    for (const file of files) {
      if (file.type === 'file' && 
          (file.name.endsWith('.yml') || file.name.endsWith('.yaml'))) {
        try {
          const { data: content } = await octokit.repos.getContent({
            owner,
            repo,
            path: file.path,
            mediaType: { format: 'raw' }
          });
          
          const workflowData = parseWorkflowYaml(content, file.path);
          
          // Only include if it's a reusable workflow (has workflow_call trigger)
          if (workflowData && workflowData.isReusable) {
            workflows.push({
              ...workflowData,
              repository: `${owner}/${repo}`,
              workflowPath: file.path,
              type: 'workflow'
            });
            console.log(`✓ Found reusable workflow at ${file.path} in ${owner}/${repo}`);
          }
        } catch (error) {
          console.debug(`Error parsing workflow ${file.path}: ${error.message}`);
        }
      }
    }
    
    return workflows;
  } catch (error) {
    console.debug(`Error fetching workflows from ${owner}/${repo}: ${error.message}`);
    return workflows;
  }
}

/**
 * Parse workflow YAML content
 * @param {string} yamlContent - Raw YAML content
 * @param {string} filePath - Path to the workflow file
 * @returns {Object|null} Parsed workflow metadata
 */
function parseWorkflowYaml(yamlContent, filePath) {
  try {
    const parsed = yaml.load(yamlContent);
    
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    
    // Check if it's a reusable workflow
    const hasWorkflowCall = parsed.on && 
                           parsed.on.workflow_call !== undefined;
    
    if (!hasWorkflowCall) {
      return null;
    }
    
    // Extract workflow metadata
    const metadata = {
      name: parsed.name || path.basename(filePath, path.extname(filePath)),
      description: parsed.name || 'Reusable workflow',
      isReusable: true,
      triggers: Object.keys(parsed.on || {}),
      inputs: {},
      outputs: {},
      secrets: {}
    };
    
    // Extract inputs from workflow_call
    if (parsed.on.workflow_call && parsed.on.workflow_call.inputs) {
      metadata.inputs = normalizeWorkflowInputs(parsed.on.workflow_call.inputs);
    }
    
    // Extract outputs from workflow_call
    if (parsed.on.workflow_call && parsed.on.workflow_call.outputs) {
      metadata.outputs = normalizeWorkflowOutputs(parsed.on.workflow_call.outputs);
    }
    
    // Extract secrets from workflow_call
    if (parsed.on.workflow_call && parsed.on.workflow_call.secrets) {
      metadata.secrets = normalizeWorkflowSecrets(parsed.on.workflow_call.secrets);
    }
    
    return metadata;
  } catch (error) {
    console.error(`Error parsing workflow YAML: ${error.message}`);
    return null;
  }
}

/**
 * Normalize workflow inputs to consistent format
 * @param {Object} inputs - Raw inputs from workflow YAML
 * @returns {Object} Normalized inputs
 */
function normalizeWorkflowInputs(inputs) {
  const normalized = {};
  
  for (const [key, value] of Object.entries(inputs)) {
    if (typeof value === 'string') {
      normalized[key] = {
        description: value,
        required: false,
        type: 'string'
      };
    } else if (typeof value === 'object' && value !== null) {
      normalized[key] = {
        description: value.description || '',
        required: value.required === true,
        default: value.default,
        type: value.type || 'string'
      };
    }
  }
  
  return normalized;
}

/**
 * Normalize workflow outputs to consistent format
 * @param {Object} outputs - Raw outputs from workflow YAML
 * @returns {Object} Normalized outputs
 */
function normalizeWorkflowOutputs(outputs) {
  const normalized = {};
  
  for (const [key, value] of Object.entries(outputs)) {
    if (typeof value === 'string') {
      normalized[key] = {
        description: value,
        value: ''
      };
    } else if (typeof value === 'object' && value !== null) {
      normalized[key] = {
        description: value.description || '',
        value: value.value || ''
      };
    }
  }
  
  return normalized;
}

/**
 * Normalize workflow secrets to consistent format
 * @param {Object} secrets - Raw secrets from workflow YAML
 * @returns {Object} Normalized secrets
 */
function normalizeWorkflowSecrets(secrets) {
  const normalized = {};
  
  for (const [key, value] of Object.entries(secrets)) {
    if (typeof value === 'boolean') {
      normalized[key] = {
        required: value,
        description: ''
      };
    } else if (typeof value === 'object' && value !== null) {
      normalized[key] = {
        required: value.required !== false,
        description: value.description || ''
      };
    }
  }
  
  return normalized;
}

/**
 * Fetch detailed metadata for a GitHub Action
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Object>} Action metadata
 */
async function fetchActionMetadata(owner, repo) {
  const cacheKey = `action-metadata-${owner}/${repo}`;
  const cached = cache.get(cacheKey);
  
  if (cached) {
    return cached;
  }

  try {
    // Handle special cases for known repositories that aren't traditional actions
    if (isSpecialCaseRepo(owner, repo)) {
      console.log(`ℹ️  Skipping ${owner}/${repo} - not a traditional action repository`);
      return null;
    }
    
    // Fetch repository information
    const [repoData, actionYml] = await Promise.all([
      fetchRepositoryInfo(owner, repo),
      fetchActionYaml(owner, repo)
    ]);
    
    if (!actionYml) {
      // Check if this repository has reusable workflows
      const workflows = await fetchReusableWorkflows(owner, repo);
      
      if (workflows.length > 0) {
        console.log(`ℹ️  ${owner}/${repo} contains ${workflows.length} reusable workflow(s)`);
        // Return array of workflow metadata instead of single action
        return workflows.map(workflow => ({
          ...workflow,
          repository: `${owner}/${repo}@${repoData.default_branch}`,
          stars: repoData.stargazers_count,
          lastUpdated: repoData.updated_at,
          author: workflow.author || owner,
          category: detectWorkflowCategory(workflow, repo, repoData.topics)
        }));
      }
      
      return null;
    }
    
    // Merge repository data with action.yml data
    const metadata = {
      ...actionYml,
      repository: `${owner}/${repo}@${repoData.default_branch}`,
      stars: repoData.stargazers_count,
      lastUpdated: repoData.updated_at,
      license: repoData.license?.spdx_id || 'Unknown',
      topics: repoData.topics || [],
      homepage: repoData.homepage,
      author: actionYml.author || owner,
      category: detectActionCategory(actionYml, repo, repoData.topics)
    };
    
    // Validate and enhance metadata
    metadata.validation = validateActionMetadata(metadata);
    metadata.compatibility = detectCompatibility(metadata);
    
    // Cache the result
    cache.set(cacheKey, metadata);
    
    return metadata;
  } catch (error) {
    console.error(`Error fetching metadata for ${owner}/${repo}:`, error.message);
    return null;
  }
}

/**
 * Fetch repository information from GitHub API
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Object>} Repository data
 */
async function fetchRepositoryInfo(owner, repo) {
  const { data } = await octokit.repos.get({ owner, repo });
  return data;
}

/**
 * Fetch and parse action.yml or action.yaml
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Object|null>} Parsed action metadata
 */
async function fetchActionYaml(owner, repo) {
  // Common paths where action files might be located
  const possiblePaths = [
    'action.yml',
    'action.yaml',
    '.github/action.yml',
    '.github/action.yaml',
    'action/action.yml',
    'action/action.yaml'
  ];
  
  // First, try common paths
  for (const path of possiblePaths) {
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path,
        mediaType: { format: 'raw' }
      });
      
      console.log(`✓ Found action file at ${path} for ${owner}/${repo}`);
      return parseActionYaml(data);
    } catch (error) {
      // Continue to next path if not found
      if (error.status !== 404) {
        console.debug(`Error fetching ${path} for ${owner}/${repo}: ${error.message}`);
      }
    }
  }
  
  // If not found in common paths, search the repository structure
  try {
    console.log(`🔍 Searching for action files in ${owner}/${repo}...`);
    const actionFile = await searchForActionFile(owner, repo);
    
    if (actionFile) {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: actionFile.path,
        mediaType: { format: 'raw' }
      });
      
      console.log(`✓ Found action file at ${actionFile.path} for ${owner}/${repo}`);
      return parseActionYaml(data);
    }
  } catch (error) {
    console.debug(`Error searching for action files in ${owner}/${repo}: ${error.message}`);
  }
  
  return null;
}

/**
 * Search for action files in the repository
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} path - Path to search (default: root)
 * @returns {Promise<Object|null>} File info if found
 */
async function searchForActionFile(owner, repo, path = '') {
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path
    });
    
    // If data is not an array, it's a file, not a directory
    if (!Array.isArray(data)) {
      return null;
    }
    
    // First, check for action files in current directory
    for (const item of data) {
      if (item.type === 'file' && 
          (item.name === 'action.yml' || item.name === 'action.yaml')) {
        return item;
      }
    }
    
    // Then, search in subdirectories (limit depth to avoid excessive API calls)
    if (path.split('/').length < 3) {  // Max depth of 3
      for (const item of data) {
        if (item.type === 'dir' && !item.name.startsWith('.') && 
            !['node_modules', 'vendor', 'dist', 'build', 'test', 'tests', 'docs'].includes(item.name)) {
          const found = await searchForActionFile(owner, repo, item.path);
          if (found) {
            return found;
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    // Ignore errors during search
    return null;
  }
}

/**
 * Parse action YAML content with validation
 * @param {string} yamlContent - Raw YAML content
 * @returns {Object} Parsed action metadata
 */
function parseActionYaml(yamlContent) {
  try {
    const parsed = yaml.load(yamlContent);
    
    // Normalize inputs and outputs
    if (parsed.inputs) {
      parsed.inputs = normalizeActionInputs(parsed.inputs);
    }
    
    if (parsed.outputs) {
      parsed.outputs = normalizeActionOutputs(parsed.outputs);
    }
    
    return parsed;
  } catch (error) {
    console.error('Error parsing action YAML:', error.message);
    throw new Error(`Invalid action.yml format: ${error.message}`);
  }
}

/**
 * Normalize action inputs to consistent format
 * @param {Object} inputs - Raw inputs from action.yml
 * @returns {Object} Normalized inputs
 */
function normalizeActionInputs(inputs) {
  const normalized = {};
  
  for (const [key, value] of Object.entries(inputs)) {
    // Handle both string and object formats
    if (typeof value === 'string') {
      normalized[key] = {
        description: value,
        required: false,
        type: 'string'
      };
    } else {
      normalized[key] = {
        description: value.description || '',
        required: value.required === true || value.required === 'true',
        default: value.default,
        type: detectInputType(value),
        deprecationMessage: value.deprecationMessage
      };
    }
  }
  
  return normalized;
}

/**
 * Detect input type from value patterns
 * @param {Object} input - Input definition
 * @returns {string} Detected type
 */
function detectInputType(input) {
  if (input.type) return input.type;
  
  const defaultValue = input.default;
  if (defaultValue !== undefined) {
    if (defaultValue === 'true' || defaultValue === 'false') return 'boolean';
    if (!isNaN(defaultValue)) return 'number';
    if (defaultValue.includes('\n')) return 'multiline';
  }
  
  return 'string';
}

/**
 * Normalize action outputs to consistent format
 * @param {Object} outputs - Raw outputs from action.yml
 * @returns {Object} Normalized outputs
 */
function normalizeActionOutputs(outputs) {
  const normalized = {};
  
  for (const [key, value] of Object.entries(outputs)) {
    normalized[key] = {
      description: typeof value === 'string' ? value : value.description || '',
      value: value.value
    };
  }
  
  return normalized;
}

/**
 * Detect action category using multiple signals
 * @param {Object} metadata - Action metadata
 * @param {string} repoName - Repository name
 * @param {Array} topics - GitHub topics
 * @returns {string} Detected category
 */
function detectActionCategory(metadata, repoName, topics = []) {
  const signals = [
    metadata.name?.toLowerCase() || '',
    metadata.description?.toLowerCase() || '',
    repoName.toLowerCase(),
    ...topics.map(t => t.toLowerCase())
  ].join(' ');
  
  // Score each category based on keyword matches
  const categoryScores = {};
  
  for (const [category, definition] of Object.entries(CATEGORY_DEFINITIONS)) {
    let score = 0;
    
    // Check keywords
    for (const keyword of definition.keywords) {
      if (signals.includes(keyword)) {
        score += 2;
      }
    }
    
    // Check patterns
    for (const pattern of definition.patterns) {
      if (pattern.test(signals)) {
        score += 3;
      }
    }
    
    // Apply priority weighting
    score = score * (11 - definition.priority);
    
    if (score > 0) {
      categoryScores[category] = score;
    }
  }
  
  // Return category with highest score
  if (Object.keys(categoryScores).length > 0) {
    return Object.entries(categoryScores)
      .sort(([, a], [, b]) => b - a)[0][0];
  }
  
  return 'other';
}

/**
 * Validate action metadata for completeness and correctness
 * @param {Object} metadata - Action metadata
 * @returns {Object} Validation results
 */
function validateActionMetadata(metadata) {
  const validation = {
    isValid: true,
    warnings: [],
    errors: []
  };
  
  // Check required fields
  if (!metadata.name) {
    validation.errors.push('Missing required field: name');
    validation.isValid = false;
  }
  
  if (!metadata.description) {
    validation.warnings.push('Missing recommended field: description');
  }
  
  // Validate runs configuration
  if (!metadata.runs) {
    validation.errors.push('Missing required field: runs');
    validation.isValid = false;
  } else {
    if (!metadata.runs.using) {
      validation.errors.push('Missing required field: runs.using');
      validation.isValid = false;
    }
    
    // Validate based on runs.using type
    switch (metadata.runs.using) {
    case 'node12':
    case 'node16':
    case 'node20':
      if (!metadata.runs.main) {
        validation.errors.push('JavaScript actions require runs.main');
        validation.isValid = false;
      }
      break;
    case 'docker':
      if (!metadata.runs.image) {
        validation.errors.push('Docker actions require runs.image');
        validation.isValid = false;
      }
      break;
    case 'composite':
      if (!metadata.runs.steps || !Array.isArray(metadata.runs.steps)) {
        validation.errors.push('Composite actions require runs.steps array');
        validation.isValid = false;
      }
      break;
    }
  }
  
  // Validate inputs
  if (metadata.inputs) {
    for (const [inputName, input] of Object.entries(metadata.inputs)) {
      if (!input.description) {
        validation.warnings.push(`Input '${inputName}' missing description`);
      }
    }
  }
  
  // Check for deprecation
  if (metadata.deprecated) {
    validation.warnings.push('This action is marked as deprecated');
  }
  
  return validation;
}

/**
 * Detect action compatibility and requirements
 * @param {Object} metadata - Action metadata
 * @returns {Object} Compatibility information
 */
function detectCompatibility(metadata) {
  const compatibility = {
    runners: ['ubuntu-latest', 'windows-latest', 'macos-latest'],
    nodeVersion: null,
    dockerRequired: false,
    minimumGitHubVersion: null
  };
  
  if (metadata.runs) {
    switch (metadata.runs.using) {
    case 'node12':
      compatibility.nodeVersion = '12';
      compatibility.minimumGitHubVersion = '2.285.0';
      break;
    case 'node16':
      compatibility.nodeVersion = '16';
      compatibility.minimumGitHubVersion = '2.285.0';
      break;
    case 'node20':
      compatibility.nodeVersion = '20';
      compatibility.minimumGitHubVersion = '2.308.0';
      break;
    case 'docker':
      compatibility.dockerRequired = true;
      compatibility.runners = ['ubuntu-latest']; // Docker actions only run on Linux
      break;
    }
  }
  
  return compatibility;
}

/**
 * Search for actions matching specific criteria
 * @param {Object} criteria - Search criteria
 * @returns {Promise<Array>} Matching actions
 */
async function searchActions(criteria = {}) {
  const {
    query,
    category,
    author,
    minStars,
    hasInputs,
    hasOutputs,
    compatibility
  } = criteria;
  
  // First, get all available actions
  const allActions = await fetchAwesomeActions();
  
  // Apply filters
  let filtered = allActions;
  
  if (query) {
    const queryLower = query.toLowerCase();
    filtered = filtered.filter(action => 
      action.title.toLowerCase().includes(queryLower) ||
      action.description.toLowerCase().includes(queryLower) ||
      action.fullName.toLowerCase().includes(queryLower)
    );
  }
  
  if (category && category !== 'all') {
    filtered = filtered.filter(action => action.category === category);
  }
  
  if (author) {
    filtered = filtered.filter(action => action.owner.toLowerCase() === author.toLowerCase());
  }
  
  // Fetch metadata for detailed filtering
  if (minStars || hasInputs !== undefined || hasOutputs !== undefined || compatibility) {
    const withMetadata = await Promise.all(
      filtered.map(async action => {
        const metadata = await fetchActionMetadata(action.owner, action.repo);
        return metadata ? { ...action, metadata } : null;
      })
    );
    
    filtered = withMetadata.filter(action => {
      if (!action) return false;
      
      if (minStars && (!action.metadata.stars || action.metadata.stars < minStars)) {
        return false;
      }
      
      if (hasInputs === true && !action.metadata.inputs) {
        return false;
      }
      
      if (hasInputs === false && action.metadata.inputs) {
        return false;
      }
      
      if (hasOutputs === true && !action.metadata.outputs) {
        return false;
      }
      
      if (hasOutputs === false && action.metadata.outputs) {
        return false;
      }
      
      if (compatibility && action.metadata.compatibility) {
        if (compatibility.runner && !action.metadata.compatibility.runners.includes(compatibility.runner)) {
          return false;
        }
        if (compatibility.nodeVersion && action.metadata.compatibility.nodeVersion !== compatibility.nodeVersion) {
          return false;
        }
      }
      
      return true;
    });
  }
  
  return filtered;
}

/**
 * Detect the most appropriate category for a workflow
 * @param {Object} workflowMetadata - Parsed workflow metadata
 * @param {string} repoName - Repository name
 * @param {Array} topics - GitHub topics
 * @returns {string} Detected category
 */
function detectWorkflowCategory(workflowMetadata, repoName, topics = []) {
  // Workflows often have different categorization patterns
  const workflowCategories = {
    ci: ['ci', 'continuous-integration', 'build', 'test'],
    cd: ['cd', 'deploy', 'release', 'publish'],
    security: ['security', 'scan', 'vulnerability', 'audit'],
    automation: ['automation', 'bot', 'auto'],
    documentation: ['docs', 'documentation']
  };
  
  const searchText = [
    workflowMetadata.name || '',
    workflowMetadata.description || '',
    repoName,
    ...topics
  ].join(' ').toLowerCase();
  
  for (const [category, keywords] of Object.entries(workflowCategories)) {
    if (keywords.some(keyword => searchText.includes(keyword))) {
      return category;
    }
  }
  
  return 'workflow';
}

// Export all utilities
module.exports = {
  fetchAwesomeActions,
  fetchActionMetadata,
  fetchReusableWorkflows,
  searchActions,
  detectActionCategory,
  detectWorkflowCategory,
  validateActionMetadata,
  detectCompatibility,
  CATEGORY_DEFINITIONS
};