# OAuth & SSO Implementation Guide

This guide provides comprehensive instructions for implementing OAuth 2.0 and Single Sign-On (SSO) authentication in FlowForge.

## Overview

Adding OAuth/SSO will enable users to:
- Sign in with GitHub, Google, Microsoft, etc.
- Use enterprise SSO providers (SAML, OIDC)
- Maintain secure authentication without managing passwords
- Enable team-based authentication

## Prerequisites

- Existing JWT authentication system (✅ implemented)
- OAuth provider credentials (GitHub, Google, etc.)
- Understanding of OAuth 2.0 flow
- SSL/TLS certificates for production

## Option 1: GitHub OAuth (Recommended for FlowForge)

### Step 1: Register OAuth App

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in details:
   - Application name: `FlowForge`
   - Homepage URL: `https://your-domain.com`
   - Authorization callback URL: `https://your-domain.com/api/auth/github/callback`
4. Save **Client ID** and **Client Secret**

### Step 2: Install Dependencies

```bash
cd backend
npm install passport passport-github2 passport-oauth2
npm install --save-dev @types/passport @types/passport-github2
```

### Step 3: Configure Passport Strategy

Create `backend/config/passport.js`:

```javascript
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// GitHub OAuth Strategy
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3002/api/auth/github/callback',
    scope: ['user:email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user exists
      let user = await User.findOne({ githubId: profile.id });

      if (!user) {
        // Check if email already exists
        const email = profile.emails?.[0]?.value;
        user = await User.findOne({ email });

        if (user) {
          // Link GitHub account to existing user
          user.githubId = profile.id;
          user.githubAccessToken = accessToken;
          await user.save();
        } else {
          // Create new user
          user = await User.create({
            email,
            username: profile.username || profile.displayName,
            githubId: profile.id,
            githubAccessToken: accessToken,
            avatar: profile.photos?.[0]?.value,
            emailVerified: true, // GitHub emails are verified
          });
        }
      } else {
        // Update access token
        user.githubAccessToken = accessToken;
        await user.save();
      }

      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

module.exports = passport;
```

### Step 4: Update User Model

Add to `backend/models/User.js`:

```javascript
const userSchema = new mongoose.Schema({
  // ... existing fields

  // OAuth fields
  githubId: {
    type: String,
    unique: true,
    sparse: true
  },
  githubAccessToken: String,
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  googleAccessToken: String,
  oauthProvider: {
    type: String,
    enum: ['local', 'github', 'google', 'microsoft'],
    default: 'local'
  },
  avatar: String,
  emailVerified: {
    type: Boolean,
    default: false
  }
});
```

### Step 5: Create OAuth Routes

Create `backend/routes/oauth.js`:

```javascript
const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');

// GitHub OAuth
router.get('/github',
  passport.authenticate('github', { session: false })
);

router.get('/github/callback',
  passport.authenticate('github', {
    session: false,
    failureRedirect: '/login?error=auth_failed'
  }),
  (req, res) => {
    // Generate JWT tokens
    const accessToken = jwt.sign(
      { userId: req.user._id, email: req.user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const refreshToken = jwt.sign(
      { userId: req.user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '30d' }
    );

    // Redirect to frontend with tokens
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${accessToken}&refresh=${refreshToken}`);
  }
);

module.exports = router;
```

### Step 6: Update Environment Variables

Add to `.env`:

```env
# OAuth Configuration
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3002/api/auth/github/callback

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3002/api/auth/google/callback
```

### Step 7: Frontend Integration

Update `frontend/src/components/Login.tsx`:

```typescript
import { Github } from 'lucide-react';

