# Deployment on Raspberry Pi (LAN-only)

Assumptions
- Pi 4 Model B 4GB
- App runs on localhost:3000
- Caddy serves https://habits.local and proxies to 3000

Persistent paths (must not be in repo)
- DB: /home/pi/habit-tracker-data/db.sqlite
- Env: /home/pi/habit-tracker-secrets/.env

Update philosophy
- Pi does git pull, never re-clone
- Updates do not touch DB path
- Run migrations forward-only
- Backup DB before restart