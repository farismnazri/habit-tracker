#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-habit-tracker}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$HOME/habit-tracker-secrets/.env}"

log() { printf "\n==> %s\n" "$*"; }

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: Env file not found at: $ENV_FILE"
  exit 1
fi

log "Loading env from $ENV_FILE"
set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Error: DATABASE_URL is not set (check $ENV_FILE)"
  exit 1
fi

if [[ "$DATABASE_URL" != file:* ]]; then
  echo "Error: Expected SQLite DATABASE_URL starting with file: (got: $DATABASE_URL)"
  exit 1
fi

DB_PATH="${DATABASE_URL#file:}"
if [[ "$DB_PATH" != /* ]]; then
  DB_PATH="$(cd "$REPO_DIR" && realpath -m "$DB_PATH")"
fi

DB_DIR="$(dirname "$DB_PATH")"
BACKUP_DIR="${BACKUP_DIR:-$DB_DIR/backups}"

log "Database path: $DB_PATH"
mkdir -p "$DB_DIR" "$BACKUP_DIR"

if [[ -f "$DB_PATH" ]]; then
  TS="$(date +%Y%m%d-%H%M%S)"
  BACKUP_FILE="$BACKUP_DIR/db-$TS.sqlite"
  log "Backing up database -> $BACKUP_FILE"
  cp -a "$DB_PATH" "$BACKUP_FILE"
else
  log "Warning: DB file not found yet at $DB_PATH (continuing without backup)"
fi

log "Updating repo (git pull)"
cd "$REPO_DIR"
git pull --ff-only

log "Installing dependencies (npm ci)"
npm ci --include=dev

log "Prisma generate"
npx prisma generate

log "Prisma migrate deploy"
npx prisma migrate deploy

log "Building app"
npm run build

log "Restarting service: $SERVICE_NAME"
sudo systemctl restart "$SERVICE_NAME"

log "Verifying health"
curl -fsS "http://127.0.0.1:3000/api/healthz" | cat
echo

log "Verifying manifest"
curl -fsSI "http://127.0.0.1:3000/manifest.webmanifest" | head -n 20

log "Done"
