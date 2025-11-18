/**
 * Environment Variable Validation
 *
 * Validates required environment variables on startup
 * Prevents application from starting with missing critical configuration
 */

const requiredEnvVars = {
  // Database
  MONGODB_URI: {
    required: true,
    description: 'MongoDB connection string',
    example: 'mongodb://localhost:27017/flowforge',
  },

  // Authentication
  JWT_SECRET: {
    required: true,
    description: 'Secret key for JWT access tokens',
    example: 'Generate with: openssl rand -base64 32',
    minLength: 32,
  },

  JWT_REFRESH_SECRET: {
    required: true,
    description: 'Secret key for JWT refresh tokens',
    example: 'Generate with: openssl rand -base64 32',
    minLength: 32,
  },

  // Server
  PORT: {
    required: false,
    default: '3002',
    description: 'Server port',
  },

  NODE_ENV: {
    required: false,
    default: 'development',
    description: 'Environment (development, production, test)',
    validValues: ['development', 'production', 'test'],
  },

  // External Services
  OPENAI_API_KEY: {
    required: false,
    description: 'OpenAI API key for AI features',
    example: 'sk-...',
  },

  GITHUB_TOKEN: {
    required: false,
    description: 'GitHub personal access token for action updates',
    example: 'ghp_...',
  },

  FRONTEND_URL: {
    required: false,
    default: 'http://localhost:5173',
    description: 'Frontend application URL for CORS',
  },

  // Session
  SESSION_SECRET: {
    required: false,
    default: 'flowforge-session-secret',
    description: 'Secret for session encryption',
    minLength: 16,
  },

  // Redis (Optional)
  REDIS_ENABLED: {
    required: false,
    default: 'false',
    description: 'Enable Redis caching',
    validValues: ['true', 'false'],
  },

  REDIS_HOST: {
    required: false,
    default: 'localhost',
    description: 'Redis host',
    dependsOn: { REDIS_ENABLED: 'true' },
  },

  REDIS_PORT: {
    required: false,
    default: '6379',
    description: 'Redis port',
    dependsOn: { REDIS_ENABLED: 'true' },
  },

  // OAuth (Optional)
  GITHUB_CLIENT_ID: {
    required: false,
    description: 'GitHub OAuth client ID',
  },

  GITHUB_CLIENT_SECRET: {
    required: false,
    description: 'GitHub OAuth client secret',
    dependsOn: { GITHUB_CLIENT_ID: 'exists' },
  },

  GITHUB_CALLBACK_URL: {
    required: false,
    description: 'GitHub OAuth callback URL',
    example: 'http://localhost:3002/api/auth/github/callback',
    dependsOn: { GITHUB_CLIENT_ID: 'exists' },
  },
};

class EnvironmentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }

  /**
   * Validate all environment variables
   */
  validate() {
    console.log('🔍 Validating environment variables...\n');

    for (const [varName, config] of Object.entries(requiredEnvVars)) {
      this.validateVar(varName, config);
    }

    this.printResults();

    if (this.errors.length > 0) {
      throw new Error(`Environment validation failed with ${this.errors.length} error(s)`);
    }

    console.log('✅ Environment validation passed!\n');
    return true;
  }

  /**
   * Validate a single environment variable
   */
  validateVar(varName, config) {
    const value = process.env[varName];

    // Check if required
    if (config.required && !value) {
      this.errors.push({
        var: varName,
        message: `Required variable ${varName} is not set`,
        help: config.description,
        example: config.example,
      });
      return;
    }

    // Set default if not provided
    if (!value && config.default) {
      process.env[varName] = config.default;
      this.info.push({
        var: varName,
        message: `Using default value: ${config.default}`,
      });
      return;
    }

    // Skip if not set and not required
    if (!value) return;

    // Check minimum length
    if (config.minLength && value.length < config.minLength) {
      this.warnings.push({
        var: varName,
        message: `${varName} should be at least ${config.minLength} characters (current: ${value.length})`,
        help: 'Shorter secrets are less secure',
      });
    }

    // Check valid values
    if (config.validValues && !config.validValues.includes(value)) {
      this.errors.push({
        var: varName,
        message: `Invalid value for ${varName}: "${value}"`,
        help: `Valid values: ${config.validValues.join(', ')}`,
      });
    }

    // Check dependencies
    if (config.dependsOn) {
      for (const [depVar, depValue] of Object.entries(config.dependsOn)) {
        if (depValue === 'exists') {
          if (process.env[depVar] && !value) {
            this.warnings.push({
              var: varName,
              message: `${varName} should be set when ${depVar} is configured`,
            });
          }
        } else if (process.env[depVar] === depValue && !value) {
          this.warnings.push({
            var: varName,
            message: `${varName} should be set when ${depVar}=${depValue}`,
          });
        }
      }
    }
  }

  /**
   * Print validation results
   */
  printResults() {
    // Print errors
    if (this.errors.length > 0) {
      console.error('❌ ERRORS:\n');
      this.errors.forEach(err => {
        console.error(`  ${err.var}:`);
        console.error(`    ${err.message}`);
        if (err.help) console.error(`    Help: ${err.help}`);
        if (err.example) console.error(`    Example: ${err.example}`);
        console.error('');
      });
    }

    // Print warnings
    if (this.warnings.length > 0) {
      console.warn('⚠️  WARNINGS:\n');
      this.warnings.forEach(warn => {
        console.warn(`  ${warn.var}:`);
        console.warn(`    ${warn.message}`);
        if (warn.help) console.warn(`    Help: ${warn.help}`);
        console.warn('');
      });
    }

    // Print info
    if (this.info.length > 0 && process.env.NODE_ENV !== 'production') {
      console.log('ℹ️  INFO:\n');
      this.info.forEach(info => {
        console.log(`  ${info.var}: ${info.message}`);
      });
      console.log('');
    }
  }

  /**
   * Print environment summary
   */
  printSummary() {
    console.log('📋 Environment Summary:\n');
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  Port: ${process.env.PORT || '3002'}`);
    console.log(`  MongoDB: ${process.env.MONGODB_URI ? '✓ Configured' : '✗ Not configured'}`);
    console.log(`  Redis: ${process.env.REDIS_ENABLED === 'true' ? '✓ Enabled' : '✗ Disabled'}`);
    console.log(`  OpenAI: ${process.env.OPENAI_API_KEY ? '✓ Configured' : '✗ Not configured'}`);
    console.log(`  GitHub OAuth: ${process.env.GITHUB_CLIENT_ID ? '✓ Configured' : '✗ Not configured'}`);
    console.log(`  CORS: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    console.log('');
  }
}

/**
 * Validate environment variables
 * Call this early in application startup
 */
function validateEnvironment() {
  const validator = new EnvironmentValidator();
  validator.validate();
  validator.printSummary();
}

module.exports = {
  validateEnvironment,
  requiredEnvVars,
};
