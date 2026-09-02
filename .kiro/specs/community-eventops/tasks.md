# EventOps Triage Lab — Tasks

## 1. Foundation

- [x] Create the three-part Kiro feature spec.
- [x] Add product, technology, and structure steering files.
- [x] Establish a dependency-free local runtime.

## 2. Decision engine

- [x] Implement pure scoring rules.
- [x] Produce human-readable reasons for every score.
- [x] Add deterministic recommendation thresholds.
- [x] Preserve manual decisions separately from recommendations.

## 3. Organizer dashboard

- [x] Render summary metrics and synthetic application cards.
- [x] Add decision filters and text search.
- [x] Add manual decision controls.
- [x] Add a responsive, accessible presentation.
- [x] Add live decision summary ARIA region (R8): `computeFilterSummary` pure function in `src/scoring.mjs`, visually-hidden `#queue-summary` live region in `index.html`, `.sr-only` utility in `styles.css`, debounced wiring in `src/app.mjs`.

## 4. Local intake and evidence

- [x] Add a synthetic application form.
- [x] Persist demo records in local storage only.
- [x] Export evaluated evidence as JSON.
- [x] Add clear privacy and synthetic-data notices.

## 5. Kiro-native project guidance

- [x] Add a PostFileSave verification hook.
- [x] Create a Community EventOps Power manifest.
- [x] Add a reusable Spec-to-Ship skill and reference checklist.

## 6. Verification

- [x] Add unit tests for score boundaries and missing data.
- [x] Add unit tests for `computeFilterSummary` boundary cases (11 cases in `tests/summary.test.mjs`).
- [x] Add an integrity validation script.
- [x] Run the project through Kiro CLI and record the session outcome in `docs/kiro-run-notes.md`.
- [x] Publish the repository and add its live demo link to `README.md`.
