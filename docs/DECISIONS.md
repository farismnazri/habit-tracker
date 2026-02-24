# Decisions Log

2026-02-24
- iPad-first split view layout (no modal by default)
- Missions list order is priority order
- Day cell shows 8 fixed-size icons, overflow as +N
- Day-cell icon fill order prioritizes non-archived completions before archived completions; within each archived/non-archived group, keep mission `sort_order`
- Archive instead of delete, keep historical completions visible
- Host locally on Pi using Caddy internal TLS and LAN-only access
- Persist SQLite DB outside git repo
- Global UI theme uses only palette `#5e5fab`, `#eed29c`, `#ff80a0`, `#ffc9dc`, `#fdfdfd` via CSS variables + Tailwind theme tokens (no random hardcoded UI colors)
