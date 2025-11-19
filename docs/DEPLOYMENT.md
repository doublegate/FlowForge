# FlowForge Deployment Guide

**Last Updated**: 2025-11-19
**Version**: 0.7.0

## Current Status

FlowForge v0.7.0 is production-ready with complete collaboration platform features including real-time editing, GitHub integration, OAuth authentication (5 providers), email notifications, and advanced search capabilities.

## Prerequisites

**Required:**
- Docker and Docker Compose (recommended)
- Node.js 18+ (for local development)
- MongoDB 4.4+ (if not using Docker)
- GitHub Personal Access Token (with repo scope)
- OpenAI API Key (for AI features)
- actionlint (for YAML validation)

**Optional (but recommended for full features):**
- OAuth credentials for one or more providers (GitHub, Google, Microsoft, GitLab, Bitbucket)
- SMTP server access (Gmail, Outlook, or custom SMTP) for email notifications

## Environment Configuration

Create a `.env` file in the root directory (copy from `.env.example`):

```bash
# Backend Configuration
NODE_ENV=production
PORT=3002

# Database
MONGODB_URI=mongodb://admin:flowforge123@localhost:27017/flowforge?authSource=admin

# External APIs
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx

# Frontend URL (for CORS and WebSocket)
FRONTEND_URL=https://flowforge.example.com

# JWT Authentication
JWT_SECRET=your-very-secure-random-jwt-secret-here-min-32-chars
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# OAuth Providers (Optional - Configure at least one)
# GitHub OAuth (Primary)
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
GITHUB_CALLBACK_URL=https://flowforge.example.com/api/auth/github/callback

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://flowforge.example.com/api/auth/google/callback

# Microsoft OAuth
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
MICROSOFT_CALLBACK_URL=https://flowforge.example.com/api/auth/microsoft/callback

# GitLab OAuth
GITLAB_CLIENT_ID=your_gitlab_client_id
GITLAB_CLIENT_SECRET=your_gitlab_client_secret
GITLAB_CALLBACK_URL=https://flowforge.example.com/api/auth/gitlab/callback
GITLAB_BASE_URL=https://gitlab.com  # Or your self-hosted GitLab URL

# Bitbucket OAuth
BITBUCKET_CLIENT_ID=your_bitbucket_client_id
BITBUCKET_CLIENT_SECRET=your_bitbucket_client_secret
BITBUCKET_CALLBACK_URL=https://flowforge.example.com/api/auth/bitbucket/callback

# Email Notifications (Optional - SMTP Configuration)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false  # true for 465, false for other ports
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password  # Use app-specific password for Gmail
SMTP_FROM_NAME=FlowForge
SMTP_FROM_EMAIL=noreply@flowforge.dev

# WebSocket Configuration
WEBSOCKET_PING_TIMEOUT=60000
WEBSOCKET_PING_INTERVAL=25000
```

### OAuth Provider Setup

#### GitHub OAuth Application

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create a new OAuth App
3. Set Authorization callback URL to: `https://yourdomain.com/api/auth/github/callback`
4. Copy Client ID and Client Secret to `.env`

#### Google OAuth Application

1. Go to Google Cloud Console > APIs & Services > Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URI: `https://yourdomain.com/api/auth/google/callback`
4. Copy Client ID and Client Secret to `.env`

#### Microsoft OAuth Application

1. Go to Azure Portal > App registrations
2. Register a new application
3. Add redirect URI: `https://yourdomain.com/api/auth/microsoft/callback`
4. Create client secret in "Certificates & secrets"
5. Copy Application (client) ID and client secret to `.env`

#### GitLab OAuth Application

1. Go to GitLab Settings > Applications
2. Create a new application
3. Set redirect URI: `https://yourdomain.com/api/auth/gitlab/callback`
4. Select scopes: `read_user`
5. Copy Application ID and Secret to `.env`

#### Bitbucket OAuth Application

1. Go to Bitbucket Settings > OAuth consumers
2. Add a consumer
3. Set callback URL: `https://yourdomain.com/api/auth/bitbucket/callback`
4. Select permissions: Account (Read), Email (Read)
5. Copy Key and Secret to `.env`

