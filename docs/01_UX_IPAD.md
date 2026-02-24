# iPad UX Spec

Layout
- Split view
- Left: navigation + Missions entry
- Center: month calendar grid (Mon-Sun)
- Right: day inspector (no modal)

Theme (global palette)
- App background: `#fdfdfd`
- Primary text / headers / key emphasis: `#5e5fab`
- Primary surface / accent surfaces: `#ffc9dc`
- Active / selected states and focus emphasis: `#ff80a0`
- Muted surfaces / secondary emphasis / borders: `#eed29c`
- All app chrome colors (backgrounds, cards, borders, buttons, highlights, selected states, focus rings) map to CSS variables in `app/globals.css` and Tailwind theme tokens (avoid hardcoded one-off colors in components)

Month grid
- Day cell includes day number + 2x4 icon grid (8 slots)
- Icons fixed size, never auto-resize
- If completed tasks > 8, show +N badge

Day inspector
- Shows full mission list in priority order
- Toggle multiple missions
- Save enabled only when changes exist
- Cancel discards changes

Missions screen
- Split view
- Left: sortable mission list with drag handle
- Right: editor (name, icon picker + `icon_key`, color) with Save/Cancel
- Icon picker shows a grid of SVGs from `public/icons`; selecting one updates/saves the mission `icon_key` filename
- Archive instead of delete
- Archived section is read-only in day inspector
