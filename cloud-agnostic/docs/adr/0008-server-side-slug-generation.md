# ADR 0008 — Band slugs are generated server-side from a curated word list

**Status:** Accepted · 2026-09-05 · Survives in both versions

## Context

Bands are addressed by a friendly three-word slug (`/b/silly-little-otter`).
Two failure modes to avoid: collisions (two bands, one slug) and embarrassment
(a random word generator eventually produces something offensive during a live
demo).

## Decision

- Slugs are generated **in the backend** (Spring Boot) from a **curated,
  profanity-screened word list** checked into the repo
  (`db/wordlist/`). Adjective + adjective + animal, roughly 200 × 200 × 200.
- Uniqueness is enforced by a database unique constraint with **retry on
  conflict** (generate, insert, on 23505 regenerate, bounded attempts).
- The word list is screened once at build time, not per generation.

## Consequences

- Client code never generates slugs — it cannot enforce uniqueness and cannot be
  trusted to screen words.
- ~8 million combinations is ample headroom; the birthday problem means
  collisions happen sooner than expected, but retry-on-conflict (regenerate on
  unique constraint violation) handles those tail-end collision cases.
- Adding words requires a reviewed PR against the word list, which keeps a human
  in the screening loop — no automated additions.