### SMTP Email Configuration

#### Gmail Setup

1. Enable 2-factor authentication on your Google account
2. Generate an app-specific password: https://myaccount.google.com/apppasswords
3. Use these settings:
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_16_char_app_password
   ```

#### Outlook/Microsoft 365 Setup

```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@outlook.com
SMTP_PASS=your_password
```

#### Custom SMTP Server

```bash
SMTP_HOST=your_smtp_server.com
SMTP_PORT=587  # or 465 for SSL
SMTP_SECURE=false  # true for SSL
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
```

## Desktop Distribution

### Flatpak Package (Linux)

FlowForge now includes complete desktop distribution via Flatpak:

```bash
# Build distributable package
./scripts/build-flowforge.sh

# Build and install Flatpak
./scripts/build-flatpak.sh --install --run
```

**Features:**

- Self-contained deployment with embedded MongoDB
- Desktop integration with `.yml` and `.yaml` file associations
- Native desktop application experience via Electron
- Unified build system for easy distribution
- No external dependencies required

See [Flatpak Build Guide](FLATPAK-BUILD.md) for detailed instructions.

## Web Deployment Options

### Option 1: Docker Compose (Recommended)

1. **Clone the repository**

   ```bash
   git clone https://github.com/doublegate/FlowForge.git
   cd FlowForge
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Build and start services**

   ```bash
   docker-compose up -d
   ```

4. **Seed the database**

   ```bash
   docker-compose exec backend npm run seed
   ```

5. **Access the application**
   - Frontend: <http://localhost>
   - API: <http://localhost:3002/api/health>

### Option 2: Manual Deployment

#### Backend Deployment

1. **Install dependencies**

   ```bash
   cd backend
   npm install
   ```

2. **Install actionlint**

   ```bash
   # Linux
   curl -L https://github.com/rhysd/actionlint/releases/latest/download/actionlint_linux_amd64.tar.gz | tar xz
   sudo mv actionlint /usr/local/bin/

   # macOS
   brew install actionlint
   ```

3. **Start MongoDB**

   ```bash
   mongod --dbpath /path/to/data
   ```

4. **Seed database**

   ```bash
   npm run seed
   ```

5. **Start backend**

   ```bash
   npm start
   ```

#### Frontend Deployment

1. **Install dependencies**

   ```bash
   cd frontend
   npm install
   ```

2. **Build for production**

   ```bash
   npm run build
   ```

3. **Serve with Nginx**

   ```nginx
   server {
       listen 80;
       server_name flowforge.example.com;
       root /path/to/frontend/dist;

       location / {
           try_files $uri $uri/ /index.html;
       }

       location /api {
           proxy_pass http://localhost:3002;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

### Option 3: Cloud Deployment

#### AWS EC2 Deployment

1. **Launch EC2 instance**
   - Ubuntu 22.04 LTS
   - t3.medium or larger
   - Security groups: 80, 443, 3002, 27017

2. **Install Docker**

   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   sudo usermod -aG docker $USER
   ```

3. **Deploy with Docker Compose**

   ```bash
   git clone https://github.com/doublegate/FlowForge.git
   cd FlowForge
   # Configure .env
   docker-compose up -d
   ```

#### Heroku Deployment

1. **Create Heroku apps**

   ```bash
   heroku create flowforge-api
   heroku create flowforge-web
   ```

2. **Add MongoDB addon**

   ```bash
   heroku addons:create mongolab:shared-single-ssd -a flowforge-api
   ```

3. **Set environment variables**

   ```bash
   heroku config:set GITHUB_TOKEN=xxx -a flowforge-api
   heroku config:set OPENAI_API_KEY=xxx -a flowforge-api
   ```

4. **Deploy**

   ```bash
   # Backend
   git subtree push --prefix backend heroku-api main

   # Frontend
   git subtree push --prefix frontend heroku-web main
   ```

#### Kubernetes Deployment

1. **Create namespace**

   ```yaml
   apiVersion: v1
   kind: Namespace
   metadata:
     name: flowforge
   ```

