# ADR 0001 — Record architecture decisions

**Status:** Accepted · 2026-09-05

## Context

The demonstration PRD left eight decisions open (marked ⬥) and makes several
more that are easy to miss inside prose. Reviewers and interviewers need to see
*what* was decided, *why*, and *what was rejected* without re-reading a 400-line
spec.

## Decision

Every significant choice gets a short ADR in `cloud-agnostic/docs/adr/`,
numbered and append-only. Format: Context, Decision, Consequences, and —
where it matters — Alternatives rejected. Normal prose, not ASD-STE100
(controlled vocabulary flattens the nuance that makes a tradeoff worth reading).

Superseding, not editing: a reversed decision gets a new ADR that references the
old one, and the old one's status becomes `Superseded by NNNN`.

## Consequences

- The PRD links to ADRs instead of repeating rationale.
- A decision with no ADR is a decision nobody has to defend — treated as a smell.
- ADRs 0002–0008 capture choices the PRD already made; 0009–0016 close the
  eight open ⬥ decisions; 0017–0018 capture event-design choices.
