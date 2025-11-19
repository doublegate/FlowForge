/**
 * JWT Utilities
 *
 * Handles JWT token generation, validation, and refresh for user authentication.
 * Implements secure token practices with expiration and refresh mechanisms.
 *
 * @module utils/jwtUtils
 * @version 1.0.0
 */

const jwt = require('jsonwebtoken');

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'; // 7 days
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d'; // 30 days

// Warn if using default secret in production
if (JWT_SECRET === 'your-secret-key-change-in-production' && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  WARNING: Using default JWT_SECRET in production! Please set JWT_SECRET environment variable.');
}

/**
 * Generate access token for user
 * @param {Object} user - User object from database
 * @returns {string} JWT access token
 */
function generateAccessToken(user) {
  const payload = {
    userId: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role,
    type: 'access'
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'flowforge-api',
    audience: 'flowforge-client'
  });
}

/**
 * Generate refresh token for user
 * @param {Object} user - User object from database
 * @returns {string} JWT refresh token
 */
function generateRefreshToken(user) {
  const payload = {
    userId: user._id.toString(),
    type: 'refresh'
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    issuer: 'flowforge-api',
    audience: 'flowforge-client'
  });
}

/**
 * Generate both access and refresh tokens
 * @param {Object} user - User object from database
 * @returns {Object} Object containing accessToken and refreshToken
 */
function generateTokens(user) {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
    expiresIn: JWT_EXPIRES_IN
  };
}

/**
 * Verify and decode JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'flowforge-api',
      audience: 'flowforge-client'
    });
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else if (error.name === 'NotBeforeError') {
      throw new Error('Token not yet valid');
    }
    throw new Error('Token verification failed');
  }
}

/**
 * Decode token without verification (for debugging)
 * @param {string} token - JWT token to decode
 * @returns {Object|null} Decoded token payload or null if invalid
 */
function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
}

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Extracted token or null
 */
function extractTokenFromHeader(authHeader) {
  if (!authHeader) return null;

  // Support both "Bearer token" and just "token"
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return authHeader;
}

/**
 * Check if token is expired
 * @param {string} token - JWT token to check
 * @returns {boolean} True if token is expired
 */
function isTokenExpired(token) {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
}

/**
 * Get token expiration time
 * @param {string} token - JWT token
 * @returns {Date|null} Expiration date or null
 */
function getTokenExpiration(token) {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return null;

    return new Date(decoded.exp * 1000);
  } catch (error) {
    return null;
  }
}

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Valid refresh token
 * @param {Function} getUserById - Function to fetch user by ID
 * @returns {Promise<Object>} New tokens object
 * @throws {Error} If refresh token is invalid
 */
async function refreshAccessToken(refreshToken, getUserById) {
  try {
    const decoded = verifyToken(refreshToken);

    // Verify it's a refresh token
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    // Fetch user to generate new tokens
    const user = await getUserById(decoded.userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.isActive) {
      throw new Error('User account is inactive');
    }

    // Generate new access token (keep same refresh token)
    return {
      accessToken: generateAccessToken(user),
      refreshToken: refreshToken, // Same refresh token
      expiresIn: JWT_EXPIRES_IN
    };
  } catch (error) {
    throw new Error(`Token refresh failed: ${error.message}`);
  }
}

/**
 * Validate token and return user info
 * @param {string} token - JWT token to validate
 * @returns {Object} User information from token
 * @throws {Error} If token is invalid
 */
function validateTokenAndGetUser(token) {
  const decoded = verifyToken(token);

  // Verify it's an access token
  if (decoded.type !== 'access') {
    throw new Error('Invalid token type');
  }

  return {
    userId: decoded.userId,
    username: decoded.username,
    email: decoded.email,
    role: decoded.role
  };
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  verifyToken,
  decodeToken,
  extractTokenFromHeader,
  isTokenExpired,
  getTokenExpiration,
  refreshAccessToken,
  validateTokenAndGetUser,
  JWT_SECRET,
  JWT_EXPIRES_IN
};
