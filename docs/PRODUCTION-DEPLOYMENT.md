# FlowForge Production Deployment Guide

**Version**: v0.5.0
**Last Updated**: 2024-11-18
**Difficulty**: Intermediate

---

## 🎯 Overview

This guide walks you through deploying FlowForge to production with best practices for security, performance, and reliability.

**Estimated Time**: 30-60 minutes

---

## 📋 Prerequisites

### Required
- Node.js 18+ installed
- MongoDB instance (Atlas recommended)
- Git installed
- Domain name (optional but recommended)
- SSL certificate (Let's Encrypt recommended)

### Recommended
- Redis instance (for caching)
- GitHub account (for OAuth)
- Sentry account (for error tracking)
- Cloud platform account (Railway, Heroku, AWS, or Vercel)

---

## 🚀 Deployment Options

### Option 1: Railway (Recommended for Beginners)
**Pros**: Easy, automatic SSL, MongoDB & Redis included
**Cost**: Free tier available, ~$5-20/month for production

### Option 2: Vercel + Railway
**Pros**: Best performance for frontend, separate scaling
**Cost**: Free tier for frontend, ~$5-15/month for backend

### Option 3: AWS (Advanced)
**Pros**: Full control, enterprise features
**Cost**: Variable, ~$20-50/month minimum

### Option 4: Self-Hosted (Docker)
**Pros**: Complete control, one-time cost
**Cost**: Server costs only

---

## 📦 Quick Start (Railway Deployment)

### Step 1: Prepare Repository

```bash
# Ensure all changes are committed
git add -A
git commit -m "Prepare for production deployment"
git push origin main
```

### Step 2: Set Up MongoDB Atlas (Free Tier)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create account and free cluster
3. Create database user
4. Whitelist IP: `0.0.0.0/0` (allow all)
5. Get connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/flowforge
   ```

### Step 3: Deploy Backend to Railway

1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Select FlowForge repository
4. Configure:
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`

5. Add Environment Variables:
   ```env
   NODE_ENV=production
   PORT=3002

   # MongoDB
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/flowforge

   # JWT Secrets (generate with: openssl rand -base64 32)
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_REFRESH_SECRET=your_super_secret_refresh_key_here

   # OpenAI
   OPENAI_API_KEY=sk-your-openai-api-key

   # GitHub
   GITHUB_TOKEN=ghp_your_github_token

   # Frontend URL (will get from Vercel in next step)
   FRONTEND_URL=https://your-app.vercel.app

   # Optional: Redis
   REDIS_ENABLED=false  # Set to true if using Redis

   # Optional: OAuth
   GITHUB_CLIENT_ID=
   GITHUB_CLIENT_SECRET=
   GITHUB_CALLBACK_URL=https://your-backend.railway.app/api/auth/github/callback
   ```

6. Deploy and note the URL: `https://your-backend.railway.app`

### Step 4: Deploy Frontend to Vercel

1. Go to https://vercel.com
2. Import FlowForge from GitHub
3. Configure:
   - Framework Preset: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. Add Environment Variables:
   ```env
   VITE_API_URL=https://your-backend.railway.app
   VITE_APP_NAME=FlowForge
   ```

5. Deploy and note URL: `https://your-app.vercel.app`

6. Go back to Railway and update `FRONTEND_URL` with Vercel URL

### Step 5: Verify Deployment

1. Visit your Vercel URL
2. Test registration/login
3. Test workflow creation
4. Test AI assistant
5. Check browser console for errors

---

## 🔧 Advanced Configuration

### Enable Redis Caching

**Railway Redis**:
1. In Railway project, click "New" → "Database" → "Redis"
2. Copy connection URL
3. Update backend environment:
   ```env
   REDIS_ENABLED=true
   REDIS_HOST=containers-us-west-xxx.railway.app
   REDIS_PORT=6379
   REDIS_PASSWORD=your_redis_password
   ```

**Alternative: Upstash (Serverless Redis)**:
1. Go to https://upstash.com
2. Create Redis database
3. Copy connection details
4. Update environment variables

### Enable GitHub OAuth

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in:
   - Application name: FlowForge
   - Homepage URL: `https://your-app.vercel.app`
   - Authorization callback URL: `https://your-backend.railway.app/api/auth/github/callback`
4. Copy Client ID and Client Secret
5. Update backend environment:
   ```env
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   GITHUB_CALLBACK_URL=https://your-backend.railway.app/api/auth/github/callback
   ```

### Enable Error Monitoring (Sentry)

1. Go to https://sentry.io
2. Create new project (React + Node.js)
3. Copy DSN
4. Update frontend environment:
   ```env
   VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
   ```
5. Uncomment Sentry initialization in `frontend/src/services/monitoring.ts`
6. Rebuild and redeploy

---

## 🐳 Docker Deployment (Self-Hosted)

### Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    volumes:
      - mongo_data:/data/db
    networks:
      - flowforge

  redis:
    image: redis:alpine
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - flowforge

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    restart: always
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://admin:${MONGO_PASSWORD}@mongodb:27017/flowforge?authSource=admin
      REDIS_HOST: redis
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      GITHUB_TOKEN: ${GITHUB_TOKEN}
      FRONTEND_URL: https://${DOMAIN}
    depends_on:
      - mongodb
      - redis
    networks:
      - flowforge
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.backend.rule=Host(`${DOMAIN}`) && PathPrefix(`/api`)"
      - "traefik.http.routers.backend.tls.certresolver=letsencrypt"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    restart: always
    environment:
      VITE_API_URL: https://${DOMAIN}
    networks:
      - flowforge
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`${DOMAIN}`)"
      - "traefik.http.routers.frontend.tls.certresolver=letsencrypt"

  traefik:
    image: traefik:v2.10
    restart: always
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.email=${ACME_EMAIL}"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - letsencrypt:/letsencrypt
    networks:
      - flowforge

