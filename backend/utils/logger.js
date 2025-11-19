/**
 * Logger Utility
 *
 * Centralized logging system using Winston with:
 * - Multiple log levels (error, warn, info, http, debug)
 * - Daily rotating files
 * - JSON structured logging
 * - Console output in development
 * - Production-optimized configuration
 *
 * @module utils/logger
 * @version 1.0.0
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors for console output
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Determine log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

// Define log format for console (colorized)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    let metaString = '';

    if (Object.keys(meta).length > 0) {
      metaString = '\n' + JSON.stringify(meta, null, 2);
    }

    return `${timestamp} [${level}]: ${message}${metaString}`;
  })
);

// Define log format for files (JSON)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');

// Daily rotating file transport for all logs
const allLogsTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: fileFormat,
});

// Daily rotating file transport for error logs
const errorLogsTransport = new DailyRotateFile({
  level: 'error',
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  format: fileFormat,
});

// Daily rotating file transport for HTTP logs
const httpLogsTransport = new DailyRotateFile({
  level: 'http',
  filename: path.join(logsDir, 'http-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '7d',
  format: fileFormat,
});

// Console transport
const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
});

// Create transports array
const transports = [allLogsTransport, errorLogsTransport, httpLogsTransport];

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  transports.push(consoleTransport);
}

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  transports,
  exitOnError: false,
});

/**
 * Log HTTP requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {number} duration - Request duration in ms
 */
logger.logRequest = (req, res, duration) => {
  const message = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;
  const meta = {
    method: req.method,
    url: req.originalUrl,
    status: res.statusCode,
    duration: `${duration}ms`,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  };

  if (res.statusCode >= 500) {
    logger.error(message, meta);
  } else if (res.statusCode >= 400) {
    logger.warn(message, meta);
  } else {
    logger.http(message, meta);
  }
};

/**
 * Log authentication events
 * @param {string} event - Auth event type
 * @param {string} userId - User ID
 * @param {Object} details - Additional details
 */
logger.logAuth = (event, userId, details = {}) => {
  logger.info(`Auth: ${event}`, {
    event,
    userId,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Log database operations
 * @param {string} operation - DB operation type
 * @param {string} collection - Collection name
 * @param {Object} details - Additional details
 */
logger.logDatabase = (operation, collection, details = {}) => {
  logger.debug(`DB: ${operation} on ${collection}`, {
    operation,
    collection,
    ...details,
  });
};

/**
 * Log errors with context
 * @param {Error} error - Error object
 * @param {Object} context - Additional context
 */
logger.logError = (error, context = {}) => {
  logger.error(error.message, {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    ...context,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Log security events
 * @param {string} event - Security event type
 * @param {Object} details - Event details
 */
logger.logSecurity = (event, details = {}) => {
  logger.warn(`Security: ${event}`, {
    event,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Log performance metrics
 * @param {string} operation - Operation name
 * @param {number} duration - Duration in ms
 * @param {Object} details - Additional details
 */
logger.logPerformance = (operation, duration, details = {}) => {
  const level = duration > 1000 ? 'warn' : 'debug';
  logger[level](`Performance: ${operation} took ${duration}ms`, {
    operation,
    duration,
    ...details,
  });
};

// Log startup information
logger.info('Logger initialized', {
  level: level(),
  environment: process.env.NODE_ENV || 'development',
  logsDir,
});

module.exports = logger;
