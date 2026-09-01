---
name: spec-to-ship
description: Turn a community event operations problem into requirements, design, implementation tasks, a measurable working slice, and an evidence plan. Use for meetups, workshops, hackathons, application review, check-in, speaker intake, follow-up, or event reporting.
---

# Community EventOps: Spec to Ship

Use this workflow when the user needs a community operations tool or process. Do not begin by choosing software. Begin with the operational decision and the evidence needed after the event.

## 1. Define the operational outcome

Capture:

- Who makes the decision?
- What action must become faster or more reliable?
- What counts as a completed outcome?
- Which metric is an application, approval, verified check-in, completion, or reported attendance?

Never merge unlike metrics into a single “reach” number.

## 2. Set data boundaries

- Prefer synthetic data while building and teaching.
- Identify every personal field and why it is necessary.
- Do not use patient, healthcare-client, financial, or confidential partner data.
- Document retention, deletion, and export expectations.
- Keep automated recommendations separate from human decisions.

Read `references/evidence-checklist.md` before defining the data model.

## 3. Create the spec

Produce three files:

1. `requirements.md` with users, user stories, acceptance criteria, non-goals, and success measures.
2. `design.md` with architecture, state model, decision rules, data boundaries, failure handling, and verification.
3. `tasks.md` with small, observable implementation tasks and explicit test steps.

Every acceptance criterion must be testable by a human or an automated check.

## 4. Ship a narrow working slice

Prioritize one end-to-end path such as:

- application → transparent recommendation → manual decision → evidence export
- speaker intake → routing → confirmation → follow-up
- registration → verified check-in → completion record

Avoid dashboards that display activity without supporting a real action.

## 5. Verify and report honestly

- Test edge cases and missing data.
- Label synthetic and reported figures.
- Record what failed, the workaround, and the product feedback.
- Measure completed workflows, returning users, and verified evidence rather than impressions.

## Deliverable format

Return:

- the operational problem in one sentence
- the three spec artifacts
- the working slice and verification result
- the evidence produced
- the next smallest useful iteration

