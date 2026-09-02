import test from "node:test";
import assert from "node:assert/strict";

import { MemoryEventStore } from "../server/memory-store.mjs";
import { seedApplications } from "../src/data.mjs";
import { seedMemories } from "../src/memory-data.mjs";

test("memory store seeds applications and event memories", async () => {
  const store = new MemoryEventStore();
  const counts = await store.seed({ applications: seedApplications, memories: seedMemories });

  assert.equal(counts.applications, seedApplications.length);
  assert.equal(counts.memories, seedMemories.length);
  assert.equal((await store.listApplications()).length, seedApplications.length);
});

test("decision overrides preserve the recommendation and create an audit event", async () => {
  const store = new MemoryEventStore({ applications: seedApplications, memories: seedMemories });
  const [application] = await store.listApplications();
  const originalRecommendation = application.recommendation;

  const result = await store.updateDecision(application.id, {
    manualDecision: "Review",
    reason: "Needs a clearer workshop artifact",
  });

  assert.equal(result.application.recommendation, originalRecommendation);
  assert.equal(result.application.finalDecision, "Review");
  assert.equal(result.audit.previousDecision, application.finalDecision);
  assert.equal((await store.insights()).auditEvents, 1);
});

test("community memory search works across takeaways and city", async () => {
  const store = new MemoryEventStore({ applications: seedApplications, memories: seedMemories });

  const auditMatches = await store.searchMemories("audit trail");
  const indoreMatches = await store.searchMemories("Indore broken queries");

  assert.ok(auditMatches.some((memory) => memory.id === "memory-003"));
  assert.ok(indoreMatches.some((memory) => memory.id === "memory-002"));
});

test("insights aggregate decisions and cities", async () => {
  const store = new MemoryEventStore({ applications: seedApplications, memories: seedMemories });
  const insights = await store.insights();

  assert.equal(insights.totalApplications, seedApplications.length);
  assert.equal(Object.values(insights.byDecision).reduce((total, count) => total + count, 0), seedApplications.length);
  assert.ok(insights.byCity.some((item) => item.city === "Bhopal" && item.count === 2));
});

test("unsupported decisions fail closed", async () => {
  const store = new MemoryEventStore({ applications: seedApplications });
  await assert.rejects(() => store.updateDecision("syn-001", { manualDecision: "Auto-accept" }), /Unsupported/);
});
