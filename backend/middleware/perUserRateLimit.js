/**
 * Per-User Rate Limiting Middleware
 *
 * Implements rate limiting based on authenticated user ID rather than IP address.
 * This provides more accurate rate limiting for multi-user systems and prevents
 * bypassing limits through IP rotation.
 *
 * Features:
 * - User-specific rate limits
 * - Configurable time windows and max requests
 * - Different limits for different user tiers
 * - In-memory storage with automatic cleanup
 * - Optional Redis support for distributed systems
 */

const logger = require('../utils/logger');

class PerUserRateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes default
    this.maxRequests = options.maxRequests || 100; // 100 requests default
    this.skipSuccessfulRequests = options.skipSuccessfulRequests || false;
    this.skipFailedRequests = options.skipFailedRequests || false;
    this.keyPrefix = options.keyPrefix || 'ratelimit';

    // User tier limits (can be customized)
    this.tierLimits = options.tierLimits || {
      free: 100,
      basic: 500,
      premium: 2000,
      enterprise: 10000
    };

    // In-memory store
    this.store = new Map();

    // Cleanup interval to remove expired entries
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Clean up every minute

    logger.info('Per-user rate limiter initialized', {
      windowMs: this.windowMs,
      maxRequests: this.maxRequests,
      tierLimits: this.tierLimits
    });
  }

  /**
   * Get rate limit for a specific user based on their tier
   */
  getUserLimit(user) {
    if (!user) return this.maxRequests;

    const tier = user.tier || user.subscription?.tier || 'free';
    return this.tierLimits[tier] || this.maxRequests;
  }

  /**
   * Get or create user record
   */
  getUserRecord(userId) {
    const key = `${this.keyPrefix}:${userId}`;

    if (!this.store.has(key)) {
      this.store.set(key, {
        count: 0,
        resetTime: Date.now() + this.windowMs,
        requests: []
      });
    }

    return this.store.get(key);
  }

  /**
   * Check if user has exceeded rate limit
   */
  isRateLimited(userId, userLimit) {
    const record = this.getUserRecord(userId);
    const now = Date.now();

    // Reset if window has expired
    if (now >= record.resetTime) {
      record.count = 0;
      record.resetTime = now + this.windowMs;
      record.requests = [];
    }

    // Remove old requests outside the current window
    record.requests = record.requests.filter(timestamp => timestamp > now - this.windowMs);
    record.count = record.requests.length;

    return record.count >= userLimit;
  }

  /**
   * Increment user request count
   */
  incrementUser(userId) {
    const record = this.getUserRecord(userId);
    const now = Date.now();

    record.requests.push(now);
    record.count = record.requests.length;

    return record;
  }

  /**
   * Get user rate limit status
   */
  getUserStatus(userId, userLimit) {
    const record = this.getUserRecord(userId);
    const now = Date.now();

    // Calculate remaining requests
    const validRequests = record.requests.filter(timestamp => timestamp > now - this.windowMs);
    const remaining = Math.max(0, userLimit - validRequests.length);
    const resetTime = record.resetTime;

    return {
      limit: userLimit,
      remaining,
      reset: resetTime,
      retryAfter: resetTime - now
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, record] of this.store.entries()) {
      // Remove entries that haven't been accessed in 2x the window time
      if (now >= record.resetTime + this.windowMs) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Rate limit cleanup: removed ${cleaned} expired entries`);
    }
  }

  /**
   * Reset user rate limit (admin function)
   */
  resetUser(userId) {
    const key = `${this.keyPrefix}:${userId}`;
    this.store.delete(key);
    logger.info(`Rate limit reset for user: ${userId}`);
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalUsers: this.store.size,
      windowMs: this.windowMs,
      maxRequests: this.maxRequests,
      tierLimits: this.tierLimits
    };
  }

  /**
   * Shutdown cleanup
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
    logger.info('Per-user rate limiter shutdown complete');
  }
}

/**
 * Create rate limiter middleware
 */
function createPerUserRateLimiter(options = {}) {
  const limiter = new PerUserRateLimiter(options);

  return async (req, res, next) => {
    // Skip if no user (fallback to IP-based limiting in other middleware)
    if (!req.userId && !req.user) {
      return next();
    }

    const userId = req.userId || req.user?.id || req.user?._id?.toString();
    const user = req.user;

    try {
      // Get user-specific limit
      const userLimit = limiter.getUserLimit(user);

      // Check if rate limited
      if (limiter.isRateLimited(userId, userLimit)) {
        const status = limiter.getUserStatus(userId, userLimit);

        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': status.limit,
          'X-RateLimit-Remaining': 0,
          'X-RateLimit-Reset': new Date(status.reset).toISOString(),
          'Retry-After': Math.ceil(status.retryAfter / 1000)
        });

        logger.warn(`Rate limit exceeded for user: ${userId}`, {
          limit: status.limit,
          endpoint: req.path
        });

        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'You have exceeded your rate limit. Please try again later.',
          limit: status.limit,
          retryAfter: Math.ceil(status.retryAfter / 1000),
          resetAt: new Date(status.reset).toISOString()
        });
      }

      // Increment request count
      limiter.incrementUser(userId);

      // Get updated status
      const status = limiter.getUserStatus(userId, userLimit);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': status.limit,
        'X-RateLimit-Remaining': status.remaining,
        'X-RateLimit-Reset': new Date(status.reset).toISOString()
      });

      // Log warning if user is approaching limit
      if (status.remaining < userLimit * 0.1) { // Less than 10% remaining
        logger.warn(`User approaching rate limit: ${userId}`, {
          remaining: status.remaining,
          limit: status.limit
        });
      }

      next();
    } catch (error) {
      logger.error('Rate limit middleware error:', error);
      // Don't block request on rate limiter errors
      next();
    }
  };
}

/**
 * Predefined rate limiters for different endpoints
 */

// General API rate limiter
const apiRateLimiter = createPerUserRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  keyPrefix: 'api',
  tierLimits: {
    free: 100,
    basic: 500,
    premium: 2000,
    enterprise: 10000
  }
});

// AI endpoints rate limiter (more restrictive)
const aiRateLimiter = createPerUserRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 20,
  keyPrefix: 'ai',
  tierLimits: {
    free: 20,
    basic: 100,
    premium: 500,
    enterprise: 2000
  }
});

// GitHub operations rate limiter
const githubRateLimiter = createPerUserRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 50,
  keyPrefix: 'github',
  tierLimits: {
    free: 50,
    basic: 200,
    premium: 1000,
    enterprise: 5000
  }
});

// Workflow operations rate limiter
const workflowRateLimiter = createPerUserRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 200,
  keyPrefix: 'workflow',
  tierLimits: {
    free: 200,
    basic: 1000,
    premium: 5000,
    enterprise: 20000
  }
});

// Comments rate limiter
const commentsRateLimiter = createPerUserRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  keyPrefix: 'comments',
  tierLimits: {
    free: 100,
    basic: 500,
    premium: 2000,
    enterprise: 10000
  }
});

module.exports = {
  PerUserRateLimiter,
  createPerUserRateLimiter,
  apiRateLimiter,
  aiRateLimiter,
  githubRateLimiter,
  workflowRateLimiter,
  commentsRateLimiter
};
