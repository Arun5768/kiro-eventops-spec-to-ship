# Announcement Coordination — Requirements

## Problem

The accessible announcement layer has two independent `aria-live="polite"` regions:

- `#toast` — a visible, auto-dismissing status message for user actions (manual override, form submit, export, reset).
- `#queue-summary` — a visually-hidden, debounced summary of the active queue view (filter, visible count, decision breakdown, override count).

When a user changes a manual decision, both regions fire in quick succession:

1. `render()` schedules a debounced `updateQueueSummary` (400 ms delay).
2. `showToast("Organizer decision recorded.")` writes to `#toast` immediately.
3. After 400 ms, `updateQueueSummary` writes to `#queue-summary`.

A screen reader receives two polite announcements within 400 ms for a single user action. Depending on the reader and platform, the second announcement can cut off the first, or the first can be missed entirely. There is no mechanism to prevent a stale queue summary from overwriting a higher-priority manual-action message.

## Users

- **Screen-reader user** — needs one clear, timely announcement per discrete action, not two competing interruptions.
- **Community organizer** — must not lose the visible toast or the queue summary as sighted feedback.
- **Workshop participant** — should be able to trace how the fix restores a deterministic announcement order.

## User stories and acceptance criteria

### AC1 — No duplicate accessible announcements

As a screen-reader user, I want a single, coherent announcement per user action so my reader is never interrupted by a competing polite region.

Acceptance criteria:

1. After a manual decision change, the screen reader receives exactly one accessible announcement before the next user action.
2. After a search keystroke during the debounce window, no intermediate announcement fires before the debounce delay elapses.
3. The visible toast element remains unchanged in appearance, timing, and position.

### AC2 — Priority ordering: manual-action message over queue summary

As a screen-reader user, I want an action confirmation (e.g. "Organizer decision recorded.") to take precedence over a queue summary so I always know my action was registered.

Acceptance criteria:

1. When a toast-priority message and a queue-summary update are both pending within a configurable suppression window (`SUMMARY_SUPPRESSION_MS`), the toast message is delivered and the queue-summary is suppressed for the duration of that window.
2. After the suppression window expires with no new toast message, the queue summary is delivered normally.
3. The suppression window is expressed as a named constant, not a magic number.

### AC3 — No stale summary after a recent high-priority announcement

As a screen-reader user, I want a queue summary that was scheduled before my action completed to be discarded, not announced after the action confirmation.

Acceptance criteria:

1. If a toast fires after a queue summary has already been scheduled but not yet delivered, the pending summary is cancelled.
2. A new queue summary computed after the suppression window expires reflects the state at that time, not stale pre-action state.

### AC4 — Deterministic pure scheduling logic

As a workshop participant, I want the priority and suppression rules to live in a pure function so I can understand them without reading DOM code.

Acceptance criteria:

1. A `scheduleAnnouncement` pure function accepts a message, a priority, a `lastActionTimestamp`, and a `now` timestamp; it returns a plain object describing the action to take (`deliver`, `suppress`, or `deduplicate`).
2. The function has no side effects and no DOM dependencies.
3. The function is exported from `src/scoring.mjs` alongside `computeFilterSummary`.

### AC5 — Regression safety

As a developer, I want automated tests for the four failure modes so the bug cannot regress silently.

Acceptance criteria:

1. Automated test: once the debounce calls the coordinator, identical summary text is deduplicated and changed text is delivered.
2. Test: a manual override fires the toast message and suppresses the queue summary within the suppression window.
3. Test: duplicate consecutive summary texts are not re-announced.
4. Test: `scheduleAnnouncement` returns `deliver` when the suppression window has expired and `suppress` when it has not.
5. Browser interaction check: rapid search changes produce one settled summary, while a manual override leaves the action confirmation as the only live-region change during the suppression window.

## Non-goals

- Changing the visible toast appearance, timing, or position.
- Replacing `#queue-summary` or `#toast` with a single DOM element.
- Altering the scoring rules or the `computeFilterSummary` output format.
- Making `aria-live` regions `assertive`; polite announcements remain correct here.
- Modifying the Cloudflare upload mirror under `cloudflare-upload/`.

## Success measures

- `node --test` passes all existing tests plus the four new regression tests.
- `node scripts/validate.mjs` continues to report all artifacts verified.
- `git diff --check` reports no whitespace errors.
- A browser interaction check confirms one live-region DOM change per manual override during the suppression window. A real assistive-technology test remains separate and must not be claimed unless performed.
