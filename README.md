# EventOps Community Memory

A MongoDB-backed community-operations lab for explainable application triage, auditable human decisions, regional insights, and searchable lessons from past events.

The project extends the original Kiro EventOps proof into a practical MongoDB workshop asset for The Origin Guild and a proposed MongoDB User Group in Central India.

> **Data boundary:** every included identity, application, and event memory is synthetic. Do not use this lab for real applicant, employer, patient, customer, or partner data.

## Why this is a MongoDB project

MongoDB is not a logo added to the interface. It owns four visible responsibilities:

1. **Document persistence** — event applications and retrospective memories are stored as flexible documents.
2. **Decision receipts** — organizer overrides create append-only audit documents without erasing the original recommendation.
3. **Community insights** — a `$facet` aggregation returns decision and city summaries in one pipeline.
4. **Event-memory retrieval** — Atlas Search queries titles, summaries, takeaways, tags, and cities; a MongoDB text-index fallback keeps the lab runnable without an Atlas Search index.

The browser displays the active storage and search modes, so the demo cannot quietly imply that MongoDB is connected when it is not.

## Architecture

```text
Browser UI
   │
   ▼
Node JSON API ── store interface ── MongoDB Atlas
                              └── in-memory workshop fallback

MongoDB collections
├── applications
├── decision_audit
└── event_memories
```

## Run immediately

Requires Node.js 20.19 or newer.

```powershell
pnpm install
pnpm start
```

Open `http://localhost:4173`. With no connection string, the API runs in clearly labelled in-memory mode using the same store contract as MongoDB.

## Run with MongoDB Atlas

1. Create a learning cluster and a least-privilege database user.
2. Copy `.env.example` values into your shell or secret manager. Never commit the real URI.
3. Create an Atlas Search index named `eventops_memory_search` on `event_memories` using [`mongodb/atlas-search-index.json`](mongodb/atlas-search-index.json).
4. Seed and start:

```powershell
$env:MONGODB_URI="mongodb+srv://..."
$env:MONGODB_DATABASE="eventops_community_memory"
pnpm seed:mongo
pnpm start
```

The application creates operational indexes at startup and idempotently seeds only synthetic records.

## API evidence

| Method | Endpoint | MongoDB concept |
|---|---|---|
| `GET` | `/api/status` | Connection and honest runtime-mode reporting |
| `GET` | `/api/applications` | Filtered document query |
| `POST` | `/api/applications` | Validated synthetic document insert |
| `PATCH` | `/api/applications/:id/decision` | Application update plus append-only audit insert |
| `GET` | `/api/insights` | `$facet`, `$group`, `$avg`, `$sum`, and `$sort` aggregation |
| `GET` | `/api/memory/search?q=...` | Atlas Search with MongoDB `$text` fallback |

## Verify

```powershell
pnpm test
pnpm validate
```

The unit suite needs no database account. It checks seeding, search, community insights, decision auditing, invalid-decision handling, scoring, and accessible announcement coordination.

## Workshop-ready material

- [`docs/mongodb-workshop-runbook.md`](docs/mongodb-workshop-runbook.md) — a 45-minute hands-on session
- [`.kiro/specs/mongodb-community-memory/requirements.md`](.kiro/specs/mongodb-community-memory/requirements.md) — user stories and acceptance criteria
- [`.kiro/specs/mongodb-community-memory/design.md`](.kiro/specs/mongodb-community-memory/design.md) — collections, indexes, failure behavior, and privacy boundary
- [`.kiro/specs/mongodb-community-memory/tasks.md`](.kiro/specs/mongodb-community-memory/tasks.md) — honest completion record

## Original Kiro proof

The repository began as an explainable event-application triage dashboard built through Kiro's Spec-to-Ship workflow. That evidence remains reviewable:

- `.kiro/specs/community-eventops/` — first requirements, architecture, and implementation trail
- `.kiro/specs/announcement-coordination/` — accessibility bugfix spec and regression evidence
- `.kiro/steering/` and `.kiro/hooks/` — project guidance and verification automation
- `community-eventops-power/` — reusable EventOps guidance
- [`docs/kiro-run-notes.md`](docs/kiro-run-notes.md) and [`docs/kiro-product-feedback.md`](docs/kiro-product-feedback.md) — authenticated run notes and product observations

The current public Pages demo still shows the earlier browser-local build: https://kiro-eventops-spec-to-ship.pages.dev/

## What remains before using this in the MUG application

- Connect a personal Atlas free-tier cluster.
- Capture a real, credential-free run showing the three collections, indexes, aggregation response, and one Atlas Search result.
- Deploy the Node server and add the MongoDB-backed URL here.
- Run the workshop with a small pilot cohort and publish the retrospective.

## License and intent

This is an educational proof of work for community learning. The scoring rules are transparent demo rules, not a model for employment, admissions, credit, healthcare, or other consequential decisions.
