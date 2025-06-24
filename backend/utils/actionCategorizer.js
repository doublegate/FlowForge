/**
 * Advanced Action Categorization System
 * 
 * This module provides intelligent categorization of GitHub Actions
 * using multiple strategies:
 * 1. Keyword matching with weighted scoring
 * 2. Repository name analysis
 * 3. Action description parsing
 * 4. Common patterns recognition
 * 5. Machine learning-ready feature extraction
 */

// Category definitions with keywords and patterns
const CATEGORIES = {
  setup: {
    name: 'Setup & Environment',
    keywords: ['setup', 'install', 'configure', 'init', 'prepare', 'environment', 'env'],
    patterns: [/setup-\w+/, /install-\w+/, /configure-\w+/],
    weight: 1.0,
    description: 'Actions that set up programming languages, tools, or environments'
  },
  
  build: {
    name: 'Build & Compile',
    keywords: ['build', 'compile', 'bundle', 'pack', 'webpack', 'rollup', 'parcel', 'make', 'gradle', 'maven', 'cargo'],
    patterns: [/build-\w+/, /compile-\w+/, /bundle-\w+/],
    weight: 1.2,
    description: 'Actions that build, compile, or bundle code'
  },
  
  test: {
    name: 'Testing & Quality',
    keywords: ['test', 'jest', 'mocha', 'pytest', 'junit', 'jasmine', 'karma', 'cypress', 'selenium', 'lint', 'eslint', 'prettier', 'coverage', 'quality', 'check'],
    patterns: [/test-\w+/, /\w+-test/, /lint-\w+/, /check-\w+/],
    weight: 1.3,
    description: 'Actions for testing, linting, and code quality checks'
  },
  
  security: {
    name: 'Security & Scanning',
    keywords: ['security', 'scan', 'vulnerability', 'audit', 'snyk', 'dependabot', 'codeql', 'sonar', 'trivy', 'secret', 'sast', 'dast'],
    patterns: [/security-\w+/, /scan-\w+/, /audit-\w+/],
    weight: 1.5,
    description: 'Security scanning and vulnerability detection actions'
  },
  
  deploy: {
    name: 'Deployment & Release',
    keywords: ['deploy', 'release', 'publish', 'upload', 'heroku', 'vercel', 'netlify', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'helm'],
    patterns: [/deploy-\w+/, /publish-\w+/, /release-\w+/],
    weight: 1.4,
    description: 'Actions for deploying applications and releasing artifacts'
  },
  
  containerization: {
    name: 'Containers & Docker',
    keywords: ['docker', 'container', 'podman', 'buildah', 'image', 'registry', 'dockerhub', 'gcr', 'ecr', 'acr'],
    patterns: [/docker-\w+/, /container-\w+/, /image-\w+/],
    weight: 1.3,
    description: 'Container building, pushing, and management actions'
  },
  
  notification: {
    name: 'Notifications & Communication',
    keywords: ['notify', 'slack', 'email', 'discord', 'teams', 'telegram', 'webhook', 'alert', 'message', 'comment'],
    patterns: [/notify-\w+/, /\w+-notification/, /alert-\w+/],
    weight: 1.1,
    description: 'Actions for sending notifications and alerts'
  },
  
  documentation: {
    name: 'Documentation & Reporting',
    keywords: ['docs', 'documentation', 'javadoc', 'jsdoc', 'sphinx', 'mkdocs', 'changelog', 'release-notes', 'report'],
    patterns: [/docs-\w+/, /documentation-\w+/, /generate-docs/],
    weight: 1.0,
    description: 'Documentation generation and reporting actions'
  },
  
  utilities: {
    name: 'Utilities & Helpers',
    keywords: ['cache', 'artifact', 'download', 'upload', 'wait', 'sleep', 'retry', 'helper', 'utility', 'tool'],
    patterns: [/\w+-helper/, /\w+-utility/, /\w+-tool/],
    weight: 0.8,
    description: 'General utility actions for various tasks'
  },
  
  cloud: {
    name: 'Cloud Services',
    keywords: ['aws', 'azure', 'gcp', 'google-cloud', 'alibaba', 'digitalocean', 'linode', 's3', 'lambda', 'functions'],
    patterns: [/aws-\w+/, /azure-\w+/, /gcp-\w+/, /cloud-\w+/],
    weight: 1.2,
    description: 'Cloud platform specific actions'
  },
  
  mobile: {
    name: 'Mobile Development',
    keywords: ['android', 'ios', 'react-native', 'flutter', 'xamarin', 'cordova', 'ionic', 'fastlane', 'gradle', 'xcode'],
    patterns: [/android-\w+/, /ios-\w+/, /mobile-\w+/],
    weight: 1.2,
    description: 'Mobile app building and deployment actions'
  },
  
  database: {
    name: 'Database & Data',
    keywords: ['database', 'db', 'mysql', 'postgres', 'mongodb', 'redis', 'migration', 'backup', 'restore', 'seed'],
    patterns: [/db-\w+/, /database-\w+/, /\w+-migration/],
    weight: 1.1,
    description: 'Database operations and data management actions'
  },
  
  monitoring: {
    name: 'Monitoring & Analytics',
    keywords: ['monitor', 'metric', 'datadog', 'newrelic', 'prometheus', 'grafana', 'elastic', 'apm', 'logging', 'analytics'],
    patterns: [/monitor-\w+/, /metric-\w+/, /log-\w+/],
    weight: 1.1,
    description: 'Monitoring, metrics, and analytics actions'
  },
  
  ai_ml: {
    name: 'AI & Machine Learning',
    keywords: ['ai', 'ml', 'machine-learning', 'tensorflow', 'pytorch', 'model', 'training', 'inference', 'jupyter', 'notebook'],
    patterns: [/ai-\w+/, /ml-\w+/, /model-\w+/],
    weight: 1.3,
    description: 'AI/ML model training, deployment, and inference actions'
  }
};

