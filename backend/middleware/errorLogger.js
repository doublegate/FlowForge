/**
 * Error Logger Middleware
 *
 * Logs all errors that occur during request processing
 *
 * @module middleware/errorLogger
 */

const logger = require('../utils/logger');

/**
 * Error logging middleware
 * Must be placed after all routes and before error handler
 */
const errorLogger = (err, req, res, next) => {
  // Log the error with request context
  logger.logError(err, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id,
    body: req.body,
    query: req.query,
  });

  // Pass error to next error handler
  next(err);
};

module.exports = errorLogger;
