/**
 * Passport OAuth Configuration
 *
 * Configures Passport.js strategies for OAuth authentication
 */

const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Serialize user for session
 */
passport.serializeUser((user, done) => {
  done(null, user.id);
});

/**
 * Deserialize user from session
 */
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

/**
 * GitHub OAuth 2.0 Strategy
 *
 * Allows users to sign in with their GitHub account
 */
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL:
          process.env.GITHUB_CALLBACK_URL ||
          'http://localhost:3002/api/auth/github/callback',
        scope: ['user:email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Extract email from profile
          const email = profile.emails?.[0]?.value;

          if (!email) {
            return done(new Error('No email found in GitHub profile'), null);
          }

          // Check if user exists with GitHub ID
          let user = await User.findOne({ githubId: profile.id });

          if (!user) {
            // Check if user exists with this email
            user = await User.findOne({ email });

            if (user) {
              // Link GitHub account to existing user
              user.githubId = profile.id;
              user.githubAccessToken = accessToken;
              user.avatar = profile.photos?.[0]?.value || user.avatar;
              user.oauthProvider = 'github';
              await user.save();

              logger.info('[OAuth] Linked GitHub account to existing user', { email });
            } else {
              // Create new user
              user = await User.create({
                email,
                username: profile.username || profile.displayName || email.split('@')[0],
                githubId: profile.id,
                githubAccessToken: accessToken,
                avatar: profile.photos?.[0]?.value,
                emailVerified: true, // GitHub emails are verified
                oauthProvider: 'github',
              });

              logger.info('[OAuth] Created new user from GitHub', { email });
            }
          } else {
            // Update existing GitHub user
            user.githubAccessToken = accessToken;
            user.avatar = profile.photos?.[0]?.value || user.avatar;
            user.lastLogin = new Date();
            await user.save();

            logger.info('[OAuth] Updated GitHub user', { email });
          }

          return done(null, user);
        } catch (err) {
          logger.logError(err, { context: 'GitHub OAuth' });
          return done(err, null);
        }
      }
    )
  );

  logger.info('[Passport] GitHub OAuth strategy configured');
} else {
  logger.warn('[Passport] GitHub OAuth not configured - missing credentials');
}

/**
 * Google OAuth 2.0 Strategy
 *
 * Allows users to sign in with their Google account
 */
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3002/api/auth/google/callback',
        scope: ['profile', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;

          if (!email) {
            return done(new Error('No email found in Google profile'), null);
          }

          // Check if user exists with Google ID
          let user = await User.findOne({ googleId: profile.id });

          if (!user) {
            // Check if user exists with this email
            user = await User.findOne({ email });

            if (user) {
              // Link Google account to existing user
              user.googleId = profile.id;
              user.googleAccessToken = accessToken;
              user.avatar = profile.photos?.[0]?.value || user.avatar;
              user.oauthProvider = 'google';
              await user.save();

              logger.info('[OAuth] Linked Google account to existing user', { email });
            } else {
              // Create new user
              user = await User.create({
                email,
                username: profile.displayName || email.split('@')[0],
                googleId: profile.id,
                googleAccessToken: accessToken,
                avatar: profile.photos?.[0]?.value,
                emailVerified: true, // Google emails are verified
                oauthProvider: 'google',
              });

              logger.info('[OAuth] Created new user from Google', { email });
            }
          } else {
            // Update existing Google user
            user.googleAccessToken = accessToken;
            user.avatar = profile.photos?.[0]?.value || user.avatar;
            user.lastLogin = new Date();
            await user.save();

            logger.info('[OAuth] Updated Google user', { email });
          }

          return done(null, user);
        } catch (err) {
          logger.logError(err, { context: 'Google OAuth' });
          return done(err, null);
        }
      }
    )
  );

  logger.info('[Passport] Google OAuth strategy configured');
} else {
  logger.warn('[Passport] Google OAuth not configured - missing credentials');
}

module.exports = passport;
