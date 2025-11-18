#!/bin/bash

# Rollback Script for FlowForge
# Reverts to a previous deployment version

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${RED}⏪ FlowForge Rollback Script${NC}"
echo -e "${RED}============================${NC}"
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

# Check current deployment
check_current_deployment() {
    info "Checking current deployment..."

    local current_version=$(grep '"version"' backend/package.json | head -1 | awk -F: '{ print $2 }' | sed 's/[",]//g' | tr -d '[:space:]')

    echo "Current version: v$current_version"
    echo ""
}

# List available versions
list_versions() {
    info "Available versions to rollback to:"
    echo ""

    git tag -l "v*" | tail -10 | tac

    echo ""
}

# Confirm rollback
confirm_rollback() {
    local target_version=$1

    warn "This will rollback to version $target_version"
    warn "This action should only be performed if there are critical issues"
    echo ""

    read -p "Are you sure you want to rollback? (yes/NO) " -r
    echo

    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        info "Rollback cancelled"
        exit 0
    fi
}

# Create backup before rollback
create_backup() {
    info "Creating backup before rollback..."

    if [ -f "scripts/backup.sh" ]; then
        bash scripts/backup.sh || warn "Backup failed - continuing anyway"
        success "Backup created"
    else
        warn "Backup script not found - skipping backup"
    fi
}

# Stop services
stop_services() {
    info "Stopping services..."

    if [ -f "docker-compose.prod.yml" ]; then
        docker-compose -f docker-compose.prod.yml down || warn "Failed to stop Docker services"
        success "Docker services stopped"
    fi
}

# Checkout version
checkout_version() {
    local target_version=$1

    info "Checking out version $target_version..."

    if ! git rev-parse "$target_version" >/dev/null 2>&1; then
        error "Version $target_version not found"
    fi

    git checkout "$target_version" || error "Failed to checkout version $target_version"

    success "Checked out version $target_version"
}

# Rebuild and redeploy
rebuild_and_redeploy() {
    info "Rebuilding application..."

    # Rebuild frontend
    cd frontend
    npm ci --production=false || error "Frontend dependency installation failed"
    npm run build || error "Frontend build failed"
    cd ..

    # Rebuild backend
    cd backend
    npm ci --production || error "Backend dependency installation failed"
    cd ..

    success "Application rebuilt"

    # Rebuild Docker images if Docker is available
    if command -v docker &> /dev/null; then
        info "Rebuilding Docker images..."

        docker build -f backend/Dockerfile.prod -t flowforge-backend:latest ./backend || warn "Backend Docker build failed"
        docker build -f frontend/Dockerfile.prod -t flowforge-frontend:latest ./frontend || warn "Frontend Docker build failed"

        success "Docker images rebuilt"
    fi
}

# Start services
start_services() {
    info "Starting services..."

    if [ -f "docker-compose.prod.yml" ]; then
        docker-compose -f docker-compose.prod.yml up -d || error "Failed to start Docker services"
        success "Docker services started"
    else
        warn "docker-compose.prod.yml not found - manual service start required"
    fi
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

# Print summary
print_summary() {
    local target_version=$1

    echo ""
    echo -e "${GREEN}=============================${NC}"
    echo -e "${GREEN}✓ Rollback Successful${NC}"
    echo -e "${GREEN}=============================${NC}"
    echo ""
    echo "Rolled back to: $target_version"
    echo "Completed: $(date)"
    echo ""
    echo "Next steps:"
    echo "1. Monitor application logs"
    echo "2. Verify all features are working"
    echo "3. Investigate root cause of issues"
    echo "4. Plan fix and re-deployment"
    echo ""
}

# Main rollback flow
main() {
    check_current_deployment
    list_versions

    # Get target version
    read -p "Enter version to rollback to (e.g., v0.4.0): " target_version

    if [ -z "$target_version" ]; then
        error "No version specified"
    fi

    confirm_rollback "$target_version"
    create_backup
    stop_services
    checkout_version "$target_version"
    rebuild_and_redeploy
    start_services
    health_check
    print_summary "$target_version"
}

# Run main function
main
