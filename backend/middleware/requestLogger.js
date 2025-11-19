/**
 * Request Logger Middleware
 *
 * Logs all HTTP requests with timing information
 *
 * @module middleware/requestLogger
 */

const logger = require('../utils/logger');

/**
 * Request logging middleware
 * Logs all HTTP requests with method, URL, status code, and duration
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.logRequest(req, res, duration);
  });

  next();
};

module.exports = requestLogger;
