# Data Model

Entities

Mission
- id
- name
- icon_key (SVG filename under `/public/icons`, e.g. `SAILOR_ICONS-02.svg`)
- color_hex
- sort_order
- is_archived
- created_at
- updated_at

Completion
- id
- mission_id
- date (YYYY-MM-DD, local)
- is_done (or status enum if expanded later)
- created_at
- updated_at

Constraints
- Unique (mission_id, date)

Rendering rule
- For a given date: completed missions ordered by mission.sort_order
- Calendar cell shows first 8, overflow as +N
- Mission icon render uses `/icons/<icon_key>` (served from `public/icons`)

Archiving
- Archiving does not delete completions
- Archived missions appear read-only in day inspector
- Archived completions remain visible in historical calendar cells (muted)
