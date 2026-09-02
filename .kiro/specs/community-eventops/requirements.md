# EventOps Triage Lab — Requirements

## Problem

Community teams often collect applications in a form, move them into a spreadsheet, and make decisions through undocumented intuition. That creates slow follow-up, inconsistent decisions, and no useful explanation when an organizer revisits the shortlist.

The first release must demonstrate a transparent alternative without collecting or transmitting real personal data.

## Users

- **Community organizer** — needs a fast, explainable shortlist.
- **Program lead** — needs a defensible decision record and aggregate metrics.
- **Workshop participant** — needs to understand how requirements become working code.

## User stories and acceptance criteria

### R1 — Review a synthetic application queue

As an organizer, I want to see all applications and their recommended decision so I can focus on ambiguous cases.

Acceptance criteria:

1. The dashboard displays at least five synthetic applications.
2. Every application shows name, role, city, experience level, motivation, and available hours.
3. Every application receives one recommendation: `Invite`, `Review`, or `Waitlist`.
4. The default view sorts higher scores first.

### R2 — Understand every recommendation

As an organizer, I want the scoring reasons to be visible so the tool does not become a black box.

Acceptance criteria:

1. Each score is accompanied by positive or negative reason statements.
2. The score is calculated only from documented rules.
3. A missing optional field never crashes the dashboard.
4. A manual decision does not overwrite or hide the automated recommendation.

### R3 — Filter the queue

As an organizer, I want to filter by decision and search by name, role, or city so I can review a focused subset.

Acceptance criteria:

1. Decision filters support `All`, `Invite`, `Review`, and `Waitlist`.
2. Search is case-insensitive.
3. Active filters update the visible count and empty state immediately.

### R4 — Add a local demo application

As a workshop participant, I want to submit a synthetic application and see it scored immediately.

Acceptance criteria:

1. Name, role, city, motivation, and available hours are required.
2. The new record is evaluated by the same scoring module as seeded records.
3. The record persists only in browser local storage.
4. The UI states that real personal information must not be entered.

### R5 — Record a manual decision

As a program lead, I want to override a recommendation with a documented organizer decision.

Acceptance criteria:

1. Each record offers manual `Invite`, `Review`, and `Waitlist` controls.
2. The UI shows both recommendation and final decision after an override.
3. The exported evidence includes both values.

### R6 — Export an evidence snapshot

As a program lead, I want a JSON snapshot so I can review what the system decided and why.

Acceptance criteria:

1. Export contains generation time, rule version, visible metrics, and evaluated records.
2. Export contains scoring reasons and any manual decisions.
3. Export does not call an external service.

### R7 — Work on mobile and with assistive technology

Acceptance criteria:

1. The dashboard remains usable at 360px width.
2. Interactive controls have programmatic labels.
3. Keyboard focus is visible.
4. Status changes are announced through an ARIA live region.

### R8 — Live decision summary for screen-reader users

As an organizer using a screen reader, I want a concise, continuously updated summary of the current queue state so I can know how many applications are visible, what filter is active, and how decisions are distributed — without being interrupted by an announcement on every keystroke.

Acceptance criteria:

1. A visually-hidden ARIA live region with `role="status"` and `aria-live="polite"` reports the active filter, visible count, Invite/Review/Waitlist counts, and manual override count after the view settles.
2. The summary text is debounced so rapid filter or search changes produce at most one announcement after the user pauses, not one per keystroke.
3. When no applications match the active filter, the region announces the no-match state and the total queue size.
4. When the queue is empty, the region announces "Queue is empty."
5. The live region is never the only way to obtain this information; the same data is visible to sighted users in the metric cards and visible-count label.
6. The summary logic is a pure function with no DOM access, independently testable.

## Non-goals

- Production admissions, hiring, credit, healthcare, or other high-impact decisions
- Authentication or multi-user synchronization
- Uploading real attendee or applicant data
- Predictive demographic profiling

## Success measures

- A new reviewer can explain a recommendation in under 30 seconds.
- Tests cover score boundaries and missing optional data.
- The complete project runs without package installation.

