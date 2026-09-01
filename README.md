# EventOps Triage Lab

An explainable, privacy-safe event application triage dashboard built as a Kiro **Spec-to-Ship** proof project.

The project turns a fuzzy community-operations problem into inspectable artifacts:

- `.kiro/specs/community-eventops/requirements.md` — user stories and acceptance criteria
- `.kiro/specs/community-eventops/design.md` — architecture, data boundaries, and failure handling
- `.kiro/specs/community-eventops/tasks.md` — implementation checklist and verification record
- `.kiro/steering/` — product, technology, and structure guidance for Kiro
- `.kiro/hooks/verify-on-save.json` — automatic verification after JavaScript changes
- `community-eventops-power/` — a reusable, skills-only Kiro Power

## What the app does

- Scores synthetic event applications with transparent, adjustable rules
- Separates `Invite`, `Review`, and `Waitlist` decisions
- Shows the exact reasons behind every score
- Allows manual decisions without hiding the automated recommendation
- Adds synthetic applications locally and never sends them to a server
- Exports an evidence snapshot as JSON

## Run locally

No package installation is required.

```powershell
node server.mjs
```

Open `http://localhost:4173`.

## Deploy to Cloudflare Pages

Upload the static artifact containing `index.html`, `styles.css`, `_headers`, and `src/` to a Cloudflare Pages Direct Upload project. The public build needs no command and no server runtime.

## Verify

```powershell
node --test
node scripts/validate.mjs
```

## Data boundary

All included names and applications are synthetic. The app stores changes only in the current browser's local storage. It is a workflow demonstration, not a production admissions or hiring system.

## Why this fits Kiro

The useful part is not “AI generated a dashboard.” The useful part is that the intent, acceptance criteria, architecture, constraints, implementation tasks, verification, and reusable agent guidance all remain reviewable in the repository.
