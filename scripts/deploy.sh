#!/bin/bash

# Production Deployment Script for FlowForge
# This script automates the deployment process with safety checks

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
SKIP_TESTS=${SKIP_TESTS:-false}
SKIP_BACKUP=${SKIP_BACKUP:-false}

echo -e "${BLUE}🚀 FlowForge Deployment Script${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo "Environment: $ENVIRONMENT"
echo "Skip Tests: $SKIP_TESTS"
echo "Skip Backup: $SKIP_BACKUP"
echo ""

# Function to print success message
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print error message
error() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

# Function to print warning message
warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Function to print info message
info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if required environment variables are set
check_environment() {
    info "Checking environment variables..."

    if [ ! -f "backend/.env" ]; then
        error "backend/.env file not found"
    fi

    if [ ! -f "frontend/.env.production" ]; then
        warn "frontend/.env.production not found - using default configuration"
    fi

    success "Environment variables configured"
}

# Run security audit
run_security_audit() {
    info "Running security audit..."

    if [ -f "scripts/security-audit.sh" ]; then
        bash scripts/security-audit.sh || {
            warn "Security audit found issues - review before deploying"
            read -p "Continue anyway? (y/N) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                error "Deployment cancelled"
            fi
        }
    else
        warn "Security audit script not found - skipping"
    fi

    success "Security audit completed"
}

# Run tests
run_tests() {
    if [ "$SKIP_TESTS" = "true" ]; then
        warn "Skipping tests (SKIP_TESTS=true)"
        return
    fi

    info "Running tests..."

    # Backend tests
    info "Running backend tests..."
    cd backend
    npm test || error "Backend tests failed"
    cd ..
    success "Backend tests passed"

    # Frontend tests
    info "Running frontend tests..."
    cd frontend
    npm test -- --run || error "Frontend tests failed"
    cd ..
    success "Frontend tests passed"
}

# Create database backup
create_backup() {
    if [ "$SKIP_BACKUP" = "true" ]; then
        warn "Skipping backup (SKIP_BACKUP=true)"
        return
    fi

    info "Creating database backup..."

    if [ -f "scripts/backup.sh" ]; then
        bash scripts/backup.sh || warn "Backup failed - continuing anyway"
        success "Database backup created"
    else
        warn "Backup script not found - skipping backup"
    fi
}

# Build frontend
build_frontend() {
    info "Building frontend..."

    cd frontend
    npm ci --production=false || error "Frontend dependency installation failed"
    npm run build || error "Frontend build failed"
    cd ..

    success "Frontend built successfully"
}

# Build backend
build_backend() {
    info "Preparing backend..."

    cd backend
    npm ci --production || error "Backend dependency installation failed"
    cd ..

    success "Backend prepared successfully"
}

# Build Docker images
build_docker() {
    info "Building Docker images..."

    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        warn "Docker not found - skipping Docker build"
        return
    fi

    # Build backend
    info "Building backend Docker image..."
    docker build -f backend/Dockerfile.prod -t flowforge-backend:latest ./backend || error "Backend Docker build failed"
    success "Backend Docker image built"

    # Build frontend
    info "Building frontend Docker image..."
    docker build -f frontend/Dockerfile.prod -t flowforge-frontend:latest ./frontend || error "Frontend Docker build failed"
    success "Frontend Docker image built"
}

# Deploy with Docker Compose
deploy_docker_compose() {
    info "Deploying with Docker Compose..."

    if [ ! -f "docker-compose.prod.yml" ]; then
        warn "docker-compose.prod.yml not found - skipping Docker Compose deployment"
        return
    fi

    docker-compose -f docker-compose.prod.yml down || warn "Failed to stop existing containers"
    docker-compose -f docker-compose.prod.yml up -d || error "Docker Compose deployment failed"

    success "Deployed with Docker Compose"
}

# Health check
health_check() {
    info "Running health checks..."

    local backend_url=${BACKEND_URL:-http://localhost:3002}
    local max_attempts=30
    local attempt=0

    info "Checking backend health at $backend_url/api/health..."

    while [ $attempt -lt $max_attempts ]; do
        if curl -sf "$backend_url/api/health" > /dev/null 2>&1; then
            success "Backend is healthy"
            return 0
        fi

        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done

    echo ""
    error "Backend health check failed after $max_attempts attempts"
}

# Tag release
tag_release() {
    info "Tagging release..."

    local version=$(grep '"version"' backend/package.json | head -1 | awk -F: '{ print $2 }' | sed 's/[",]//g' | tr -d '[:space:]')

    if [ -z "$version" ]; then
        warn "Could not determine version - skipping git tag"
        return
    fi

    info "Version: v$version"

    if git rev-parse "v$version" >/dev/null 2>&1; then
        warn "Tag v$version already exists - skipping"
    else
        git tag -a "v$version" -m "Release v$version" || warn "Failed to create git tag"
        success "Created git tag v$version"
    fi
}

# Print deployment summary
print_summary() {
    echo ""
    echo -e "${GREEN}================================${NC}"
    echo -e "${GREEN}✓ Deployment Successful${NC}"
    echo -e "${GREEN}================================${NC}"
    echo ""
    echo "Environment: $ENVIRONMENT"
    echo "Version: $(grep '"version"' backend/package.json | head -1 | awk -F: '{ print $2 }' | sed 's/[",]//g' | tr -d '[:space:]')"
    echo "Deployed: $(date)"
    echo ""
    echo "Next steps:"
    echo "1. Monitor application logs"
    echo "2. Check error tracking (Sentry)"
    echo "3. Verify all features are working"
    echo "4. Monitor server resources"
    echo ""
    echo "Rollback: ./scripts/rollback.sh"
    echo ""
}

# Main deployment flow
main() {
    info "Starting deployment process..."
    echo ""

    # Pre-deployment checks
    check_environment
    run_security_audit
    run_tests
    create_backup

    echo ""
    info "Building application..."

    # Build
    build_frontend
    build_backend
    build_docker

    echo ""
    info "Deploying application..."

    # Deploy
    deploy_docker_compose

    echo ""
    info "Post-deployment checks..."

    # Post-deployment
    health_check
    tag_release

    # Success
    print_summary
}

# Run main function
main
