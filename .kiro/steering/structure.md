---
inclusion: always
---

# Project structure

- `index.html` — accessible page structure and form controls
- `styles.css` — responsive visual system
- `src/scoring.mjs` — pure decision rules; no DOM access
- `src/data.mjs` — synthetic seed records only
- `src/app.mjs` — state, rendering, events, persistence, and export
- `tests/` — Node tests matching `*.test.mjs`
- `scripts/validate.mjs` — repository integrity checks
- `.kiro/specs/community-eventops/` — requirements, design, and tasks
- `.kiro/steering/` — persistent project guidance
- `.kiro/hooks/` — event-driven verification
- `community-eventops-power/` — reusable Kiro Power

Naming rules:

- Use `camelCase` for JavaScript variables and functions.
- Use `kebab-case` for CSS classes and filenames.
- Keep UI copy concise and specific.
- Add or update tests whenever scoring behavior changes.

