# Troubleshooting

iPad cannot open https site
- Confirm iPad and Pi are on same LAN
- Confirm hostname resolves (habits.local)
- Confirm root CA installed and trusted

Safari still warns after install
- Ensure full trust enabled in Certificate Trust Settings

Caddy not issuing cert
- Check Caddy logs
- Confirm Caddyfile host matches the name you are using

Progress disappeared after update
- Verify DB is outside repo and DATABASE_URL points to persistent path
- Confirm git pull did not wipe any data directory