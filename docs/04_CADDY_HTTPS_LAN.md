# Caddy HTTPS on LAN (Internal CA)

Goal
- Serve the app over HTTPS on the local network without public exposure.

Method
- Caddy reverse_proxy to the app
- Use Caddy internal CA (local HTTPS)

Root CA certificate
- Typical path: /var/lib/caddy/.local/share/caddy/pki/authorities/local/root.crt :contentReference[oaicite:2]{index=2}
- Caddy’s local PKI is stored under pki/authorities/local in its data directory :contentReference[oaicite:3]{index=3}

Client trust (iPad)
- Install the root.crt on the iPad
- Enable trust: Settings > General > About > Certificate Trust Settings :contentReference[oaicite:4]{index=4}

Hostname
- Use an mDNS name like habits.local so iPad can resolve it on the LAN.