const Login = () => {
  const handleGitHubLogin = () => {
    window.location.href = `${process.env.VITE_API_URL}/api/auth/github`;
  };

  return (
    <div>
      {/* Existing email/password form */}

      <div className="divider">OR</div>

      <button
        onClick={handleGitHubLogin}
        className="oauth-button github"
      >
        <Github size={20} />
        Continue with GitHub
      </button>
    </div>
  );
};
```

Create OAuth callback handler:

```typescript
// frontend/src/pages/AuthCallback.tsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const refresh = searchParams.get('refresh');

    if (token && refresh) {
      login(token, refresh);
      navigate('/');
    } else {
      navigate('/login?error=auth_failed');
    }
  }, [searchParams, navigate, login]);

  return <div>Completing authentication...</div>;
};

export default AuthCallback;
```

## Option 2: Enterprise SSO (SAML)

### Step 1: Install SAML Library

```bash
npm install passport-saml
npm install --save-dev @types/passport-saml
```

### Step 2: Configure SAML Strategy

```javascript
const SamlStrategy = require('passport-saml').Strategy;

passport.use(new SamlStrategy({
    entryPoint: process.env.SAML_ENTRY_POINT,
    issuer: process.env.SAML_ISSUER,
    callbackUrl: process.env.SAML_CALLBACK_URL,
    cert: process.env.SAML_CERT,
    identifierFormat: null
  },
  async (profile, done) => {
    try {
      let user = await User.findOne({ email: profile.email });

      if (!user) {
        user = await User.create({
          email: profile.email,
          username: profile.displayName,
          emailVerified: true,
          oauthProvider: 'saml'
        });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));
```

## Security Considerations

### 1. State Parameter (CSRF Protection)

```javascript
router.get('/github',
  (req, res, next) => {
    const state = crypto.randomBytes(16).toString('hex');
    req.session.oauthState = state;
    next();
  },
  passport.authenticate('github', {
    state: req.session.oauthState
  })
);
```

### 2. Token Storage

- Store tokens securely in httpOnly cookies
- Never expose tokens in URLs (except during OAuth flow)
- Implement token rotation

### 3. Scope Management

Request minimal scopes:
```javascript
scope: ['user:email'] // Only request necessary permissions
```

## Testing OAuth Flow

### Manual Testing

1. Start backend: `npm run dev`
2. Navigate to: `http://localhost:3002/api/auth/github`
3. Authorize application
4. Verify callback and token generation

### Automated Testing

```javascript
describe('OAuth Authentication', () => {
  test('should redirect to GitHub OAuth', async () => {
    const res = await request(app).get('/api/auth/github');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('github.com');
  });

  test('should handle OAuth callback', async () => {
    // Mock GitHub OAuth response
    // Test callback endpoint
  });
});
```

## Production Deployment

### 1. Update Callback URLs

Update OAuth app settings with production URLs:
- `https://flowforge.app/api/auth/github/callback`

### 2. Environment Variables

```env
GITHUB_CLIENT_ID=prod_client_id
GITHUB_CLIENT_SECRET=prod_client_secret
GITHUB_CALLBACK_URL=https://flowforge.app/api/auth/github/callback
```

### 3. HTTPS Required

OAuth requires HTTPS in production:
- Use Let's Encrypt for SSL
- Configure reverse proxy (Nginx/Caddy)

## Troubleshooting

### Common Issues

1. **Redirect URI Mismatch**
   - Verify callback URL matches OAuth app settings
   - Check for trailing slashes

2. **Invalid Client**
   - Verify client ID and secret
   - Check environment variables are loaded

3. **Scope Issues**
   - Ensure requested scopes are allowed
   - Check user consent

## Additional Providers

### Google OAuth

```javascript
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    // Similar to GitHub strategy
  }
));
```

### Microsoft OAuth

```javascript
const MicrosoftStrategy = require('passport-microsoft').Strategy;

passport.use(new MicrosoftStrategy({
    clientID: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    callbackURL: process.env.MICROSOFT_CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    // Similar to GitHub strategy
  }
));
```

## References

- [OAuth 2.0 Specification](https://oauth.net/2/)
- [Passport.js Documentation](http://www.passportjs.org/)
- [GitHub OAuth Apps](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [SAML 2.0](http://docs.oasis-open.org/security/saml/)
