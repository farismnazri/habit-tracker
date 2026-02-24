# Security (LAN-only)

Principles
- No port forwarding
- Bind app server to localhost
- Only Caddy listens on LAN (443)

Optional hardening
- Firewall allow 443 from local subnet only
- Basic auth on Caddy if you want an extra gate (optional)