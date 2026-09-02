import test from "node:test";
import assert from "node:assert/strict";

import {
  scheduleAnnouncement,
  PRIORITY_ACTION,
  PRIORITY_SUMMARY,
  SUMMARY_SUPPRESSION_MS,
} from "../src/scoring.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Simulates calling scheduleAnnouncement for a PRIORITY_SUMMARY message
 * a given number of milliseconds after a toast (action) fired.
 */
function summaryAfter(elapsedMs, { lastDeliveredText = "" } = {}) {
  const lastActionTimestamp = 1_000_000; // arbitrary fixed epoch anchor
  const now = lastActionTimestamp + elapsedMs;
  return scheduleAnnouncement({
    message: "Showing 6 applications for all decisions. Queue: 3 invite, 2 review, 1 waitlist. no manual overrides.",
    priority: PRIORITY_SUMMARY,
    lastActionTimestamp,
    now,
    lastDeliveredText,
  });
}

// ---------------------------------------------------------------------------
// AC5-1  Coordinator deduplication after debounce settles
// ---------------------------------------------------------------------------
test("coordinator deduplication: after debounce settles, identical text is skipped and changed text delivers", () => {
  // This test verifies coordinator-level deduplication, not the debounce timer
  // itself (which is a DOM concern). It simulates the three calls the
  // coordinator receives once the 400 ms debounce has already fired:
  //   1. First delivery — new text, no prior toast → deliver.
  //   2. Same text again (e.g. re-render with no state change) → deduplicate.
  //   3. Changed text (search narrowed the list) → deliver.
  // lastActionTimestamp=0 throughout because no toast has fired.
  const message = "Showing 4 applications for all decisions. Queue: 2 invite, 1 review, 1 waitlist. no manual overrides.";
  const base = 1_000_000;

  const first = scheduleAnnouncement({
    message,
    priority: PRIORITY_SUMMARY,
    lastActionTimestamp: 0,
    now: base,
    lastDeliveredText: "",
  });
  assert.equal(first.action, "deliver", "first call with no prior toast and no prior text should deliver");

  const second = scheduleAnnouncement({
    message,
    priority: PRIORITY_SUMMARY,
    lastActionTimestamp: 0,
    now: base + 100,
    lastDeliveredText: message, // coordinator updated lastSummaryText after first delivery
  });
  assert.equal(second.action, "deduplicate", "identical text should not re-announce");

  const changed = "Showing 2 applications for all decisions. Queue: 1 invite, 1 review, 0 waitlist. no manual overrides.";
  const third = scheduleAnnouncement({
    message: changed,
    priority: PRIORITY_SUMMARY,
    lastActionTimestamp: 0,
    now: base + 200,
    lastDeliveredText: message,
  });
  assert.equal(third.action, "deliver", "changed text after search should deliver");
});

// ---------------------------------------------------------------------------
// AC5-2  Manual override suppression within SUMMARY_SUPPRESSION_MS
// ---------------------------------------------------------------------------
test("manual override: summary arriving within suppression window is suppressed", () => {
  // The debounce fires 400 ms after render(). The toast fires at T+0. So the
  // summary arrives at T+400, which is less than SUMMARY_SUPPRESSION_MS (600).
  const result = summaryAfter(400);
  assert.equal(result.action, "suppress",
    `summary at 400 ms should be suppressed (window is ${SUMMARY_SUPPRESSION_MS} ms)`);
});

test("manual override: summary with elapsed exactly 0 (same-timestamp action) is suppressed", () => {
  // elapsed=0 means the summary and the action share the exact same timestamp.
  // This is a genuine same-moment action — suppression must fire.
  // (Contrast with lastActionTimestamp=0, which is the no-action sentinel.)
  const result = summaryAfter(0);
  assert.equal(result.action, "suppress",
    "elapsed=0 is a same-timestamp action, not the sentinel, and must suppress");
});

test("manual override: summary arriving exactly at suppression boundary is suppressed", () => {
  // Boundary is exclusive: elapsed < SUMMARY_SUPPRESSION_MS means suppress.
  const result = summaryAfter(SUMMARY_SUPPRESSION_MS - 1);
  assert.equal(result.action, "suppress",
    `summary at ${SUMMARY_SUPPRESSION_MS - 1} ms should still be suppressed`);
});

test("manual override: summary arriving after suppression window expires is delivered", () => {
  // Once SUMMARY_SUPPRESSION_MS has elapsed the coordinator must allow the
  // summary through so the screen-reader user eventually hears the queue state.
  const result = summaryAfter(SUMMARY_SUPPRESSION_MS);
  assert.equal(result.action, "deliver",
    `summary at exactly ${SUMMARY_SUPPRESSION_MS} ms should be delivered`);
});

