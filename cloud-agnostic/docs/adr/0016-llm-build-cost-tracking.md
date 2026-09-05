# ADR 0016 — Build-time LLM spend is estimated up front and tracked as a first-class metric

**Status:** Accepted · 2026-09-05 · Closes open decision #7 · Demonstration version (documentation practice)

## Context

This project is built with AI assistance. PRD §10 asks for an upfront estimate,
per-phase model tiering, and a running actual-vs-estimate tally in GBP. The
estimate was left "⬥ to be filled in before implementation begins".

## Decision

**Model tiering by task:**

| Task class | Tier | Rationale |
|---|---|---|
| Architecture, specification, ADRs, non-obvious debugging | High | Judgement-heavy; a wrong call here is expensive downstream |
| Feature implementation | Mixed | High for design, low for the typing |
| Scaffolding, boilerplate, mechanical refactors | Low | Pattern-following |
| Test authoring | Low | Structure is repetitive once the first is written |

**Upfront estimate (GBP):**

| Phase | Tier | Estimate | Actual |
|---|---|---|---|
| Specification & ADRs | High | 25 | — |
| Scaffolding & infra config | Low | 15 | — |
| Feature implementation | Mixed | 140 | — |
| Test authoring | Low | 40 | — |
| Debugging | High | 60 | — |
| **Total** | | **280** | — |

Assumptions: solo build over ~6–8 weeks part-time; prices as of 2026-09;
estimate excludes this foundation session.

**Tracking:** `docs/llm-cost-log.md` — one line per working session
(date, phase, tier, approx cost, note). Totalled per phase. The
estimate-vs-actual comparison is written up at the end; being wrong is an
acceptable and interesting outcome.

## Consequences

- The log is a manual discipline; if it lapses, that is itself a finding.
- The number is small enough that the *practice* is the artefact, not the spend.
