#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_SERVICE="habit-tracker"

health_check() {
  local url="$1"
  echo "Checking health: $url"
  curl --silent --show-error --fail "$url"
  echo
}

cd "$REPO_DIR"

echo "==> Backing up database"
"$SCRIPT_DIR/backup-db.sh"

echo "==> Pulling latest code (fast-forward only)"
git pull --ff-only

echo "==> Installing dependencies"
npm ci

export DATABASE_URL="${DATABASE_URL:-file:/home/pi/habit-tracker-data/db.sqlite}"
echo "==> Running Prisma migrations (forward-only)"
npx prisma migrate deploy

echo "==> Building app"
npm run build

echo "==> Restarting systemd service: $APP_SERVICE"
sudo systemctl restart "$APP_SERVICE"

printf '==> Verifying service status: '
sudo systemctl is-active "$APP_SERVICE"

echo "==> Verifying health endpoint"
if health_check "https://habits.local/api/healthz"; then
  echo "Health check passed via Caddy HTTPS"
else
  echo "HTTPS health check failed; falling back to localhost" >&2
  health_check "http://127.0.0.1:3000/api/healthz"
  echo "Health check passed via localhost"
fi
