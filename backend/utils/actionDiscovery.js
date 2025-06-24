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
    // Fetch repository information
    const [repoData, actionYml] = await Promise.all([
      fetchRepositoryInfo(owner, repo),
      fetchActionYaml(owner, repo)
    ]);
    
    if (!actionYml) {
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
  const possiblePaths = ['action.yml', 'action.yaml'];
  
  for (const path of possiblePaths) {
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path,
        mediaType: { format: 'raw' }
      });
      
      return parseActionYaml(data);
    } catch (_error) {
      // Continue to next path
    }
  }
  
  return null;
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

// Export all utilities
module.exports = {
  fetchAwesomeActions,
  fetchActionMetadata,
  searchActions,
  detectActionCategory,
  validateActionMetadata,
  detectCompatibility,
  CATEGORY_DEFINITIONS
};