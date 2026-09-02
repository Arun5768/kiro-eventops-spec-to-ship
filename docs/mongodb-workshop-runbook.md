# 45-minute MongoDB Community Memory workshop

## Outcome

Each participant leaves with a working community-operations API and can explain why the document model, indexes, aggregation pipeline, and audit collection exist.

## Flow

1. **0–5 min — Inspect the problem:** applications, decisions, and event lessons live in separate documents and spreadsheets.
2. **5–12 min — Read the document model:** compare `applications`, `decision_audit`, and `event_memories`.
3. **12–20 min — Run CRUD:** add one fictional application and update its organizer decision.
4. **20–27 min — Inspect the receipt:** verify that the recommendation remains and a separate audit event was written.
5. **27–35 min — Aggregate:** read the `$facet` pipeline that groups decisions and cities in one round trip.
6. **35–42 min — Search memory:** query event lessons, then compare Atlas Search with the text-index fallback.
7. **42–45 min — Ship the evidence:** run tests and export the synthetic decision snapshot.

## Facilitator checks

- Never ask participants to enter real applicant or employer information.
- Use a dedicated Atlas learning database and a least-privilege database user.
- Keep connection strings in environment variables; never paste them into source files, screenshots, or chat.
- Delete the learning database after the workshop if the cohort will not reuse it.

## Evidence to capture

- Passing test output.
- Atlas collections and index names without credentials.
- One search result and its reported search mode.
- One application document plus its linked audit document.
- A short retrospective: what confused participants and what changed before the next session.
