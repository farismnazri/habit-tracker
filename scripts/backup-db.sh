#!/usr/bin/env bash
set -euo pipefail

DB_PATH="/home/pi/habit-tracker-data/db.sqlite"
BACKUP_DIR="/home/pi/habit-tracker-data/backups"

if [[ ! -f "$DB_PATH" ]]; then
  echo "Error: SQLite database file not found at $DB_PATH" >&2
  echo "Refusing to continue because a backup cannot be created." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_path="$BACKUP_DIR/db-${timestamp}.sqlite"

cp -p "$DB_PATH" "$backup_path"

echo "Backup created: $backup_path"
