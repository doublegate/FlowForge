# FlowForge Deployment Guide

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- MongoDB 4.4+ (if not using Docker)
- GitHub Personal Access Token
- OpenAI API Key

## Environment Configuration

Create a `.env` file in the root directory:

```bash
# Backend Configuration
NODE_ENV=production
PORT=3001

# Database
MONGODB_URI=mongodb://localhost:27017/flowforge

# External APIs
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx

# Frontend URL (for CORS)
FRONTEND_URL=https://flowforge.example.com

# Session Secret (generate a random string)
SESSION_SECRET=your-random-session-secret-here
```

## Deployment Options

### Option 1: Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/flowforge.git
   cd flowforge
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
   - Frontend: http://localhost
   - API: http://localhost:3001/api/health

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
           proxy_pass http://localhost:3001;
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
   - Security groups: 80, 443, 3001, 27017

2. **Install Docker**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   sudo usermod -aG docker $USER
   ```

3. **Deploy with Docker Compose**
   ```bash
   git clone https://github.com/yourusername/flowforge.git
   cd flowforge
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
           - containerPort: 3001
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

3. **Network Security**
   - Configure firewall rules
   - Use VPC/private networks for database
   - Implement API rate limiting

### Performance

1. **Caching**
   - Enable Redis for session storage
   - Configure CDN for static assets
   - Implement database query caching

2. **Scaling**
   - Horizontal scaling for API servers
   - MongoDB replica sets
   - Load balancer configuration

3. **Monitoring**
   - Application metrics (Prometheus)
   - Log aggregation (ELK stack)
   - Uptime monitoring (UptimeRobot)

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