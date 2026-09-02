# MongoDB Community Memory — Requirements

## Problem

Community teams collect applications, decisions, event notes, and lessons in disconnected forms and documents. The next organizer cannot reliably answer what worked, why a decision changed, or which lesson from a previous workshop applies now.

## User stories

- As an organizer, I want synthetic applications stored as MongoDB documents so the workshop demonstrates real CRUD without exposing applicant data.
- As a reviewer, I want the recommendation and human decision preserved separately so an override never erases the original evidence.
- As a community lead, I want city and decision summaries produced by aggregation pipelines so I can plan the next cohort.
- As a facilitator, I want to search past-event lessons across titles, summaries, takeaways, tags, and cities.
- As a learner, I want a local fallback so I can complete the lab before creating an Atlas cluster.

## Acceptance criteria

- MC1: `MONGODB_URI` activates MongoDB mode and the application reuses one `MongoClient`.
- MC2: Applications, event memories, and decision audits use separate collections with documented indexes.
- MC3: A human override creates an append-only audit document and keeps the original recommendation visible.
- MC4: The insights endpoint uses a MongoDB aggregation pipeline with decision and city groupings.
- MC5: Memory search tries Atlas Search first and falls back to the documented MongoDB text index.
- MC6: The API rejects records not explicitly classified as `synthetic-demo`.
- MC7: The interface displays its active storage and search modes.
- MC8: Tests run without external services and cover seeding, search, aggregation, auditing, and invalid decisions.

## Non-goals

- Storing real applications, patient data, customer data, or private community records.
- Automating admissions decisions without a human reviewer.
- Claiming semantic vector search without an embedding pipeline and vector index.

## Success measures

- One-command local demo with seeded synthetic data.
- A newcomer can inspect the document model, run a search, change a decision, and explain the audit trail in a 45-minute workshop.
- Every MongoDB claim in the README maps to executable code or a checked-in index definition.
