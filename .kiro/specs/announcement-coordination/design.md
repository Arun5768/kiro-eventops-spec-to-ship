# Announcement Coordination — Design

## Root cause

`index.html` contains two independent `aria-live="polite"` regions:

```html
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<div class="sr-only" id="queue-summary" role="status" aria-live="polite" aria-atomic="true"></div>
```

These regions have no shared coordination. The call path for a manual decision change is:

```
handleDecisionChange()
  └── render()                         ← schedules debouncedUpdateQueueSummary (T+400 ms)
  └── showToast("Organizer decision recorded.")   ← writes #toast immediately (T+0)
                                       ← AT announces toast at T+0
  [400 ms later]
  updateQueueSummary()                 ← writes #queue-summary (T+400)
                                       ← AT announces summary at T+400
```

Two polite announcements arrive within 400 ms. Depending on the assistive technology, the second can interrupt the first or cause the first to be missed.

## Design decisions

### DD1 — Single coordinated channel, two visible DOM regions preserved

The fix does not merge the two DOM regions. `#toast` must remain visible to sighted users; `#queue-summary` must remain hidden. Instead, a lightweight **announcement coordinator** in `src/app.mjs` gates what each region is allowed to write and when.

**Why not merge into one DOM element?** `#toast` has a visual presence (fade-in/fade-out, absolute positioning). `#queue-summary` is visually hidden. Merging them would require duplicating CSS and risks breaking the visual toast.

### DD2 — Priority constant and suppression window

Two priority levels are defined as named constants:

| Constant | Value | Meaning |
|---|---|---|
| `PRIORITY_ACTION` | `"action"` | User-triggered confirmation: override, form submit, export, reset |
| `PRIORITY_SUMMARY` | `"summary"` | Periodic debounced queue state |
| `SUMMARY_SUPPRESSION_MS` | `600` | Milliseconds after a toast during which a summary is suppressed |

600 ms is chosen because it is 200 ms longer than the 400 ms debounce. This guarantees that any summary scheduled before the toast fires is cancelled, and any summary that fires within the combined 400 ms debounce + re-render window is also suppressed.

### DD3 — Pure scheduling function in scoring.mjs

A `scheduleAnnouncement` pure function encodes the suppression decision:

```js
scheduleAnnouncement({ message, priority, lastActionTimestamp, now })
  → { action: "deliver" | "suppress" | "deduplicate", message }
```

- `deliver` — the caller should write `message` to the live region immediately.
- `suppress` — a higher-priority announcement fired recently; discard this message.
- `deduplicate` — the message is identical to the last delivered message; no re-announcement needed.

This function has no side effects and is independently testable (AC4).

### DD4 — Coordinator state in app.mjs

`app.mjs` maintains two pieces of coordinator state:

```js
let lastActionTimestamp = 0;   // ms since epoch of the most recent toast
let lastSummaryText = "";      // last text successfully written to #queue-summary
```

`showToast` updates `lastActionTimestamp = Date.now()` every time it fires.

`updateQueueSummary` calls `scheduleAnnouncement` before writing to the DOM. If the result is `suppress`, the write is skipped silently. If `deduplicate`, the write is also skipped (prevents re-announcement of identical text on re-renders). If `deliver`, the existing clear-then-set pattern is preserved.

### DD5 — Debounce window unchanged

The 400 ms debounce on `updateQueueSummary` is preserved. The coordinator adds a second, outer gate — it does not replace the debounce.

## Architecture

```text
handleDecisionChange()
  └── render()
        └── debouncedUpdateQueueSummary()     ← 400 ms debounce (unchanged)
                └── updateQueueSummary()
                      └── scheduleAnnouncement()  ← pure, in scoring.mjs
                            ← if deliver: write #queue-summary
                            ← if suppress/deduplicate: skip write
  └── showToast(message)
        └── lastActionTimestamp = Date.now()
        └── write #toast  (visual + AT)
```

```text
src/scoring.mjs
  exports: evaluateApplication, summarizeApplications, computeFilterSummary,
           recommendationForScore, scheduleAnnouncement,
           PRIORITY_ACTION, PRIORITY_SUMMARY, SUMMARY_SUPPRESSION_MS

src/app.mjs
  coordinator state: lastActionTimestamp, lastSummaryText
  showToast()         → sets lastActionTimestamp, writes #toast
  updateQueueSummary() → calls scheduleAnnouncement, conditionally writes #queue-summary
```

## Data flow for manual override (fixed)

```
T+0     handleDecisionChange fires
T+0     render() called → debouncedUpdateQueueSummary scheduled for T+400
T+0     showToast("Organizer decision recorded.") → lastActionTimestamp = T+0
T+0     #toast text set → AT announces "Organizer decision recorded."
T+400   updateQueueSummary() fires
T+400   scheduleAnnouncement({ priority: "summary", lastActionTimestamp: T+0, now: T+400 })
T+400   now - lastActionTimestamp = 400 ms < SUMMARY_SUPPRESSION_MS (600 ms) → action: "suppress"
T+400   #queue-summary write skipped → AT hears nothing extra
T+600+  Any subsequent render (new search etc.) delivers the summary normally
```

## Data flow for rapid search (fixed)

```
T+0     keystroke → render() → debounce resets timer
T+100   keystroke → render() → debounce resets timer
T+200   keystroke → render() → debounce resets timer
T+600   updateQueueSummary() fires (400 ms after last keystroke)
T+600   lastActionTimestamp = 0 (no toast fired) → action: "deliver"
T+600   #queue-summary updated → AT announces once
```

## Failure handling

- `scheduleAnnouncement` validates all numeric inputs; missing or non-finite values default to `0`.
- If `lastActionTimestamp` is `0` (never set), `now - 0` is always greater than `SUMMARY_SUPPRESSION_MS`, so the summary is always delivered on first load.
- Identical consecutive summaries are deduplicated so a filter reset to the same state does not re-announce.

## Accessibility invariants preserved

- `#toast` keeps `role="status" aria-live="polite"` — no change.
- `#queue-summary` keeps `role="status" aria-live="polite" aria-atomic="true"` — no change.
- The clear-then-setTimeout pattern in `updateQueueSummary` is preserved for AT re-announcement compatibility.
- The `.sr-only` utility class is unchanged.

## Verification

- `scheduleAnnouncement` is unit-tested with explicit timestamp inputs (no real timers needed).
- `tests/announcement.test.mjs` covers: rapid search deduplication, manual override suppression, duplicate text deduplication, and timer expiry boundary.
- `scripts/validate.mjs` updated to require `tests/announcement.test.mjs` and the new spec files.
