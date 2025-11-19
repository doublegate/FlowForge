#!/bin/bash

# Security Audit Script for FlowForge
# Checks for common security issues and vulnerabilities

set -e

echo "🔒 FlowForge Security Audit"
echo "=========================="
echo ""

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

ISSUES=0
WARNINGS=0

# Function to check and report
check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $1"
    else
        echo -e "${RED}✗${NC} $1"
        ((ISSUES++))
    fi
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

info() {
    echo -e "${GREEN}ℹ${NC} $1"
}

# 1. Check for dependency vulnerabilities
echo "1. Checking for vulnerable dependencies..."
echo ""

if [ -d "backend" ]; then
    cd backend
    echo "Backend:"
    npm audit --production || warn "Backend has vulnerable dependencies - run 'npm audit fix'"
    cd ..
fi

if [ -d "frontend" ]; then
    cd frontend
    echo "Frontend:"
    npm audit --production || warn "Frontend has vulnerable dependencies - run 'npm audit fix'"
    cd ..
fi

echo ""

# 2. Check environment files
echo "2. Checking environment configuration..."
echo ""

if [ -f ".env" ]; then
    warn ".env file found in root - ensure it's in .gitignore"
fi

if [ -f "backend/.env" ]; then
    info "Backend .env file found"

    # Check for weak secrets
    if grep -q "your_secret_key" backend/.env 2>/dev/null; then
        warn "Default JWT secret detected - change to a strong random value"
    fi

    if grep -q "changeme" backend/.env 2>/dev/null; then
        warn "Default passwords detected - change all 'changeme' values"
    fi
fi

echo ""

# 3. Check for exposed secrets in code
echo "3. Scanning for exposed secrets in code..."
echo ""

# Check for common secret patterns
if grep -r "password.*=.*['\"].*['\"]" --include="*.js" --include="*.ts" backend/ frontend/ 2>/dev/null | grep -v "Password" | grep -v "password:" | head -5; then
    warn "Possible hardcoded passwords found"
fi

if grep -r "api[_-]key.*=.*['\"].*['\"]" --include="*.js" --include="*.ts" backend/ frontend/ 2>/dev/null | head -5; then
    warn "Possible hardcoded API keys found"
fi

if grep -r "mongodb://.*:.*@" --include="*.js" --include="*.ts" backend/ frontend/ 2>/dev/null | head -5; then
    warn "MongoDB connection string with credentials in code"
fi

echo ""

# 4. Check HTTPS enforcement
echo "4. Checking security headers and HTTPS..."
echo ""

if grep -q "helmet" backend/index.js 2>/dev/null; then
    info "Helmet.js security headers configured"
else
    warn "Helmet.js not found - security headers may not be configured"
fi

echo ""

# 5. Check authentication
echo "5. Checking authentication configuration..."
echo ""

if grep -q "bcrypt" backend/package.json 2>/dev/null; then
    info "bcrypt password hashing configured"
else
    warn "bcrypt not found - passwords may not be hashed properly"
fi

if grep -q "jsonwebtoken" backend/package.json 2>/dev/null; then
    info "JWT authentication configured"
else
    warn "JWT not found - authentication may not be secure"
fi

echo ""

# 6. Check for rate limiting
echo "6. Checking rate limiting..."
echo ""

if grep -q "express-rate-limit" backend/package.json 2>/dev/null; then
    info "Rate limiting configured"
else
    warn "Rate limiting not found - API may be vulnerable to brute force"
fi

echo ""

# 7. Check CORS configuration
echo "7. Checking CORS configuration..."
echo ""

if grep -q "cors" backend/index.js 2>/dev/null; then
    info "CORS configured"
    if grep -q "origin:.*\*" backend/index.js 2>/dev/null; then
        warn "CORS allows all origins (*) - restrict in production"
    fi
else
    warn "CORS not configured - may have cross-origin issues"
fi

echo ""

# 8. Check for sensitive files
echo "8. Checking for sensitive files..."
echo ""

SENSITIVE_FILES=(".env" "*.pem" "*.key" "*.p12" "*.pfx" "credentials.json")

for pattern in "${SENSITIVE_FILES[@]}"; do
    if find . -name "$pattern" -not -path "*/node_modules/*" 2>/dev/null | grep -q .; then
        warn "Sensitive files matching '$pattern' found - ensure they're in .gitignore"
    fi
done

# Check gitignore
if [ -f ".gitignore" ]; then
    if grep -q ".env" .gitignore 2>/dev/null; then
        info ".env files are gitignored"
    else
        warn ".env not in .gitignore - secrets may be committed"
    fi
fi

echo ""

# 9. Check Docker security
echo "9. Checking Docker configuration..."
echo ""

if [ -f "Dockerfile" ] || [ -f "docker-compose.yml" ]; then
    if grep -q "USER" Dockerfile* backend/Dockerfile* frontend/Dockerfile* 2>/dev/null; then
        info "Docker runs as non-root user"
    else
        warn "Docker may run as root user - security risk"
    fi
fi

echo ""

# 10. Check for console.log in production code
echo "10. Checking for debug code..."
echo ""

if find backend -name "*.js" -not -path "*/node_modules/*" -not -path "*/tests/*" -exec grep -l "console.log" {} \; 2>/dev/null | head -5 | grep -q .; then
    warn "console.log statements found in backend code"
fi

echo ""

# Summary
echo "================================"
echo "Security Audit Summary"
echo "================================"
echo ""
echo -e "Issues: ${RED}$ISSUES${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $ISSUES -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ No security issues found!${NC}"
    exit 0
elif [ $ISSUES -eq 0 ]; then
    echo -e "${YELLOW}⚠ Security warnings found - review and fix${NC}"
    exit 0
else
    echo -e "${RED}✗ Security issues found - must fix before production${NC}"
    exit 1
fi