2. **Deploy MongoDB**

   ```yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: mongodb
     namespace: flowforge
   spec:
     replicas: 1
     selector:
       matchLabels:
         app: mongodb
     template:
       metadata:
         labels:
           app: mongodb
       spec:
         containers:
         - name: mongodb
           image: mongo:7.0
           ports:
           - containerPort: 27017
           env:
           - name: MONGO_INITDB_ROOT_USERNAME
             value: admin
           - name: MONGO_INITDB_ROOT_PASSWORD
             valueFrom:
               secretKeyRef:
                 name: mongodb-secret
                 key: password
   ```

3. **Deploy Backend**

   ```yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: backend
     namespace: flowforge
   spec:
     replicas: 2
     selector:
       matchLabels:
         app: backend
     template:
       metadata:
         labels:
           app: backend
       spec:
         containers:
         - name: backend
           image: flowforge/backend:latest
           ports:
           - containerPort: 3002
           env:
           - name: MONGODB_URI
             valueFrom:
               secretKeyRef:
                 name: backend-secret
                 key: mongodb-uri
           - name: GITHUB_TOKEN
             valueFrom:
               secretKeyRef:
                 name: backend-secret
                 key: github-token
   ```

## Production Considerations

### Security

1. **SSL/TLS Configuration**

   ```bash
   # Use Let's Encrypt with Certbot
   sudo certbot --nginx -d flowforge.example.com
   ```

2. **Environment Variables**
   - Never commit `.env` files
   - Use secrets management (AWS Secrets Manager, HashiCorp Vault)
   - Rotate API keys regularly
   - Minimum required scopes for GitHub token: `repo`, `read:org`

3. **Network Security**
   - Configure firewall rules
   - Use VPC/private networks for database
   - API rate limiting configured (100 req/15min general, 20 req/15min for AI)
   - CORS properly configured for production domain

### Performance

1. **Caching**
   - LRU cache implemented for GitHub API responses (6-hour TTL)
   - Enable Redis for session storage (Phase 3)
   - Configure CDN for static assets
   - MongoDB indexes optimized for common queries

2. **Scaling**
   - Horizontal scaling for API servers
   - MongoDB replica sets for high availability
   - Load balancer with health checks
   - Action discovery runs in batches to respect rate limits

3. **Monitoring**
   - Application metrics (Prometheus)
   - Log aggregation (ELK stack)
   - Uptime monitoring (UptimeRobot)
   - Performance metrics: <200ms API response, <2s AI generation

### Backup & Recovery

1. **Database Backup**

   ```bash
   # Automated daily backups
   mongodump --uri=$MONGODB_URI --out=/backups/$(date +%Y%m%d)
   ```

2. **Backup Storage**
   - S3 bucket for backup storage
   - Retention policy (30 days)
   - Test restore procedures

### CI/CD Pipeline

1. **GitHub Actions Workflow**

   ```yaml
   name: Deploy
   on:
     push:
       branches: [main]
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - name: Build and push Docker images
           run: |
             docker build -t flowforge/backend ./backend
             docker build -t flowforge/frontend ./frontend
             docker push flowforge/backend
             docker push flowforge/frontend
         - name: Deploy to production
           run: |
             ssh deploy@server 'cd /app && docker-compose pull && docker-compose up -d'
   ```

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**

   ```bash
   # Check MongoDB status
   docker-compose logs mongodb

   # Verify connection string
   mongo $MONGODB_URI --eval "db.stats()"
   ```

2. **Rate Limiting Errors**

   ```bash
   # Increase rate limits in production
   # backend/index.js
   const apiLimiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 1000 // Increase for production
   });
   ```

3. **CORS Issues**

   ```bash
   # Verify FRONTEND_URL in .env matches actual domain
   # Check browser console for CORS errors
   ```

### Health Checks

1. **API Health**

   ```bash
   curl https://api.flowforge.example.com/api/health
   ```

2. **Database Health**

   ```bash
   docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"
   ```

3. **Container Status**

   ```bash
   docker-compose ps
   docker-compose logs -f
   ```
