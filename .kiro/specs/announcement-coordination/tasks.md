# Announcement Coordination — Tasks

## 1. Spec

- [x] Write `requirements.md` with traceable acceptance criteria (AC1–AC5).
- [x] Write `design.md` with root-cause analysis, architecture diagram, and data-flow traces.
- [x] Write `tasks.md` (this file).

## 2. Pure scheduling logic

- [x] Add `PRIORITY_ACTION`, `PRIORITY_SUMMARY`, and `SUMMARY_SUPPRESSION_MS` constants to `src/scoring.mjs`.
- [x] Implement `scheduleAnnouncement({ message, priority, lastActionTimestamp, now, lastDeliveredText })` in `src/scoring.mjs`.
  - Returns `{ action: "deliver", message }` when suppression window has expired and text is not a duplicate.
  - Returns `{ action: "suppress", message }` when a higher-priority announcement fired within `SUMMARY_SUPPRESSION_MS`.
  - Returns `{ action: "deduplicate", message }` when `message === lastDeliveredText` and priority is `PRIORITY_SUMMARY`.
- [x] Export `scheduleAnnouncement`, `PRIORITY_ACTION`, `PRIORITY_SUMMARY`, `SUMMARY_SUPPRESSION_MS` from `src/scoring.mjs`.

## 3. Coordinator wiring in app.mjs

- [x] Add `lastActionTimestamp` and `lastSummaryText` coordinator state variables.
- [x] Update `showToast()` to set `lastActionTimestamp = Date.now()` on every call.
- [x] Update `updateQueueSummary()` to call `scheduleAnnouncement` and conditionally write to `#queue-summary`.
- [x] Preserve the existing 400 ms debounce on `debouncedUpdateQueueSummary`.
- [x] Preserve the existing clear-then-setTimeout pattern for AT re-announcement compatibility.

## 4. Regression tests

- [x] Create `tests/announcement.test.mjs` with coordinator regression coverage:
  - Post-debounce coordination: identical summaries deduplicate and changed summaries deliver.
  - Manual override suppression: `scheduleAnnouncement` returns `suppress` within window.
  - Deduplication: identical consecutive texts return `deduplicate`.
  - Timer ordering: same-timestamp actions suppress, boundary expiry delivers, sentinel zero and clock inversion do not suppress.

## 5. Documentation and discoverability

- [x] Write `docs/announcement-coordination-feedback.md` (technical feedback note).
- [x] Update `README.md` to reference the new spec and updated test/artifact counts.
- [x] Update `scripts/validate.mjs` to require `tests/announcement.test.mjs` and the three new spec files.

## 6. Verification

- [x] Run `node --test` — all tests pass (including 12 coordinator regression tests).
- [x] Run `node scripts/validate.mjs` — all artifacts verified.
- [x] Run `git diff --check` — no whitespace errors.
- [x] Run the deployed browser interaction check: the action toast appeared immediately, the queue summary stayed unchanged through the 500 ms suppression check, a later Bhopal search produced one settled two-result summary, and no console errors were recorded.
