/**
 * Cache Middleware
 *
 * Provides request-level caching using Redis (or fallback to in-memory)
 */

const redis = require('../services/redis');

/**
 * Cache middleware factory
 *
 * @param {Function|string} keyGenerator - Function to generate cache key or static key
 * @param {number} ttl - Time to live in seconds (default: 3600)
 * @param {object} options - Additional options
 * @returns {Function} Express middleware
 */
const cacheMiddleware = (keyGenerator, ttl = 3600, options = {}) => {
  const {
    condition = () => true, // Condition to determine if caching should be applied
    excludeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'], // Methods to exclude from caching
  } = options;

  return async (req, res, next) => {
    // Skip caching for excluded methods
    if (excludeMethods.includes(req.method)) {
      return next();
    }

    // Check condition
    if (!condition(req)) {
      return next();
    }

    try {
      // Generate cache key
      const key = typeof keyGenerator === 'function'
        ? keyGenerator(req)
        : keyGenerator;

      // Try to get cached response
      const cached = await redis.get(key);

      if (cached) {
        // Cache hit - return cached response
        return res.json(cached);
      }

      // Cache miss - store original res.json
      const originalJson = res.json.bind(res);

      // Override res.json to cache the response
      res.json = (data) => {
        // Cache the response (don't wait for completion)
        redis.set(key, data, ttl).catch(err => {
          console.error('Cache set error:', err);
        });

        return originalJson(data);
      };

      next();
    } catch (err) {
      console.error('Cache middleware error:', err);
      next();
    }
  };
};

/**
 * Invalidate cache by pattern
 *
 * @param {string} pattern - Cache key pattern to invalidate
 * @returns {Function} Express middleware
 */
const invalidateCache = (pattern) => {
  return async (req, res, next) => {
    try {
      await redis.invalidatePattern(pattern);
      next();
    } catch (err) {
      console.error('Cache invalidation error:', err);
      next();
    }
  };
};

/**
 * Helper functions for common cache key patterns
 */
const cacheKeys = {
  /**
   * Generate cache key for action search
   */
  actionSearch: (req) => {
    const { q, category, tags } = req.query;
    return `actions:search:${q || 'all'}:${category || 'all'}:${tags || 'none'}`;
  },

  /**
   * Generate cache key for single action
   */
  action: (req) => {
    return `actions:${req.params.id}`;
  },

  /**
   * Generate cache key for workflow templates
   */
  templates: (req) => {
    const { category, tags } = req.query;
    return `templates:${category || 'all'}:${tags || 'none'}`;
  },

  /**
   * Generate cache key for user workflows
   */
  userWorkflows: (req) => {
    return `workflows:user:${req.user?.id || 'anonymous'}`;
  },

  /**
   * Generate cache key for GitHub Actions metadata
   */
  githubAction: (req) => {
    const { owner, repo, ref } = req.params;
    return `github:action:${owner}/${repo}:${ref || 'latest'}`;
  },
};

/**
 * Invalidation patterns for different resource types
 */
const invalidationPatterns = {
  allActions: 'actions:*',
  actionSearch: 'actions:search:*',
  allTemplates: 'templates:*',
  userWorkflows: (userId) => `workflows:user:${userId}:*`,
  githubActions: 'github:action:*',
};

module.exports = {
  cacheMiddleware,
  invalidateCache,
  cacheKeys,
  invalidationPatterns,
};
