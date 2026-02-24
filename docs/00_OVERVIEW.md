# Overview

Goal
- iPad-first habit tracker with month-at-a-glance calendar
- Local-only hosting on Raspberry Pi

Non-goals
- No public hosting
- No multi-user accounts (for now)

Core flows
- Open month view -> tap day -> edit completions in right inspector -> Save
- Manage missions -> reorder priority -> edit icon/color/name -> archive

Key constraints
- Day cells show up to 8 icons at fixed size
- Overflow shown as +N
- Missions order determines which icons appear when overflow occurs