# EventOps Triage Lab — Design

## Architecture

The application is a dependency-free static web app served by a minimal Node HTTP server.

```text
index.html
   │
   ├── src/app.mjs ────────────── UI state, rendering, local storage, export
   │        │
   │        ├── src/scoring.mjs ─ pure scoring and recommendation rules
   │        └── src/data.mjs ──── synthetic seed applications
   │
   └── styles.css ─────────────── responsive presentation and accessible focus

tests/scoring.test.mjs ────────── score boundaries and resilience
scripts/validate.mjs ──────────── project, spec, hook, and Power integrity checks
```

## Decision model

The rule engine is intentionally simple and reviewable.

| Signal | Points | Reason |
|---|---:|---|
| Motivation length ≥ 120 characters | +25 | Specific motivation |
| Motivation length 60–119 | +15 | Useful motivation |
| Availability ≥ 6 hours | +20 | Can complete the build lab |
| Availability 3–5 hours | +10 | Can participate with constraints |
| Builder role | +20 | Direct fit for a shipping session |
| Designer / product / community role | +12 | Cross-functional fit |
| Beginner | +10 | Learning opportunity |
| Shared a portfolio or repository | +15 | Existing proof of initiative |
| Agreed to build and demo | +10 | Outcome alignment |
| Availability < 2 hours | -15 | Limited ability to complete the session |

Recommendation thresholds:

- `Invite`: score ≥ 70
- `Review`: score 45–69
- `Waitlist`: score < 45

The score is capped between 0 and 100. These rules are not a claim of objective human quality; they are a transparent demo of a configurable workflow.

## State model

```js
{
  id,
  name,
  role,
  city,
  experience,
  motivation,
  availableHours,
  proofUrl,
  buildCommitment,
  manualDecision
}
```

Evaluated records add:

```js
{
  score,
  recommendation,
  reasons,
  finalDecision
}
```

## Data boundaries

- Seed data is visibly labelled synthetic.
- New records remain in local storage under `eventops-demo-applications-v1`.
- No analytics, cookies, APIs, uploads, or external requests are used.
- Export is generated in the browser and downloaded locally.
- The form warns users not to enter real personal information.

## Failure handling

- Invalid or missing numeric values become `0`.
- Missing strings become empty strings before matching.
- Corrupt local storage falls back to synthetic seed data.
- Invalid URLs do not receive proof points.
- An empty filtered result shows a clear reset action.

## Accessibility

- Semantic landmarks and headings
- Labelled inputs and buttons
- Visible `:focus-visible` styles
- `aria-live="polite"` for result and export messages
- Color is paired with text labels

## Verification

- Unit tests exercise scoring thresholds, score caps, missing fields, and manual overrides.
- The validation script checks required files, JSON syntax, Power manifest fields, synthetic-data notice, and spec completeness.
- Manual browser verification covers responsive layout, filters, form entry, override, and export.

