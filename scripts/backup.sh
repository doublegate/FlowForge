#!/bin/bash

# Database Backup Script for FlowForge
# Creates timestamped backups of MongoDB database

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR=${BACKUP_DIR:-./backups}
MONGODB_URI=${MONGODB_URI:-}
RETENTION_DAYS=${RETENTION_DAYS:-7}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="flowforge_backup_${TIMESTAMP}"

echo -e "${BLUE}📦 FlowForge Database Backup${NC}"
echo -e "${BLUE}=============================${NC}"
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

# Function to print info message
info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Load environment variables
load_env() {
    if [ -f "backend/.env" ]; then
        export $(cat backend/.env | grep -v '^#' | xargs)
        info "Loaded environment variables from backend/.env"
    else
        error "backend/.env file not found"
    fi
}

# Check if mongodump is available
check_dependencies() {
    info "Checking dependencies..."

    if ! command -v mongodump &> /dev/null; then
        error "mongodump not found - install MongoDB Database Tools: https://www.mongodb.com/try/download/database-tools"
    fi

    success "Dependencies available"
}

# Create backup directory
create_backup_dir() {
    info "Creating backup directory..."

    mkdir -p "$BACKUP_DIR"

    success "Backup directory ready: $BACKUP_DIR"
}

# Perform backup
perform_backup() {
    info "Starting database backup..."

    local backup_path="$BACKUP_DIR/$BACKUP_NAME"

    if [ -z "$MONGODB_URI" ]; then
        error "MONGODB_URI not set"
    fi

    info "Backing up to: $backup_path"

    mongodump --uri="$MONGODB_URI" --out="$backup_path" || error "Backup failed"

    success "Database backup completed"

    # Compress backup
    info "Compressing backup..."
    tar -czf "${backup_path}.tar.gz" -C "$BACKUP_DIR" "$BACKUP_NAME" || error "Compression failed"
    rm -rf "$backup_path"

    success "Backup compressed: ${backup_path}.tar.gz"

    # Get backup size
    local size=$(du -h "${backup_path}.tar.gz" | cut -f1)
    info "Backup size: $size"
}

# Clean old backups
clean_old_backups() {
    info "Cleaning old backups (retention: ${RETENTION_DAYS} days)..."

    local deleted=0

    while IFS= read -r -d '' file; do
        rm -f "$file"
        deleted=$((deleted + 1))
    done < <(find "$BACKUP_DIR" -name "flowforge_backup_*.tar.gz" -type f -mtime +$RETENTION_DAYS -print0)

    if [ $deleted -gt 0 ]; then
        success "Deleted $deleted old backup(s)"
    else
        info "No old backups to delete"
    fi
}

# List backups
list_backups() {
    info "Available backups:"
    echo ""

    ls -lh "$BACKUP_DIR"/flowforge_backup_*.tar.gz 2>/dev/null | awk '{print $9, "(" $5 ")"}'

    echo ""
}

# Verify backup
verify_backup() {
    info "Verifying backup integrity..."

    local backup_path="$BACKUP_DIR/$BACKUP_NAME.tar.gz"

    if tar -tzf "$backup_path" > /dev/null 2>&1; then
        success "Backup integrity verified"
    else
        error "Backup verification failed - file may be corrupted"
    fi
}

# Print summary
print_summary() {
    echo ""
    echo -e "${GREEN}=============================${NC}"
    echo -e "${GREEN}✓ Backup Successful${NC}"
    echo -e "${GREEN}=============================${NC}"
    echo ""
    echo "Backup file: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
    echo "Timestamp: $(date)"
    echo "Retention: $RETENTION_DAYS days"
    echo ""
    echo "To restore: ./scripts/restore.sh $BACKUP_NAME.tar.gz"
    echo ""
}

# Main backup flow
main() {
    load_env
    check_dependencies
    create_backup_dir
    perform_backup
    verify_backup
    clean_old_backups
    list_backups
    print_summary
}

# Run main function
main
