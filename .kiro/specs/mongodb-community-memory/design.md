# MongoDB Community Memory — Design

## Architecture

```text
Browser UI
   │ JSON API
   ▼
Node HTTP server ── store interface ── MongoEventStore ── MongoDB Atlas
                                 └── MemoryEventStore ── local workshop fallback
```

The browser never receives a connection string. `server.mjs` owns one reusable `MongoClient` and injects a store into the API handler.

## Collections

- `applications`: synthetic intake fields plus score, recommendation, manual decision, and final decision.
- `decision_audit`: append-only record of the previous decision, new decision, reason, actor, and timestamp.
- `event_memories`: synthetic retrospective title, summary, takeaways, tags, city, and date.

## Indexes

- Unique `id` indexes make seeds idempotent.
- `{ city: 1, finalDecision: 1, score: -1 }` supports queue filters and regional review.
- `{ applicationId: 1, createdAt: -1 }` supports decision-history lookup.
- `eventops_memory_text` keeps self-managed/local full-text search usable.
- `mongodb/atlas-search-index.json` defines the richer Atlas Search mapping.

## Failure handling

- If no URI is supplied, the server intentionally starts with `MemoryEventStore` and labels the mode.
- If a URI is supplied but MongoDB cannot connect, startup fails visibly instead of silently pretending persistence succeeded.
- If the Atlas Search index is unavailable, memory search falls back to MongoDB `$text` and reports the actual search mode.
- API errors return small JSON messages and never echo connection details.

## Privacy boundary

Only synthetic records are accepted. The API validates `dataClassification: synthetic-demo`; the UI repeats this boundary before intake. This is a learning lab, not a production admissions system.
