# Announcement Coordination — Technical Feedback Note

## Session brief

On 2 September 2026, the `announcement-coordination` bugfix spec was executed
in Kiro CLI v3 Spec mode. The fix addresses a screen-reader accessibility
defect identified in the previous session's friction log
(`docs/kiro-run-notes.md`).

---

## Root cause

The application has two independent `aria-live="polite"` regions:

```html
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<div class="sr-only" id="queue-summary" role="status" aria-live="polite" aria-atomic="true"></div>
```

These regions have no awareness of each other. The call sequence for a manual
decision change is:

```
handleDecisionChange()
  render()                         → schedules debouncedUpdateQueueSummary at T+400 ms
  showToast("Organizer decision recorded.")  → writes #toast at T+0
                                             → AT announces toast at T+0
  [400 ms later]
  updateQueueSummary()             → writes #queue-summary at T+400
                                   → AT announces queue summary at T+400
```

A screen reader receives two polite announcements within 400 ms for a single
user action. The risk is that the second announcement can cut off the first,
or the first can be missed entirely, depending on the assistive technology and
platform — but those specific combinations were not manually tested as part of
this session. There was no mechanism to prevent a stale queue summary from
overwriting a higher-priority manual-action message.

---

## Fix applied

A lightweight announcement coordinator was added using two pieces:

**`src/scoring.mjs` — pure scheduling logic (no DOM access)**

```js
export const PRIORITY_ACTION = "action";
export const PRIORITY_SUMMARY = "summary";
export const SUMMARY_SUPPRESSION_MS = 600;

export function scheduleAnnouncement({
  message, priority, lastActionTimestamp, now, lastDeliveredText
}) → { action: "deliver" | "suppress" | "deduplicate", message }
```

The 600 ms suppression window is 200 ms beyond the 400 ms debounce, ensuring
any summary queued before the toast fires is also caught.

**`src/app.mjs` — coordinator state and wiring**

```js
let lastActionTimestamp = 0;   // updated by showToast on every call
let lastSummaryText = "";      // updated after a successful #queue-summary write

showToast(message) {
  lastActionTimestamp = Date.now();  // ← new line
  // ... existing toast logic unchanged
}

updateQueueSummary(visibleCount, metrics) {
  const text = computeFilterSummary(...);
  const decision = scheduleAnnouncement({
    message: text, priority: PRIORITY_SUMMARY,
    lastActionTimestamp, now: Date.now(), lastDeliveredText: lastSummaryText,
  });
  if (decision.action !== "deliver") return;  // ← gate
  lastSummaryText = text;
  // ... existing clear-then-setTimeout write unchanged
}
```

The visible toast, the 400 ms debounce, the `#toast` and `#queue-summary` DOM
regions, the `.sr-only` utility, and the `aria-live` attributes are all
unchanged.

---

## Workaround (pre-fix)

Before this fix, an organizer could work around the double announcement by
waiting at least 600 ms between making a manual decision and reading the queue
summary. There was no code-level workaround; the issue required a DOM timing
change or user patience.

---

## Suggested Kiro / spec workflow improvement

**The previous spec (community-eventops) defined each live region in isolation.
There was no shared requirement about how multiple live regions should
coordinate.**

A useful addition to the spec workflow would be an **accessibility interaction
matrix**: a short table in `design.md` that lists every live region, its
priority, and which other events or regions it must coordinate with. Something
like:

| Region | Priority | Suppressed by | Deduplicates |
|---|---|---|---|
| `#toast` | action | — | no |
| `#queue-summary` | summary | `#toast` within 600 ms | yes, consecutive identical |

This matrix would have surfaced the coordination gap during the design review
rather than after the implementation was shipped. Adding a cross-region
coordination section to the Kiro spec template for accessibility-sensitive
features would make this class of defect discoverable at spec time, not
post-ship.

A secondary improvement: the Kiro task checklist (`tasks.md`) could include a
verification step that asks "do any two live regions fire within 1 second of
each other for the same user action?" This prompts the developer to check
timing before marking the feature done.

---

## Verification evidence

```text
node --test
29 tests passed, 0 failed, 0 skipped
(12 new in tests/announcement.test.mjs + 17 existing)

node scripts/validate.mjs
Validation passed: 22 project artifacts verified.

git diff --check
Passed with no whitespace errors.
```

**New test breakdown (`tests/announcement.test.mjs`, 12 cases):**

| Test | Requirement |
|---|---|
| Post-debounce coordination: first summary delivers, identical text deduplicates, changed text delivers | AC5-1 |
| Manual override: summary at 400 ms is suppressed | AC5-2 |
| Manual override: summary at the same timestamp as the action is suppressed | AC5-2, AC5-4 |
| Manual override: summary at boundary−1 ms is suppressed | AC5-2 |
| Manual override: summary at boundary ms is delivered | AC5-2, AC5-4 |
| Manual override: action-priority message always delivers | AC5-2 |
| Deduplication: identical consecutive text | AC5-3 |
| Deduplication: different text delivers | AC5-3 |
| Timer ordering: `SUMMARY_SUPPRESSION_MS` is numeric and > 400 | AC5-4 |
| Timer ordering: `NaN` `lastActionTimestamp` → sentinel → delivers | AC5-4 |
| Timer ordering: `NaN` `now` → clock inversion → delivers | AC5-4 |
| Timer ordering: `now` < `lastActionTimestamp` → clock inversion → delivers | AC5-4 |

**Browser interaction status:** pending deployment of this iteration. This note does not claim a real screen-reader test; it records code-level and DOM-level verification separately.

**Data boundary:** only the repository's synthetic applicant records were used.
No real applicant, patient, client, partner, financial, or confidential data
was accessed during this session.
