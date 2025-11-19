/**
 * Authentication Routes
 *
 * Handles user registration, login, logout, and token refresh.
 * Implements secure authentication with JWT tokens and bcrypt password hashing.
 *
 * @module routes/auth
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/User');
const { generateTokens, refreshAccessToken } = require('../utils/jwtUtils');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

// Load Passport configuration
require('../config/passport');

/**
 * POST /api/auth/register
 * Register a new user account
 *
 * @body {string} username - Unique username (3-30 characters)
 * @body {string} email - Valid email address
 * @body {string} password - Password (minimum 8 characters)
 * @body {string} [displayName] - Optional display name
 *
 * @returns {Object} User object and JWT tokens
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Username, email, and password are required'
      });
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Username can only contain letters, numbers, underscores, and hyphens'
      });
    }

    // Validate username length
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Username must be between 3 and 30 characters'
      });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Please provide a valid email address'
      });
    }

    // Validate password length
    if (password.length < 8) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Password must be at least 8 characters long'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return res.status(409).json({
          error: 'User exists',
          message: 'An account with this email already exists'
        });
      } else {
        return res.status(409).json({
          error: 'User exists',
          message: 'This username is already taken'
        });
      }
    }

    // Create new user
    const user = new User({
      username,
      email: email.toLowerCase(),
      password,
      displayName: displayName || username,
      metadata: {
        createdIp: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    await user.save();

    // Generate JWT tokens
    const tokens = generateTokens(user);

    // Record login
    await user.recordLogin(req.ip, req.headers['user-agent']);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        createdAt: user.createdAt
      },
      ...tokens
    });
  } catch (error) {
    console.error('Registration error:', error);

    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        error: 'Validation error',
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      error: 'Registration failed',
      message: 'An error occurred during registration. Please try again.'
    });
  }
});

/**
 * POST /api/auth/login
 * Login with existing account
 *
 * @body {string} identifier - Username or email
 * @body {string} password - User password
 *
 * @returns {Object} User object and JWT tokens
 */
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Validation
    if (!identifier || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Username/email and password are required'
      });
    }

    // Find user by email or username
    const user = await User.findByIdentifier(identifier);

    if (!user) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid username/email or password'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        error: 'Account inactive',
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid username/email or password'
      });
    }

    // Generate JWT tokens
    const tokens = generateTokens(user);

    // Record login
    await user.recordLogin(req.ip, req.headers['user-agent']);

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        lastLogin: user.lastLogin,
        loginCount: user.loginCount
      },
      ...tokens
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred during login. Please try again.'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 *
 * @body {string} refreshToken - Valid refresh token
 *
 * @returns {Object} New access token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Refresh token is required'
      });
    }

    // Refresh the access token
    const getUserById = async (id) => await User.findById(id);
    const tokens = await refreshAccessToken(refreshToken, getUserById);

    res.json({
      message: 'Token refreshed successfully',
      ...tokens
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      error: 'Token refresh failed',
      message: error.message || 'Invalid or expired refresh token'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile (requires authentication)
 *
 * @returns {Object} Current user information
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        displayName: req.user.displayName,
        role: req.user.role,
        isEmailVerified: req.user.isEmailVerified,
        lastLogin: req.user.lastLogin,
        loginCount: req.user.loginCount,
        preferences: req.user.preferences,
        createdAt: req.user.createdAt
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to fetch profile',
      message: 'An error occurred while fetching your profile'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout current user (client-side token removal)
 *
 * @returns {Object} Success message
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    // In JWT authentication, logout is primarily handled client-side
    // by removing the token. Here we can log the event or invalidate
    // refresh tokens if we were storing them.

    res.json({
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: 'An error occurred during logout'
    });
  }
});

/**
 * PUT /api/auth/password
 * Change user password (requires authentication)
 *
 * @body {string} currentPassword - Current password
 * @body {string} newPassword - New password (minimum 8 characters)
 *
 * @returns {Object} Success message
 */
router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'New password must be at least 8 characters long'
      });
    }

    // Fetch user with password field
    const user = await User.findById(req.user._id).select('+password');

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Current password is incorrect'
      });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      error: 'Password change failed',
      message: 'An error occurred while updating your password'
    });
  }
});

/**
 * OAuth Routes
 */

