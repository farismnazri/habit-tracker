# Ops Runbook

## Paths (Pi)
- Repo: `/home/pi/habit-tracker`
- Env file: `/home/pi/habit-tracker-secrets/.env`
- SQLite DB: `/home/pi/habit-tracker-data/db.sqlite`
- Backups: `/home/pi/habit-tracker-data/backups/`

## Install Caddy (Debian/Raspbian)
Run these on the Raspberry Pi:

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg
sudo chmod o+r /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

## Install app service + Caddy config
Assumes the repo is checked out at `/home/pi/habit-tracker`.

```bash
sudo cp /home/pi/habit-tracker/infra/Caddyfile /etc/caddy/Caddyfile
sudo cp /home/pi/habit-tracker/infra/systemd/habit-tracker.service /etc/systemd/system/habit-tracker.service
sudo systemctl daemon-reload
sudo systemctl enable --now caddy
sudo systemctl enable --now habit-tracker
```

Optional verification:

```bash
sudo systemctl status caddy --no-pager
sudo systemctl status habit-tracker --no-pager
curl -sS http://127.0.0.1:3000/api/healthz
curl -sS https://habits.local/api/healthz || true
```

## Prepare directories and env (first-time setup)
```bash
sudo mkdir -p /home/pi/habit-tracker-data/backups
sudo mkdir -p /home/pi/habit-tracker-secrets
sudo chown -R pi:pi /home/pi/habit-tracker-data /home/pi/habit-tracker-secrets
cat > /home/pi/habit-tracker-secrets/.env <<'EOF_ENV'
PORT=3000
NODE_ENV=production
DATABASE_URL=file:/home/pi/habit-tracker-data/db.sqlite
EOF_ENV
```

## Trust Caddy local root CA on iPad (for `https://habits.local`)
After Caddy starts once, export the root CA certificate from the Pi and transfer it to the iPad.

Find/copy the CA cert on the Pi:

```bash
sudo ls -l /var/lib/caddy/.local/share/caddy/pki/authorities/local/
sudo cp /var/lib/caddy/.local/share/caddy/pki/authorities/local/root.crt /home/pi/habit-tracker/caddy-local-root.crt
sudo chown pi:pi /home/pi/habit-tracker/caddy-local-root.crt
```

Transfer `caddy-local-root.crt` to the iPad (AirDrop, Files app, email, or a local web share), then on the iPad:
- Open the certificate file and install the profile.
- Go to `Settings > General > VPN & Device Management` and finish profile install if prompted.
- Go to `Settings > General > About > Certificate Trust Settings`.
- Under `Enable Full Trust for Root Certificates`, enable trust for the Caddy local root certificate.

If the trust toggle does not appear, confirm the certificate profile actually installed first.

## Backups
Manual backup (safe before changes):

```bash
cd /home/pi/habit-tracker
./scripts/backup-db.sh
```

## Standard update (safe flow)
This script does NOT delete the DB or data directories.

```bash
cd /home/pi/habit-tracker
./scripts/pi-update.sh
```

The update script runs:
- DB backup
- `git pull --ff-only`
- `npm ci`
- `prisma migrate deploy`
- `npm run build`
- `systemctl restart habit-tracker`
- health check via `https://habits.local/api/healthz` (fallback to `http://127.0.0.1:3000/api/healthz`)

## Rollback strategy
- Roll back code only first (e.g. `git reflog` / `git checkout <commit>` on the Pi)
- Restart service and verify `/api/healthz`
- Restore DB from `/home/pi/habit-tracker-data/backups/` only if absolutely necessary (schema/data mismatch)
