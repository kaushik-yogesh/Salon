#!/bin/bash
# SalonOS Automated Database Backup Script
# This script should be run via a cron job on the host machine.
# Example cron (runs daily at 2 AM): 0 2 * * * /path/to/backup.sh

set -e

# Configuration
BACKUP_DIR="./backups"
DB_CONTAINER="salon_db"
DB_USER="user"
DB_NAME="salon_os"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/salonos_$DATE.sql.gz"

echo "[$(date)] Starting SalonOS database backup..."

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Execute pg_dump inside the container and compress it on the host
docker exec -t $DB_CONTAINER pg_dump -U $DB_USER -d $DB_NAME -F p | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "[$(date)] Backup completed successfully: $BACKUP_FILE"
else
  echo "[$(date)] Backup failed!"
  exit 1
fi

# Rotate backups: Keep only the last 7 days
echo "[$(date)] Cleaning up backups older than 7 days..."
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +7 -exec rm {} \;

echo "[$(date)] Cleanup finished."
exit 0
