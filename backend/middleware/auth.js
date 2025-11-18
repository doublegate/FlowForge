/**
 * Authentication Middleware
 *
 * Middleware functions for protecting routes with JWT authentication.
 * Provides authentication, authorization, and role-based access control.
 *
 * @module middleware/auth
 * @version 1.0.0
 */

const User = require('../models/User');
const {
  extractTokenFromHeader,
  validateTokenAndGetUser
} = require('../utils/jwtUtils');

/**
 * Middleware to authenticate requests using JWT
 * Attaches user object to request if authenticated
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function authenticate(req, res, next) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No authentication token provided'
      });
    }

    // Validate token and extract user info
    const tokenUser = validateTokenAndGetUser(token);

    // Fetch full user from database
    const user = await User.findById(tokenUser.userId);

    if (!user) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: 'Account inactive',
        message: 'Your account has been deactivated'
      });
    }

    // Attach user to request object
    req.user = user;
    req.userId = user._id.toString();

    next();
  } catch (error) {
    if (error.message.includes('expired')) {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Your session has expired. Please login again.'
      });
    }

    return res.status(401).json({
      error: 'Authentication failed',
      message: error.message || 'Invalid authentication token'
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token is present, but doesn't require it
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      const tokenUser = validateTokenAndGetUser(token);
      const user = await User.findById(tokenUser.userId);

      if (user && user.isActive) {
        req.user = user;
        req.userId = user._id.toString();
      }
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail on errors
    next();
  }
}

/**
 * Middleware to require admin role
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'You must be logged in to access this resource'
    });
  }

  if (!req.user.isAdmin()) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Admin privileges required to access this resource'
    });
  }

  next();
}

/**
 * Middleware to check if user has specific role
 *
 * @param {string|string[]} roles - Required role(s)
 * @returns {Function} Express middleware function
 */
function requireRole(roles) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `This resource requires one of the following roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
}

/**
 * Middleware to check resource ownership or admin
 * Allows access if user owns the resource or is admin
 *
 * @param {string} resourceParam - Request parameter containing resource ID
 * @param {Function} getResource - Function to fetch resource by ID
 * @returns {Function} Express middleware function
 */
function requireOwnershipOrAdmin(resourceParam, getResource) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource'
      });
    }

    // Admins can access everything
    if (req.user.isAdmin()) {
      return next();
    }

    try {
      const resourceId = req.params[resourceParam];
      const resource = await getResource(resourceId);

      if (!resource) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Resource not found'
        });
      }

      // Check if user owns the resource
      if (!req.user.canAccess(resource)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have permission to access this resource'
        });
      }

      // Attach resource to request for use in route handler
      req.resource = resource;
      next();
    } catch (error) {
      return res.status(500).json({
        error: 'Server error',
        message: 'Failed to verify resource ownership'
      });
    }
  };
}

/**
 * Middleware to verify email is confirmed
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function requireEmailVerified(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'You must be logged in to access this resource'
    });
  }

  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      error: 'Email verification required',
      message: 'Please verify your email address to access this resource'
    });
  }

  next();
}

module.exports = {
  authenticate,
  optionalAuth,
  requireAdmin,
  requireRole,
  requireOwnershipOrAdmin,
  requireEmailVerified
};