test("manual override: action-priority message always delivers regardless of window", () => {
  // The toast (PRIORITY_ACTION) must never be suppressed by its own coordinator.
  const result = scheduleAnnouncement({
    message: "Organizer decision recorded.",
    priority: PRIORITY_ACTION,
    lastActionTimestamp: Date.now(), // window wide open
    now: Date.now(),
    lastDeliveredText: "Organizer decision recorded.", // even if it is a duplicate
  });
  assert.equal(result.action, "deliver", "action-priority message must always deliver");
});

// ---------------------------------------------------------------------------
// AC5-3  Deduplication — identical consecutive texts are not re-announced
// ---------------------------------------------------------------------------
test("deduplication: identical summary text is not re-announced", () => {
  const message = "Showing 6 applications for all decisions. Queue: 3 invite, 2 review, 1 waitlist. no manual overrides.";
  const result = scheduleAnnouncement({
    message,
    priority: PRIORITY_SUMMARY,
    lastActionTimestamp: 0,    // no recent toast
    now: 2_000_000,            // well outside suppression window
    lastDeliveredText: message, // same as what was just delivered
  });
  assert.equal(result.action, "deduplicate",
    "identical consecutive summary text should deduplicate, not re-announce");
});

test("deduplication: different summary text after filter change is delivered", () => {
  const previous = "Showing 6 applications for all decisions. Queue: 3 invite, 2 review, 1 waitlist. no manual overrides.";
  const next = "Showing 2 applications for filter: Invite. Queue: 3 invite, 2 review, 1 waitlist. no manual overrides.";
  const result = scheduleAnnouncement({
    message: next,
    priority: PRIORITY_SUMMARY,
    lastActionTimestamp: 0,
    now: 2_000_000,
    lastDeliveredText: previous,
  });
  assert.equal(result.action, "deliver", "changed text should always deliver");
});

// ---------------------------------------------------------------------------
// AC5-4  Timer ordering — SUMMARY_SUPPRESSION_MS boundary semantics
// ---------------------------------------------------------------------------
test("timer ordering: suppression window constant is numeric and greater than debounce (400 ms)", () => {
  // The design requires SUMMARY_SUPPRESSION_MS > 400 so that a summary
  // scheduled by the 400 ms debounce is caught even when it fires slightly
  // before the window expires.
  assert.ok(
    typeof SUMMARY_SUPPRESSION_MS === "number" && SUMMARY_SUPPRESSION_MS > 400,
    `SUMMARY_SUPPRESSION_MS (${SUMMARY_SUPPRESSION_MS}) must be a number greater than 400`
  );
});

test("timer ordering: non-finite lastActionTimestamp is treated as sentinel zero — summary must deliver", () => {
  // NaN is normalised to 0, which is the sentinel for "no action has fired".
  // The summary must therefore deliver regardless of how small now is.
  const result = scheduleAnnouncement({
    message: "Showing 6 applications for all decisions. Queue: 3 invite, 2 review, 1 waitlist. no manual overrides.",
    priority: PRIORITY_SUMMARY,
    lastActionTimestamp: NaN,
    now: 500, // small synthetic value — must NOT trigger suppression
    lastDeliveredText: "",
  });
  assert.equal(result.action, "deliver",
    "NaN lastActionTimestamp → sentinel 0 → no suppression → must deliver");
  assert.equal(typeof result.message, "string");
});

test("timer ordering: non-finite now with real lastActionTimestamp — must not suppress (clock inversion)", () => {
  // NaN now is normalised to 0, which is earlier than lastActionTimestamp=1_000_000.
  // elapsed = 0 - 1_000_000 = negative. The rule is: only suppress when
  // 0 < elapsed < SUMMARY_SUPPRESSION_MS, so a negative elapsed must deliver.
  const result = scheduleAnnouncement({
    message: "Queue is empty.",
    priority: PRIORITY_SUMMARY,
    lastActionTimestamp: 1_000_000,
    now: NaN,
    lastDeliveredText: "",
  });
  assert.equal(result.action, "deliver",
    "NaN now → safeNow=0 → elapsed negative → not inside suppression window → must deliver");
});

test("timer ordering: now earlier than lastActionTimestamp (clock inversion) — must not suppress", () => {
  // Real scenario: synthetic test clocks or a system clock correction can
  // produce now < lastActionTimestamp. Suppression must not fire.
  const result = scheduleAnnouncement({
    message: "Showing 3 applications for filter: Invite. Queue: 3 invite, 0 review, 0 waitlist. no manual overrides.",
    priority: PRIORITY_SUMMARY,
    lastActionTimestamp: 1_000_500, // action fired "in the future"
    now: 1_000_000,                 // now is earlier
    lastDeliveredText: "",
  });
  assert.equal(result.action, "deliver",
    "now < lastActionTimestamp → elapsed negative → must not suppress");
});
