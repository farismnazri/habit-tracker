# Codex Handoff

Build status
- Next.js App Router + TypeScript + Tailwind app implemented
- Prisma + SQLite data model implemented (`Mission`, `Completion`) with API routes and health endpoint (`GET /api/healthz`)
- Calendar month view + day inspector + missions management UI implemented (iPad-first split layouts)
- Pi ops scripts implemented (`scripts/backup-db.sh`, `scripts/pi-update.sh`)

App routes
- `/` month calendar + right inspector (Save/Cancel draft editing)
- `/missions` mission reorder/editor/archive/restore
- `/api/healthz` returns `{ ok: true }`

Important paths / assumptions
- Production repo path on Pi: `/home/pi/habit-tracker`
- Production DB path (outside repo): `/home/pi/habit-tracker-data/db.sqlite`
- Production backups dir (outside repo): `/home/pi/habit-tracker-data/backups/`
- Production env file (outside repo): `/home/pi/habit-tracker-secrets/.env`
- App binds to `127.0.0.1:3000` via npm start script (`next start -H 127.0.0.1`)
- Caddy is the only LAN-facing listener (`https://habits.local`)

Prisma notes
- Prisma 7 is configured via `prisma.config.ts` (required for current Prisma versions)
- `lib/prisma.ts` sets a production fallback for `DATABASE_URL=file:/home/pi/habit-tracker-data/db.sqlite` if env is missing
- Initial migration is committed at `prisma/migrations/20260224090000_init/`
- On this local machine (Node v24), `prisma migrate dev` failed with a generic "Schema engine error" despite `prisma generate` and `next build` succeeding. Migration SQL was created manually to unblock the repo. Re-test `npx prisma migrate deploy` on the Pi (likely different Node/runtime)

Data safety
- Day edits only rewrite completions for ACTIVE missions on the selected date
- Archiving missions does not delete completions
- Update script backs up DB before pull/install/migrate/build/restart
