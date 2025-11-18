/**
 * Redis Caching Service
 *
 * Provides centralized Redis caching functionality for the application.
 * Falls back to in-memory caching if Redis is unavailable.
 */

const Redis = require('ioredis');
const logger = console; // Use your logger here

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.fallbackCache = new Map();
    this.init();
  }

  init() {
    const redisEnabled = process.env.REDIS_ENABLED !== 'false';

    if (!redisEnabled) {
      logger.info('[Redis] Disabled - using in-memory cache fallback');
      return;
    }

    try {
      this.client = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0'),
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        logger.info('[Redis] Connected successfully');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        logger.error('[Redis] Connection error:', err.message);
      });

      this.client.on('close', () => {
        this.isConnected = false;
        logger.warn('[Redis] Connection closed');
      });

      // Attempt initial connection
      this.client.connect().catch(err => {
        logger.warn('[Redis] Initial connection failed, falling back to in-memory cache:', err.message);
      });

    } catch (err) {
      logger.error('[Redis] Initialization error:', err);
    }
  }

  async get(key) {
    if (!this.isConnected || !this.client) {
      // Fallback to in-memory cache
      const cached = this.fallbackCache.get(key);
      if (cached && cached.expiry > Date.now()) {
        return cached.value;
      }
      this.fallbackCache.delete(key);
      return null;
    }

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (err) {
      logger.error('[Redis] GET error:', err);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    if (!this.isConnected || !this.client) {
      // Fallback to in-memory cache
      this.fallbackCache.set(key, {
        value,
        expiry: Date.now() + (ttl * 1000),
      });

      // Clean up expired entries
      this.cleanupFallbackCache();
      return true;
    }

    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (err) {
      logger.error('[Redis] SET error:', err);
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected || !this.client) {
      this.fallbackCache.delete(key);
      return true;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (err) {
      logger.error('[Redis] DEL error:', err);
      return false;
    }
  }

  async invalidatePattern(pattern) {
    if (!this.isConnected || !this.client) {
      // Fallback: clear all matching keys from in-memory cache
      let count = 0;
      const regex = new RegExp(pattern.replace('*', '.*'));
      for (const key of this.fallbackCache.keys()) {
        if (regex.test(key)) {
          this.fallbackCache.delete(key);
          count++;
        }
      }
      return count;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      return keys.length;
    } catch (err) {
      logger.error('[Redis] Pattern invalidation error:', err);
      return 0;
    }
  }

  async exists(key) {
    if (!this.isConnected || !this.client) {
      const cached = this.fallbackCache.get(key);
      return cached && cached.expiry > Date.now();
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (err) {
      logger.error('[Redis] EXISTS error:', err);
      return false;
    }
  }

  async ttl(key) {
    if (!this.isConnected || !this.client) {
      const cached = this.fallbackCache.get(key);
      if (cached) {
        return Math.floor((cached.expiry - Date.now()) / 1000);
      }
      return -2;
    }

    try {
      return await this.client.ttl(key);
    } catch (err) {
      logger.error('[Redis] TTL error:', err);
      return -2;
    }
  }

  async increment(key, amount = 1) {
    if (!this.isConnected || !this.client) {
      const current = await this.get(key) || 0;
      const newValue = current + amount;
      await this.set(key, newValue);
      return newValue;
    }

    try {
      return await this.client.incrby(key, amount);
    } catch (err) {
      logger.error('[Redis] INCREMENT error:', err);
      return null;
    }
  }

  cleanupFallbackCache() {
    // Clean up expired entries from in-memory cache
    const now = Date.now();
    for (const [key, value] of this.fallbackCache.entries()) {
      if (value.expiry <= now) {
        this.fallbackCache.delete(key);
      }
    }

    // Limit cache size to prevent memory issues
    if (this.fallbackCache.size > 1000) {
      const toDelete = this.fallbackCache.size - 1000;
      const keys = Array.from(this.fallbackCache.keys()).slice(0, toDelete);
      keys.forEach(key => this.fallbackCache.delete(key));
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  getStats() {
    if (!this.isConnected || !this.client) {
      return {
        connected: false,
        fallbackSize: this.fallbackCache.size,
        type: 'in-memory',
      };
    }

    return {
      connected: true,
      type: 'redis',
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
    };
  }
}

module.exports = new RedisService();