volumes:
  mongo_data:
  redis_data:
  letsencrypt:

networks:
  flowforge:
    driver: bridge
```

### Deploy with Docker

```bash
# Create .env.prod file
cat > .env.prod << EOF
DOMAIN=your-domain.com
ACME_EMAIL=your-email@domain.com
MONGO_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
OPENAI_API_KEY=sk-your-key
GITHUB_TOKEN=ghp-your-token
EOF

# Deploy
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Check health
curl https://your-domain.com/api/health
```

---

## 🔒 Security Checklist

### Essential
- [ ] Environment variables secured (not in git)
- [ ] HTTPS enabled (SSL certificate)
- [ ] JWT secrets generated (min 32 characters)
- [ ] MongoDB authentication enabled
- [ ] Redis password set
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Helmet.js configured

### Recommended
- [ ] GitHub OAuth configured
- [ ] Error tracking (Sentry) enabled
- [ ] Database backups automated
- [ ] Firewall rules configured
- [ ] DDoS protection (Cloudflare)
- [ ] Security headers validated
- [ ] Dependencies updated (npm audit)

### Advanced
- [ ] WAF (Web Application Firewall) configured
- [ ] Penetration testing completed
- [ ] GDPR compliance reviewed
- [ ] Privacy policy added
- [ ] Terms of service added

---

## 📊 Monitoring Setup

### Health Checks

Add to your monitoring:
- Backend: `https://your-backend/api/health`
- Database: Check connection in health endpoint
- Redis: Check connection in health endpoint

### Uptime Monitoring (Free Options)
- **UptimeRobot**: https://uptimerobot.com
- **Better Uptime**: https://betteruptime.com
- **Pingdom**: https://pingdom.com

### Error Tracking
- **Sentry**: Frontend and backend errors
- **LogRocket**: Session replay (optional)

### Performance Monitoring
- **Google Analytics**: User behavior
- **Plausible**: Privacy-friendly analytics
- **PostHog**: Product analytics

---

## 🔄 CI/CD Setup (GitHub Actions)

Already configured in `.github/workflows/ci.yml`!

To enable:
1. Push to main branch
2. GitHub Actions will automatically:
   - Run tests
   - Build application
   - Run security checks
   - Deploy (if configured)

---

## 🚨 Troubleshooting

### Backend Won't Start
```bash
# Check logs
docker-compose logs backend

# Common issues:
# 1. MongoDB connection - verify MONGODB_URI
# 2. Missing env vars - check all required variables
# 3. Port conflicts - ensure port 3002 is available
```

### Frontend Can't Connect
```bash
# Verify API URL
echo $VITE_API_URL

# Test backend directly
curl https://your-backend.railway.app/api/health

# Check CORS configuration
# Ensure FRONTEND_URL in backend matches actual frontend URL
```

### OAuth Not Working
```bash
# Verify callback URL matches exactly
# GitHub: Settings → Developer settings → OAuth Apps
# Check: Authorization callback URL

# Test OAuth status
curl https://your-backend.railway.app/api/auth/status
```

---

## 📈 Performance Optimization

### Frontend
- [x] Code splitting (implemented)
- [x] Lazy loading (implemented)
- [ ] CDN for static assets (optional)
- [ ] Image optimization (if adding images)
- [ ] Service worker (optional PWA)

### Backend
- [x] Redis caching (optional but recommended)
- [x] Database indexes (implemented)
- [ ] CDN for API responses (optional)
- [ ] Load balancing (for high traffic)
- [ ] Database read replicas (advanced)

---

## 💰 Cost Estimation

### Minimal Setup (Free Tier)
- Vercel: Free
- Railway: $5/month
- MongoDB Atlas: Free (512MB)
- **Total: ~$5/month**

### Recommended Setup
- Vercel: Free
- Railway: $20/month (backend + Redis)
- MongoDB Atlas: Free or $9/month (2GB)
- Sentry: Free (10k events)
- **Total: ~$20-30/month**

### Production Setup
- Vercel Pro: $20/month
- Railway: $50/month
- MongoDB Atlas: $57/month (10GB dedicated)
- Redis Cloud: $7/month
- Sentry: $26/month
- **Total: ~$160/month**

---

## 📚 Post-Deployment

### 1. Seed Database
```bash
# SSH into backend or use Railway CLI
railway run npm run seed
```

### 2. Update GitHub Actions Library
```bash
railway run npm run update-actions
```

### 3. Test All Features
- [ ] User registration
- [ ] User login
- [ ] OAuth login (if enabled)
- [ ] Workflow creation
- [ ] AI generation
- [ ] YAML export
- [ ] Template loading
- [ ] Dark mode
- [ ] Mobile responsive

### 4. Set Up Monitoring
- Add health checks to UptimeRobot
- Configure Sentry alerts
- Set up database backups
- Enable error notifications

---

## 🎉 Success!

Your FlowForge instance is now live!

**Next Steps**:
1. Share with users
2. Monitor error rates
3. Gather feedback
4. Plan v0.6.0 features

**Support**: Open GitHub issue if you encounter problems

---

## 🔗 Quick Links

- **Documentation**: `/docs`
- **Health Check**: `https://your-backend/api/health`
- **OAuth Status**: `https://your-backend/api/auth/status`
- **GitHub Repo**: https://github.com/your-username/FlowForge

---

**Deployment Guide Version**: 1.0.0
**Compatible with**: FlowForge v0.5.0+
