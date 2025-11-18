#!/bin/bash

# Database Restore Script for FlowForge
# Restores MongoDB database from backup

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR=${BACKUP_DIR:-./backups}
BACKUP_FILE=$1
MONGODB_URI=${MONGODB_URI:-}

echo -e "${BLUE}📥 FlowForge Database Restore${NC}"
echo -e "${BLUE}==============================${NC}"
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

# Load environment variables
load_env() {
    if [ -f "backend/.env" ]; then
        export $(cat backend/.env | grep -v '^#' | xargs)
        info "Loaded environment variables from backend/.env"
    else
        error "backend/.env file not found"
    fi
}

# Check if mongorestore is available
check_dependencies() {
    info "Checking dependencies..."

    if ! command -v mongorestore &> /dev/null; then
        error "mongorestore not found - install MongoDB Database Tools: https://www.mongodb.com/try/download/database-tools"
    fi

    success "Dependencies available"
}

# List available backups
list_backups() {
    info "Available backups:"
    echo ""

    if [ -d "$BACKUP_DIR" ]; then
        ls -lht "$BACKUP_DIR"/flowforge_backup_*.tar.gz 2>/dev/null | awk '{print NR". " $9, "(" $5 ", " $6, $7, $8 ")"}'
    else
        warn "No backup directory found"
    fi

    echo ""
}

# Validate backup file
validate_backup() {
    local backup_path="$BACKUP_DIR/$BACKUP_FILE"

    info "Validating backup file..."

    if [ ! -f "$backup_path" ]; then
        error "Backup file not found: $backup_path"
    fi

    if ! tar -tzf "$backup_path" > /dev/null 2>&1; then
        error "Backup file is corrupted or invalid"
    fi

    success "Backup file validated"
}

# Confirm restore
confirm_restore() {
    warn "This will REPLACE the current database with the backup"
    warn "All current data will be lost!"
    echo ""

    read -p "Are you sure you want to restore? (yes/NO) " -r
    echo

    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        info "Restore cancelled"
        exit 0
    fi
}

# Create backup of current database before restore
backup_current() {
    info "Creating backup of current database..."

    if [ -f "scripts/backup.sh" ]; then
        bash scripts/backup.sh || warn "Current database backup failed"
        success "Current database backed up"
    else
        warn "Backup script not found - skipping current database backup"
    fi
}

# Extract backup
extract_backup() {
    local backup_path="$BACKUP_DIR/$BACKUP_FILE"
    local extract_dir="$BACKUP_DIR/restore_temp"

    info "Extracting backup..."

    rm -rf "$extract_dir"
    mkdir -p "$extract_dir"

    tar -xzf "$backup_path" -C "$extract_dir" || error "Failed to extract backup"

    success "Backup extracted"

    echo "$extract_dir"
}

# Perform restore
perform_restore() {
    local extract_dir=$1

    info "Starting database restore..."

    if [ -z "$MONGODB_URI" ]; then
        error "MONGODB_URI not set"
    fi

    # Find the backup directory inside extracted files
    local backup_name=$(ls "$extract_dir" | head -1)
    local restore_path="$extract_dir/$backup_name/flowforge"

    if [ ! -d "$restore_path" ]; then
        # Try alternative path
        restore_path="$extract_dir/$backup_name"
    fi

    info "Restoring from: $restore_path"

    mongorestore --uri="$MONGODB_URI" --drop "$restore_path" || error "Restore failed"

    success "Database restored successfully"
}

# Cleanup
cleanup() {
    local extract_dir=$1

    info "Cleaning up temporary files..."

    rm -rf "$extract_dir"

    success "Cleanup completed"
}

# Verify restore
verify_restore() {
    info "Verifying restore..."

    # Check if backend can connect to database
    local backend_url=${BACKEND_URL:-http://localhost:3002}

    if curl -sf "$backend_url/api/health" > /dev/null 2>&1; then
        success "Database connection verified"
    else
        warn "Could not verify database connection - backend may not be running"
    fi
}

# Print summary
print_summary() {
    echo ""
    echo -e "${GREEN}=============================${NC}"
    echo -e "${GREEN}✓ Restore Successful${NC}"
    echo -e "${GREEN}=============================${NC}"
    echo ""
    echo "Restored from: $BACKUP_FILE"
    echo "Completed: $(date)"
    echo ""
    echo "Next steps:"
    echo "1. Restart application services"
    echo "2. Verify data integrity"
    echo "3. Test critical features"
    echo ""
}

# Main restore flow
main() {
    if [ -z "$BACKUP_FILE" ]; then
        list_backups
        read -p "Enter backup filename to restore: " BACKUP_FILE

        if [ -z "$BACKUP_FILE" ]; then
            error "No backup file specified"
        fi
    fi

    load_env
    check_dependencies
    validate_backup
    confirm_restore
    backup_current

    local extract_dir=$(extract_backup)

    perform_restore "$extract_dir"
    cleanup "$extract_dir"
    verify_restore
    print_summary
}

# Run main function
main
