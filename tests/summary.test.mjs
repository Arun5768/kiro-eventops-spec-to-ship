import test from "node:test";
import assert from "node:assert/strict";

import { computeFilterSummary } from "../src/scoring.mjs";

// Baseline decisions object used across multiple tests.
const baseDecisions = { Invite: 3, Review: 2, Waitlist: 1 };

test("reports visible count, filter, decision breakdown, and overrides", () => {
  const result = computeFilterSummary({
    visibleCount: 6,
    totalCount: 6,
    activeFilter: "All",
    decisions: baseDecisions,
    overrides: 1,
  });

  assert.ok(result.includes("6 applications"), `expected visible count in: ${result}`);
  assert.ok(result.includes("all decisions"), `expected filter label in: ${result}`);
  assert.ok(result.includes("3 invite"), `expected invite count in: ${result}`);
  assert.ok(result.includes("2 review"), `expected review count in: ${result}`);
  assert.ok(result.includes("1 waitlist"), `expected waitlist count in: ${result}`);
  assert.ok(result.includes("1 manual override"), `expected override count in: ${result}`);
});

test("uses singular 'application' when exactly one is visible", () => {
  const result = computeFilterSummary({
    visibleCount: 1,
    totalCount: 6,
    activeFilter: "Invite",
    decisions: { Invite: 1, Review: 2, Waitlist: 3 },
    overrides: 0,
  });

  assert.ok(result.includes("1 application"), `expected singular form in: ${result}`);
  assert.ok(!result.includes("1 applications"), `must not use plural for 1: ${result}`);
});

test("uses singular 'override' when exactly one override exists", () => {
  const result = computeFilterSummary({
    visibleCount: 2,
    totalCount: 2,
    activeFilter: "All",
    decisions: { Invite: 1, Review: 1, Waitlist: 0 },
    overrides: 1,
  });

  assert.ok(result.includes("1 manual override"), `expected singular override in: ${result}`);
  assert.ok(!result.includes("1 manual overrides"), `must not use plural for 1: ${result}`);
});

test("reports no manual overrides when count is zero", () => {
  const result = computeFilterSummary({
    visibleCount: 4,
    totalCount: 4,
    activeFilter: "All",
    decisions: baseDecisions,
    overrides: 0,
  });

  assert.ok(result.includes("no manual overrides"), `expected zero-override label in: ${result}`);
});

test("includes the named filter when not showing all", () => {
  const result = computeFilterSummary({
    visibleCount: 3,
    totalCount: 6,
    activeFilter: "Review",
    decisions: baseDecisions,
    overrides: 0,
  });

  assert.ok(result.includes("filter: Review"), `expected named filter in: ${result}`);
});

test("returns empty-queue message when total is zero", () => {
  const result = computeFilterSummary({
    visibleCount: 0,
    totalCount: 0,
    activeFilter: "All",
    decisions: { Invite: 0, Review: 0, Waitlist: 0 },
    overrides: 0,
  });

  assert.equal(result, "Queue is empty.");
});

test("returns no-match message when visible is zero but total is not", () => {
  const result = computeFilterSummary({
    visibleCount: 0,
    totalCount: 5,
    activeFilter: "Invite",
    decisions: { Invite: 0, Review: 3, Waitlist: 2 },
    overrides: 0,
  });

  assert.ok(result.includes("No applications match"), `expected no-match phrase in: ${result}`);
  assert.ok(result.includes("filter: Invite"), `expected filter name in no-match: ${result}`);
  assert.ok(result.includes("Queue total: 5"), `expected total in no-match: ${result}`);
});

test("treats missing decisions object gracefully", () => {
  const result = computeFilterSummary({
    visibleCount: 2,
    totalCount: 2,
    activeFilter: "All",
    decisions: null,
    overrides: 0,
  });

  // Should not throw; should still produce a readable string.
  assert.ok(typeof result === "string");
  assert.ok(result.length > 0);
});

test("treats negative or non-finite counts as zero", () => {
  const result = computeFilterSummary({
    visibleCount: -1,
    totalCount: NaN,
    activeFilter: "All",
    decisions: { Invite: 0, Review: 0, Waitlist: 0 },
    overrides: -5,
  });

  // With totalCount=0, should return the empty-queue message.
  assert.equal(result, "Queue is empty.");
});

test("treats blank activeFilter as 'All'", () => {
  const result = computeFilterSummary({
    visibleCount: 3,
    totalCount: 3,
    activeFilter: "   ",
    decisions: { Invite: 1, Review: 1, Waitlist: 1 },
    overrides: 0,
  });

  assert.ok(result.includes("all decisions"), `expected 'all decisions' for blank filter in: ${result}`);
});

test("plural overrides for count greater than one", () => {
  const result = computeFilterSummary({
    visibleCount: 4,
    totalCount: 4,
    activeFilter: "All",
    decisions: { Invite: 2, Review: 1, Waitlist: 1 },
    overrides: 3,
  });

  assert.ok(result.includes("3 manual overrides"), `expected plural overrides in: ${result}`);
});