// Technology-specific keyword mappings
const TECH_KEYWORDS = {
  // Languages
  javascript: ['node', 'npm', 'yarn', 'pnpm', 'js', 'typescript', 'ts'],
  python: ['python', 'pip', 'pipenv', 'poetry', 'py'],
  java: ['java', 'maven', 'gradle', 'ant', 'jar'],
  go: ['go', 'golang', 'mod'],
  rust: ['rust', 'cargo', 'rustc'],
  ruby: ['ruby', 'gem', 'bundler', 'rails'],
  php: ['php', 'composer', 'laravel'],
  dotnet: ['dotnet', 'csharp', 'nuget', 'msbuild'],
  
  // Frameworks
  react: ['react', 'jsx', 'next', 'gatsby'],
  vue: ['vue', 'nuxt', 'vite'],
  angular: ['angular', 'ng'],
  django: ['django'],
  flask: ['flask'],
  spring: ['spring', 'springboot'],
  express: ['express', 'fastify', 'koa']
};

/**
 * Calculate similarity score between two strings
 */
function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  // Exact match
  if (s1 === s2) return 1.0;
  
  // Contains match
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  // Levenshtein distance
  const matrix = [];
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  const distance = matrix[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  return Math.max(0, 1 - distance / maxLength);
}

/**
 * Extract features from action metadata for categorization
 */
function extractFeatures(metadata, repoName) {
  const features = {
    name: (metadata.name || repoName || '').toLowerCase(),
    description: (metadata.description || '').toLowerCase(),
    repository: (metadata.repository || '').toLowerCase(),
    author: (metadata.author || '').toLowerCase(),
    repoName: (repoName || '').toLowerCase(),
    // Extract organization name
    organization: metadata.repository ? metadata.repository.split('/')[0] : '',
    // Check if it's an official action
    isOfficial: metadata.repository && metadata.repository.startsWith('actions/'),
    // Extract version if present
    hasVersion: metadata.repository && metadata.repository.includes('@'),
    // Branding can indicate category
    brandingIcon: metadata.branding?.icon || '',
    brandingColor: metadata.branding?.color || ''
  };
  
  // Combine all text for analysis
  features.allText = `${features.name} ${features.description} ${features.repository}`;
  
  return features;
}

/**
 * Score action against a specific category
 */
function scoreCategory(features, category) {
  let score = 0;
  const categoryDef = CATEGORIES[category];
  
  // Keyword matching
  categoryDef.keywords.forEach(keyword => {
    if (features.allText.includes(keyword)) {
      score += categoryDef.weight;
    }
    // Partial matching
    const similarity = calculateSimilarity(features.name, keyword);
    if (similarity > 0.7) {
      score += categoryDef.weight * similarity * 0.5;
    }
  });
  
  // Pattern matching
  categoryDef.patterns.forEach(pattern => {
    if (pattern.test(features.name) || pattern.test(features.repoName)) {
      score += categoryDef.weight * 1.5;
    }
  });
  
  // Special cases
  if (category === 'setup' && features.name.includes('action')) {
    score *= 0.8; // 'setup-action' is less likely to be a setup action
  }
  
  if (category === 'utilities' && score === 0) {
    score = 0.1; // Default low score for utilities
  }
  
  // Boost official actions for certain categories
  if (features.isOfficial) {
    if (['setup', 'utilities', 'build'].includes(category)) {
      score *= 1.2;
    }
  }
  
  // Icon-based hints
  const iconHints = {
    'package': ['build', 'deploy'],
    'check-circle': ['test', 'security'],
    'bell': ['notification'],
    'book': ['documentation'],
    'cloud': ['cloud', 'deploy'],
    'database': ['database'],
    'zap': ['utilities', 'build']
  };
  
  if (iconHints[features.brandingIcon]) {
    if (iconHints[features.brandingIcon].includes(category)) {
      score += categoryDef.weight * 0.3;
    }
  }
  
  return score;
}

/**
 * Main categorization function
 */
function categorizeAction(metadata, repoName) {
  const features = extractFeatures(metadata, repoName);
  const scores = {};
  
  // Calculate scores for each category
  Object.keys(CATEGORIES).forEach(category => {
    scores[category] = scoreCategory(features, category);
  });
  
  // Find the best category
  let bestCategory = 'utilities';
  let bestScore = 0;
  
  Object.entries(scores).forEach(([category, score]) => {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  });
  
  // If score is too low, check for technology-specific categorization
  if (bestScore < 0.5) {
    for (const [_tech, keywords] of Object.entries(TECH_KEYWORDS)) {
      if (keywords.some(keyword => features.allText.includes(keyword))) {
        bestCategory = 'setup'; // Most tech-specific actions are setup actions
        break;
      }
    }
  }
  
  return bestCategory;
}

/**
 * Get category metadata
 */
function getCategoryInfo(category) {
  return CATEGORIES[category] || CATEGORIES.utilities;
}

/**
 * Batch categorize multiple actions
 */
function categorizeActions(actions) {
  return actions.map(action => ({
    ...action,
    category: categorizeAction(action.metadata || action, action.repoName || action.repository)
  }));
}

module.exports = {
  categorizeAction,
  categorizeActions,
  getCategoryInfo,
  CATEGORIES
};