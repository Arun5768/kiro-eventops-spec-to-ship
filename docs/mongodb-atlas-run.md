# Verified MongoDB Atlas run

**Verified:** 3 September 2026  
**Purpose:** credential-free evidence for the EventOps Community Memory proof of work

## Environment

- MongoDB Atlas M0 free cluster: `EventOps-Memory`
- Provider and region: AWS, Mumbai (`ap-south-1`)
- Database: `eventops_community_memory`
- Data boundary: synthetic demonstration records only
- Application access: a cluster-restricted database user and a limited network access entry
- Secret handling: the connection string exists only in the gitignored `.env.local` file

## Seeded data

| Collection | Verified contents |
|---|---:|
| `applications` | 6 synthetic applications |
| `event_memories` | 4 synthetic event retrospectives |
| `decision_audit` | Empty initially; populated when an organizer records an override |

The seed command is idempotent, so rerunning it does not duplicate the demonstration records.

## Search proof

Atlas Search index `eventops_memory_search` reached `READY` with all 4 event-memory documents indexed. It maps six string fields: `city`, `event`, `summary`, `tags`, `takeaways`, and `title`.

The application query `audit trail` was executed through the public API endpoint and returned:

```text
Search mode: atlas-search
Result count: 1
Top result: Human overrides need a reason and an audit trail
```

This verifies the complete path from the EventOps API to MongoDB Atlas and back. The interface reports the active search mode, so a reviewer can distinguish Atlas Search from the local text-search fallback.

## Quality checks

- 37 automated tests passed
- 33 project artifacts passed repository validation
- Runtime status reported `mongodb` storage mode and `synthetic-demo-only` privacy mode
- Community insights returned 6 applications from the Atlas-backed database

No password, connection string, IP address, project identifier, or organization identifier is included in this record.
