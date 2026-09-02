# EventOps Triage Lab

An explainable, privacy-safe event application triage dashboard built as a Kiro **Spec-to-Ship** proof project.

**Live demo:** https://kiro-eventops-spec-to-ship.pages.dev/

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
- Gives screen-reader users a debounced live summary of the active queue view
- Adds synthetic applications locally and never sends them to a server
- Exports an evidence snapshot as JSON

## Run locally

No package installation is required.

```powershell
node server.mjs
```

Open `http://localhost:4173`.

## Deploy to Cloudflare Pages

Connect this repository to Cloudflare Pages with no framework preset, no build command, and `/` as the output directory. The public build needs no server runtime.

## Verify

```powershell
node --test
node scripts/validate.mjs
```

Current result: **17 tests passed** and **16 project artifacts verified**.

## Kiro workflow evidence

The accessibility iteration was completed in an authenticated Kiro CLI session after it read the project's steering and spec files. The requirement, design decision, task, implementation, tests, browser check, strength, and observed friction are recorded in [`docs/kiro-run-notes.md`](docs/kiro-run-notes.md).

## Data boundary

All included names and applications are synthetic. The app stores changes only in the current browser's local storage. It is a workflow demonstration, not a production admissions or hiring system.

## Why this fits Kiro

The useful part is not “AI generated a dashboard.” The useful part is that the intent, acceptance criteria, architecture, constraints, implementation tasks, verification, and reusable agent guidance all remain reviewable in the repository.