/**
 * GET /api/auth/github
 * Initiate GitHub OAuth flow
 */
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

/**
 * GET /api/auth/github/callback
 * GitHub OAuth callback
 */
router.get(
  '/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: '/login?error=oauth_failed' }),
  async (req, res) => {
    try {
      // Generate JWT tokens
      const tokens = generateTokens(req.user);

      // Redirect to frontend with tokens
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const redirectUrl = `${frontendUrl}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;

      logger.logAuth('GitHub OAuth login successful', req.user._id, {
        email: req.user.email
      });

      res.redirect(redirectUrl);
    } catch (error) {
      logger.logError(error, { context: 'GitHub OAuth callback' });
      res.redirect('/login?error=oauth_failed');
    }
  }
);

/**
 * GET /api/auth/google
 * Initiate Google OAuth flow
 */
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

/**
 * GET /api/auth/google/callback
 * Google OAuth callback
 */
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login?error=oauth_failed' }),
  async (req, res) => {
    try {
      // Generate JWT tokens
      const tokens = generateTokens(req.user);

      // Redirect to frontend with tokens
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const redirectUrl = `${frontendUrl}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;

      logger.logAuth('Google OAuth login successful', req.user._id, {
        email: req.user.email
      });

      res.redirect(redirectUrl);
    } catch (error) {
      logger.logError(error, { context: 'Google OAuth callback' });
      res.redirect('/login?error=oauth_failed');
    }
  }
);

/**
 * GET /api/auth/microsoft
 * Initiate Microsoft OAuth flow
 */
router.get('/microsoft', passport.authenticate('microsoft', { scope: ['user.read'] }));

/**
 * GET /api/auth/microsoft/callback
 * Microsoft OAuth callback
 */
router.get(
  '/microsoft/callback',
  passport.authenticate('microsoft', { session: false, failureRedirect: '/login?error=oauth_failed' }),
  async (req, res) => {
    try {
      // Generate JWT tokens
      const tokens = generateTokens(req.user);

      // Redirect to frontend with tokens
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const redirectUrl = `${frontendUrl}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;

      logger.logAuth('Microsoft OAuth login successful', req.user._id, {
        email: req.user.email
      });

      res.redirect(redirectUrl);
    } catch (error) {
      logger.logError(error, { context: 'Microsoft OAuth callback' });
      res.redirect('/login?error=oauth_failed');
    }
  }
);

/**
 * GET /api/auth/gitlab
 * Initiate GitLab OAuth flow
 */
router.get('/gitlab', passport.authenticate('gitlab', { scope: ['read_user'] }));

/**
 * GET /api/auth/gitlab/callback
 * GitLab OAuth callback
 */
router.get(
  '/gitlab/callback',
  passport.authenticate('gitlab', { session: false, failureRedirect: '/login?error=oauth_failed' }),
  async (req, res) => {
    try {
      // Generate JWT tokens
      const tokens = generateTokens(req.user);

      // Redirect to frontend with tokens
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const redirectUrl = `${frontendUrl}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;

      logger.logAuth('GitLab OAuth login successful', req.user._id, {
        email: req.user.email
      });

      res.redirect(redirectUrl);
    } catch (error) {
      logger.logError(error, { context: 'GitLab OAuth callback' });
      res.redirect('/login?error=oauth_failed');
    }
  }
);

/**
 * GET /api/auth/bitbucket
 * Initiate Bitbucket OAuth flow
 */
router.get('/bitbucket', passport.authenticate('bitbucket', { scope: ['account', 'email'] }));

/**
 * GET /api/auth/bitbucket/callback
 * Bitbucket OAuth callback
 */
router.get(
  '/bitbucket/callback',
  passport.authenticate('bitbucket', { session: false, failureRedirect: '/login?error=oauth_failed' }),
  async (req, res) => {
    try {
      // Generate JWT tokens
      const tokens = generateTokens(req.user);

      // Redirect to frontend with tokens
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const redirectUrl = `${frontendUrl}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;

      logger.logAuth('Bitbucket OAuth login successful', req.user._id, {
        email: req.user.email
      });

      res.redirect(redirectUrl);
    } catch (error) {
      logger.logError(error, { context: 'Bitbucket OAuth callback' });
      res.redirect('/login?error=oauth_failed');
    }
  }
);

module.exports = router;
