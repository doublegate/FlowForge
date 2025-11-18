/**
 * OAuth Authentication Routes
 *
 * Handles OAuth flows for GitHub, Google, and other providers
 */

const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');

/**
 * Generate JWT tokens for OAuth user
 */
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    {
      userId: user._id,
      email: user.email,
      username: user.username,
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );

  const refreshToken = jwt.sign(
    { userId: user._id },
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
    { expiresIn: '30d' }
  );

  return { accessToken, refreshToken };
};

/**
 * GitHub OAuth Routes
 */

// Initiate GitHub OAuth flow
router.get(
  '/github',
  passport.authenticate('github', {
    session: false,
    scope: ['user:email'],
  })
);

// GitHub OAuth callback
router.get(
  '/github/callback',
  passport.authenticate('github', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=auth_failed`,
  }),
  (req, res) => {
    try {
      // Generate JWT tokens
      const { accessToken, refreshToken } = generateTokens(req.user);

      // Redirect to frontend with tokens
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(
        `${frontendUrl}/auth/callback?token=${accessToken}&refresh=${refreshToken}&provider=github`
      );
    } catch (err) {
      console.error('[OAuth] Token generation error:', err);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=token_error`);
    }
  }
);

/**
 * Google OAuth Routes (Optional - configure when credentials available)
 */

// Initiate Google OAuth flow
router.get(
  '/google',
  (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(501).json({
        error: 'Google OAuth not configured',
        message: 'Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET',
      });
    }
    next();
  },
  passport.authenticate('google', {
    session: false,
    scope: ['profile', 'email'],
  })
);

// Google OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=auth_failed`,
  }),
  (req, res) => {
    try {
      const { accessToken, refreshToken } = generateTokens(req.user);

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(
        `${frontendUrl}/auth/callback?token=${accessToken}&refresh=${refreshToken}&provider=google`
      );
    } catch (err) {
      console.error('[OAuth] Token generation error:', err);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=token_error`);
    }
  }
);

/**
 * OAuth Status Endpoint
 *
 * Returns available OAuth providers
 */
router.get('/status', (req, res) => {
  const providers = {
    github: {
      enabled: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
      url: '/api/auth/github',
    },
    google: {
      enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      url: '/api/auth/google',
    },
  };

  res.json({
    oauth: {
      enabled: providers.github.enabled || providers.google.enabled,
      providers,
    },
  });
});

/**
 * Unlink OAuth Provider
 *
 * Removes OAuth connection from user account
 */
router.delete('/unlink/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const User = require('../models/User');
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has a password (can't unlink if no other auth method)
    if (!user.password && user.oauthProvider === provider) {
      return res.status(400).json({
        error: 'Cannot unlink',
        message: 'You must set a password before unlinking your OAuth account',
      });
    }

    // Unlink provider
    switch (provider) {
      case 'github':
        user.githubId = undefined;
        user.githubAccessToken = undefined;
        break;
      case 'google':
        user.googleId = undefined;
        user.googleAccessToken = undefined;
        break;
      default:
        return res.status(400).json({ error: 'Invalid provider' });
    }

    // Update OAuth provider if this was the active one
    if (user.oauthProvider === provider) {
      user.oauthProvider = 'local';
    }

    await user.save();

    res.json({
      success: true,
      message: `${provider} account unlinked successfully`,
    });
  } catch (err) {
    console.error('[OAuth] Unlink error:', err);
    res.status(500).json({ error: 'Failed to unlink OAuth provider' });
  }
});

module.exports = router;
