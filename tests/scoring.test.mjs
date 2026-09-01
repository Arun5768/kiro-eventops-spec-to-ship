import test from "node:test";
import assert from "node:assert/strict";

import {
  evaluateApplication,
  recommendationForScore,
  summarizeApplications,
} from "../src/scoring.mjs";

test("recommendation thresholds are deterministic", () => {
  assert.equal(recommendationForScore(70), "Invite");
  assert.equal(recommendationForScore(69), "Review");
  assert.equal(recommendationForScore(45), "Review");
  assert.equal(recommendationForScore(44), "Waitlist");
});

test("a strong, specific builder application is invited", () => {
  const result = evaluateApplication({
    role: "JavaScript developer",
    experience: "Beginner",
    motivation: "A".repeat(140),
    availableHours: 8,
    proofUrl: "https://example.com/project",
    buildCommitment: true,
  });

  assert.equal(result.score, 100);
  assert.equal(result.recommendation, "Invite");
  assert.equal(result.finalDecision, "Invite");
  assert.ok(result.reasons.some((reason) => reason.includes("Direct builder fit")));
});

test("missing optional data never crashes and produces reasons", () => {
  const result = evaluateApplication({});

  assert.equal(result.score, 0);
  assert.equal(result.recommendation, "Waitlist");
  assert.ok(result.reasons.length >= 5);
});

test("very limited availability applies a penalty without going negative", () => {
  const result = evaluateApplication({
    role: "Student",
    motivation: "Short",
    availableHours: 1,
  });

  assert.equal(result.score, 0);
  assert.ok(result.reasons.some((reason) => reason.includes("-15")));
});

test("manual decisions remain separate from recommendations", () => {
  const result = evaluateApplication({
    role: "Backend engineer",
    motivation: "A".repeat(140),
    availableHours: 8,
    proofUrl: "https://example.com/repo",
    buildCommitment: true,
    manualDecision: "Review",
  });

  assert.equal(result.recommendation, "Invite");
  assert.equal(result.finalDecision, "Review");
});

test("summary reports decisions, overrides, and average score", () => {
  const summary = summarizeApplications([
    {
      role: "Developer",
      motivation: "A".repeat(140),
      availableHours: 8,
      proofUrl: "https://example.com",
      buildCommitment: true,
    },
    { role: "Student", motivation: "Short", availableHours: 1, manualDecision: "Review" },
  ]);

  assert.equal(summary.metrics.total, 2);
  assert.equal(summary.metrics.overrides, 1);
  assert.equal(summary.metrics.decisions.Invite, 1);
  assert.equal(summary.metrics.decisions.Review, 1);
  assert.equal(summary.metrics.averageScore, 45);
});
