# Redis Caching Implementation Guide

This guide provides step-by-step instructions for implementing Redis caching in FlowForge to improve performance and scalability.

## Overview

Redis will replace the current in-memory LRU cache, providing:
- Persistent caching across server restarts
- Shared cache for multiple backend instances
- Better performance for frequently accessed data
- Support for cache invalidation strategies

## Prerequisites

- Redis 6.0 or higher installed
- Node.js Redis client (`ioredis` recommended)
- Basic understanding of caching strategies

## Installation

### 1. Install Redis

**macOS (Homebrew):**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**Docker:**
```bash
docker run -d --name redis -p 6379:6379 redis:alpine
```

### 2. Install Node.js Redis Client

```bash
cd backend
npm install ioredis
npm install --save-dev @types/ioredis
```

## Implementation Steps

### Step 1: Create Redis Service

Create `backend/services/redis.js`:

```javascript
const Redis = require('ioredis');
const logger = require('../utils/logger');

class RedisService {
  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      db: process.env.REDIS_DB || 0,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.client.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    this.client.on('error', (err) => {
      logger.error('Redis connection error:', err);
    });
  }

  async get(key) {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (err) {
      logger.error('Redis GET error:', err);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (err) {
      logger.error('Redis SET error:', err);
      return false;
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
      return true;
    } catch (err) {
      logger.error('Redis DEL error:', err);
      return false;
    }
  }

  async invalidatePattern(pattern) {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      return keys.length;
    } catch (err) {
      logger.error('Redis pattern invalidation error:', err);
      return 0;
    }
  }

  async disconnect() {
    await this.client.quit();
  }
}

module.exports = new RedisService();
```

### Step 2: Update Environment Variables

Add to `.env`:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
CACHE_TTL=3600
```

### Step 3: Replace LRU Cache

Update `backend/utils/cache.js`:

```javascript
const redis = require('../services/redis');

class CacheManager {
  constructor() {
    this.enabled = process.env.REDIS_ENABLED !== 'false';
  }

  async get(key) {
    if (!this.enabled) return null;
    return await redis.get(key);
  }

  async set(key, value, ttl = process.env.CACHE_TTL || 3600) {
    if (!this.enabled) return false;
    return await redis.set(key, value, ttl);
  }

  async invalidate(key) {
    if (!this.enabled) return false;
    return await redis.del(key);
  }

  async invalidatePattern(pattern) {
    if (!this.enabled) return 0;
    return await redis.invalidatePattern(pattern);
  }
}

module.exports = new CacheManager();
```

### Step 4: Update Caching Middleware

Create `backend/middleware/cache.js`:

```javascript
const cache = require('../utils/cache');

const cacheMiddleware = (keyGenerator, ttl = 3600) => {
  return async (req, res, next) => {
    const key = typeof keyGenerator === 'function'
      ? keyGenerator(req)
      : keyGenerator;

    try {
      const cached = await cache.get(key);

      if (cached) {
        return res.json(cached);
      }

      // Store original res.json
      const originalJson = res.json.bind(res);

      // Override res.json
      res.json = (data) => {
        cache.set(key, data, ttl).catch(console.error);
        return originalJson(data);
      };

      next();
    } catch (err) {
      console.error('Cache middleware error:', err);
      next();
    }
  };
};

module.exports = cacheMiddleware;
```

### Step 5: Apply Caching to Routes

Update route files (e.g., `backend/routes/actions.js`):

```javascript
const cacheMiddleware = require('../middleware/cache');

// Cache action search results
router.get(
  '/search',
  cacheMiddleware(req => `actions:search:${req.query.q}:${req.query.category}`, 1800),
  actionController.search
);

// Cache individual actions
router.get(
  '/:id',
  cacheMiddleware(req => `actions:${req.params.id}`, 3600),
  actionController.getById
);
```

## Cache Invalidation Strategy

### On Data Updates

```javascript
// In actionController.update
async update(req, res) {
  const { id } = req.params;

  // Update action
  const action = await Action.findByIdAndUpdate(id, req.body, { new: true });

  // Invalidate caches
  await cache.invalidate(`actions:${id}`);
  await cache.invalidatePattern('actions:search:*');

  res.json(action);
}
```

## Monitoring & Maintenance

### Check Redis Status

```bash
redis-cli ping
# Should return: PONG
```

### Monitor Cache Hit Rate

```javascript
const redis = require('./services/redis');

async function getCacheStats() {
  const info = await redis.client.info('stats');
  // Parse and log cache statistics
}
```

### Clear All Cache

```javascript
await redis.client.flushdb();
```

## Production Considerations

1. **Redis Cluster**: For high availability, use Redis Cluster or Sentinel
2. **Persistence**: Configure RDB or AOF for data persistence
3. **Memory Limits**: Set `maxmemory` and `maxmemory-policy`
4. **Monitoring**: Use Redis monitoring tools (RedisInsight, Prometheus)
5. **Security**: Enable authentication and TLS for production

## Testing

```javascript
// backend/tests/redis.test.js
const redis = require('../services/redis');

describe('Redis Service', () => {
  afterAll(async () => {
    await redis.disconnect();
  });

  test('should set and get value', async () => {
    await redis.set('test:key', { foo: 'bar' });
    const value = await redis.get('test:key');
    expect(value).toEqual({ foo: 'bar' });
  });

  test('should handle TTL', async () => {
    await redis.set('test:ttl', 'value', 1);
    await new Promise(resolve => setTimeout(resolve, 1100));
    const value = await redis.get('test:ttl');
    expect(value).toBeNull();
  });
});
```

## Troubleshooting

### Connection Issues
- Verify Redis is running: `redis-cli ping`
- Check firewall rules
- Verify connection credentials

### Performance Issues
- Monitor memory usage: `redis-cli info memory`
- Check slow log: `redis-cli slowlog get 10`
- Optimize key patterns and TTL values

## References

- [Redis Documentation](https://redis.io/documentation)
- [ioredis GitHub](https://github.com/luin/ioredis)
- [Redis Best Practices](https://redis.io/topics/best-practices)
