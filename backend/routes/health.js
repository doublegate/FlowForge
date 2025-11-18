/**
 * Health Check Routes
 *
 * Provides endpoints for monitoring application health and status
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const redis = require('../services/redis');

/**
 * Basic Health Check
 *
 * Returns 200 if application is running
 */
router.get('/ping', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Detailed Health Check
 *
 * Checks all critical services and dependencies
 */
router.get('/', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.5.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    services: {},
  };

  try {
    // Check MongoDB connection
    const mongoStatus = mongoose.connection.readyState;
    health.services.mongodb = {
      status: mongoStatus === 1 ? 'connected' : 'disconnected',
      readyState: mongoStatus,
      host: mongoose.connection.host,
      name: mongoose.connection.name,
    };

    if (mongoStatus !== 1) {
      health.status = 'unhealthy';
    }

    // Check Redis connection (if enabled)
    const redisStats = redis.getStats();
    health.services.redis = {
      status: redisStats.connected ? 'connected' : 'disconnected',
      type: redisStats.type,
    };

    if (redisStats.type === 'in-memory') {
      health.services.redis.fallback = true;
      health.services.redis.cacheSize = redisStats.fallbackSize;
    }

    // Check critical environment variables
    const requiredEnvVars = [
      'MONGODB_URI',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
    ];

    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

    health.services.environment = {
      status: missingEnvVars.length === 0 ? 'ok' : 'warning',
      missing: missingEnvVars,
    };

    if (missingEnvVars.length > 0) {
      health.status = 'degraded';
    }

    // System information
    health.system = {
      platform: process.platform,
      nodeVersion: process.version,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
      },
      cpu: process.cpuUsage(),
    };

    // Determine HTTP status code
    const statusCode = health.status === 'healthy' ? 200 :
                       health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(health);

  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Readiness Check
 *
 * Returns 200 when application is ready to accept traffic
 */
router.get('/ready', async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        ready: false,
        reason: 'Database not connected',
      });
    }

    // Check if required environment variables are set
    const required = ['MONGODB_URI', 'JWT_SECRET'];
    const missing = required.filter(v => !process.env[v]);

    if (missing.length > 0) {
      return res.status(503).json({
        ready: false,
        reason: 'Missing required configuration',
        missing,
      });
    }

    res.json({
      ready: true,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    res.status(503).json({
      ready: false,
      error: error.message,
    });
  }
});

/**
 * Liveness Check
 *
 * Returns 200 if application process is alive
 */
router.get('/live', (req, res) => {
  res.json({
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * Database Stats
 *
 * Returns database statistics (admin only)
 */
router.get('/db-stats', async (req, res) => {
  try {
    const stats = await mongoose.connection.db.stats();

    res.json({
      database: mongoose.connection.name,
      collections: stats.collections,
      dataSize: Math.round(stats.dataSize / 1024 / 1024) + 'MB',
      indexSize: Math.round(stats.indexSize / 1024 / 1024) + 'MB',
      objects: stats.objects,
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to get database stats',
      message: error.message,
    });
  }
});

module.exports = router;
