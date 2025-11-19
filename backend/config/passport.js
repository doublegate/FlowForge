/**
 * Passport OAuth Configuration
 *
 * Configures Passport.js strategies for OAuth authentication
 */

const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const GitLabStrategy = require('passport-gitlab2').Strategy;
const BitbucketStrategy = require('passport-bitbucket-oauth2').Strategy;
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

/**
 * Microsoft OAuth 2.0 Strategy
 *
 * Allows users to sign in with their Microsoft account
 */
if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
  passport.use(
    new MicrosoftStrategy(
      {
        clientID: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        callbackURL: process.env.MICROSOFT_CALLBACK_URL || 'http://localhost:3002/api/auth/microsoft/callback',
        scope: ['user.read'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value || profile.userPrincipalName;

          if (!email) {
            return done(new Error('No email found in Microsoft profile'), null);
          }

          // Check if user exists with Microsoft ID
          let user = await User.findOne({ microsoftId: profile.id });

          if (!user) {
            // Check if user exists with this email
            user = await User.findOne({ email });

            if (user) {
              // Link Microsoft account to existing user
              user.microsoftId = profile.id;
              user.microsoftAccessToken = accessToken;
              user.avatar = profile.photos?.[0]?.value || user.avatar;
              user.oauthProvider = 'microsoft';
              await user.save();

              logger.info('[OAuth] Linked Microsoft account to existing user', { email });
            } else {
              // Create new user
              user = await User.create({
                email,
                username: profile.displayName || email.split('@')[0],
                displayName: profile.displayName,
                microsoftId: profile.id,
                microsoftAccessToken: accessToken,
                avatar: profile.photos?.[0]?.value,
                emailVerified: true, // Microsoft emails are verified
                oauthProvider: 'microsoft',
              });

              logger.info('[OAuth] Created new user from Microsoft', { email });
            }
          } else {
            // Update existing Microsoft user
            user.microsoftAccessToken = accessToken;
            user.avatar = profile.photos?.[0]?.value || user.avatar;
            user.lastLogin = new Date();
            await user.save();

            logger.info('[OAuth] Updated Microsoft user', { email });
          }

          return done(null, user);
        } catch (err) {
          logger.logError(err, { context: 'Microsoft OAuth' });
          return done(err, null);
        }
      }
    )
  );

  logger.info('[Passport] Microsoft OAuth strategy configured');
} else {
  logger.warn('[Passport] Microsoft OAuth not configured - missing credentials');
}

/**
 * GitLab OAuth 2.0 Strategy
 *
 * Allows users to sign in with their GitLab account
 */
if (process.env.GITLAB_CLIENT_ID && process.env.GITLAB_CLIENT_SECRET) {
  passport.use(
    new GitLabStrategy(
      {
        clientID: process.env.GITLAB_CLIENT_ID,
        clientSecret: process.env.GITLAB_CLIENT_SECRET,
        callbackURL: process.env.GITLAB_CALLBACK_URL || 'http://localhost:3002/api/auth/gitlab/callback',
        baseURL: process.env.GITLAB_BASE_URL || 'https://gitlab.com',
        scope: ['read_user'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;

          if (!email) {
            return done(new Error('No email found in GitLab profile'), null);
          }

          // Check if user exists with GitLab ID
          let user = await User.findOne({ gitlabId: profile.id });

          if (!user) {
            // Check if user exists with this email
            user = await User.findOne({ email });

            if (user) {
              // Link GitLab account to existing user
              user.gitlabId = profile.id;
              user.gitlabAccessToken = accessToken;
              user.avatar = profile.avatarUrl || user.avatar;
              user.oauthProvider = 'gitlab';
              await user.save();

              logger.info('[OAuth] Linked GitLab account to existing user', { email });
            } else {
              // Create new user
              user = await User.create({
                email,
                username: profile.username || email.split('@')[0],
                displayName: profile.displayName || profile.username,
                gitlabId: profile.id,
                gitlabAccessToken: accessToken,
                avatar: profile.avatarUrl,
                emailVerified: true, // GitLab emails are verified
                oauthProvider: 'gitlab',
              });

              logger.info('[OAuth] Created new user from GitLab', { email });
            }
          } else {
            // Update existing GitLab user
            user.gitlabAccessToken = accessToken;
            user.avatar = profile.avatarUrl || user.avatar;
            user.lastLogin = new Date();
            await user.save();

            logger.info('[OAuth] Updated GitLab user', { email });
          }

          return done(null, user);
        } catch (err) {
          logger.logError(err, { context: 'GitLab OAuth' });
          return done(err, null);
        }
      }
    )
  );

  logger.info('[Passport] GitLab OAuth strategy configured');
} else {
  logger.warn('[Passport] GitLab OAuth not configured - missing credentials');
}

/**
 * Bitbucket OAuth 2.0 Strategy
 *
 * Allows users to sign in with their Bitbucket account
 */
if (process.env.BITBUCKET_CLIENT_ID && process.env.BITBUCKET_CLIENT_SECRET) {
  passport.use(
    new BitbucketStrategy(
      {
        clientID: process.env.BITBUCKET_CLIENT_ID,
        clientSecret: process.env.BITBUCKET_CLIENT_SECRET,
        callbackURL: process.env.BITBUCKET_CALLBACK_URL || 'http://localhost:3002/api/auth/bitbucket/callback',
        scope: ['account', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;

          if (!email) {
            return done(new Error('No email found in Bitbucket profile'), null);
          }

          // Check if user exists with Bitbucket ID
          let user = await User.findOne({ bitbucketId: profile.id });

          if (!user) {
            // Check if user exists with this email
            user = await User.findOne({ email });

            if (user) {
              // Link Bitbucket account to existing user
              user.bitbucketId = profile.id;
              user.bitbucketAccessToken = accessToken;
              user.avatar = profile.avatar || user.avatar;
              user.oauthProvider = 'bitbucket';
              await user.save();

              logger.info('[OAuth] Linked Bitbucket account to existing user', { email });
            } else {
              // Create new user
              user = await User.create({
                email,
                username: profile.username || email.split('@')[0],
                displayName: profile.displayName || profile.username,
                bitbucketId: profile.id,
                bitbucketAccessToken: accessToken,
                avatar: profile.avatar,
                emailVerified: true, // Bitbucket emails are verified
                oauthProvider: 'bitbucket',
              });

              logger.info('[OAuth] Created new user from Bitbucket', { email });
            }
          } else {
            // Update existing Bitbucket user
            user.bitbucketAccessToken = accessToken;
            user.avatar = profile.avatar || user.avatar;
            user.lastLogin = new Date();
            await user.save();

            logger.info('[OAuth] Updated Bitbucket user', { email });
          }

          return done(null, user);
        } catch (err) {
          logger.logError(err, { context: 'Bitbucket OAuth' });
          return done(err, null);
        }
      }
    )
  );

  logger.info('[Passport] Bitbucket OAuth strategy configured');
} else {
  logger.warn('[Passport] Bitbucket OAuth not configured - missing credentials');
}

module.exports = passport;
