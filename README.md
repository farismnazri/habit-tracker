# Habit Tracker (iPad-first, LAN-only)

Runs locally on a Raspberry Pi and is accessed from an iPad over the home LAN.

Core UX
- Month grid (Mon-Sun)
- Tap day -> right-side inspector panel
- Missions list defines priority order
- Day cell shows up to 8 fixed-size icons, overflow shows +N

Local hosting
- HTTPS on LAN via Caddy reverse proxy
- No public deployment

Data persistence
- SQLite database stored outside the git repo so updates never overwrite progress

Docs
See /docs for UX, data model, deployment, and ops runbook.