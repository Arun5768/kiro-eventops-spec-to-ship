# Kiro product feedback from two real build sessions

## Context

These notes come from authenticated Kiro CLI sessions used to extend this repository on 2 September 2026. They are observations from actual work, not a feature wish list written before using the product.

## What worked especially well

Kiro's spec workflow turned a vague accessibility concern—two polite live regions may announce too close together—into five acceptance-criteria groups, a root-cause trace, named timing rules, an implementation checklist, and regression tests. Steering also kept the new scheduling logic pure, dependency-free, and separate from DOM code without repeating those constraints throughout the session.

The strongest outcome was traceability: the original friction note points to the bugfix spec; the spec points to `scheduleAnnouncement`; the tests map back to the acceptance criteria; and the validator makes the evidence chain discoverable.

## Friction 1: permission names across CLI engines

The first CLI v3 Spec-mode attempt used the classic-style trusted tool list (`read,grep,write,shell`). Kiro could read files, but its write and command operations were denied in non-interactive mode and advised using `--trust-all-tools`. Restarting with that mode worked.

Suggested improvement: when switching to v3, translate common classic permission aliases automatically or print the exact v3 capability names before starting the model run. That would avoid spending a model turn discovering a configuration mismatch.

## Friction 2: review correction interrupted by rate limiting

During a later documentation-and-boundary correction, Kiro returned `CREDIT_CONSUMPTION_RATE_EXCEEDED` with a five-minute retry interval after successfully applying and testing part of the correction. The local edits remained intact, which was good, but the remaining documentation work had to be completed after inspecting the partial state.

Suggested improvement: persist a visible checkpoint containing completed edits, remaining tasks, and the exact resume command whenever throttling interrupts Spec execution. That would make recovery feel like a normal paused workflow rather than an ambiguous failure.

## What I would teach in a workshop

1. Write the behavior contract before choosing the DOM implementation.
2. Put timing and priority rules in a pure function with explicit clock inputs.
3. Use steering to protect architectural boundaries.
4. Treat Kiro output as reviewable work: run tests, inspect edge cases, and feed concrete findings back into the same session.
5. Separate automated logic coverage, browser DOM checks, and real assistive-technology testing so evidence stays honest.
