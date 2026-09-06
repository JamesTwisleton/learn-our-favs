# ADR 0007 — Band pool overlap is computed on read, not stored

**Status:** Accepted · 2026-09-05 · Survives in both versions

## Context

A song is "in the pool" when at least `overlap_threshold` distinct members like
it. Membership changes, the threshold changes, and likes are added and removed.
A materialised `pool_entry` table would need to be kept correct against all of
those.

## Decision

The pool is a **query**, not a table. Given a band: count distinct likers per
song from `song_like` joined to current `band_membership`, filter to
`count >= band.overlap_threshold`. In the demonstration version this is a SQL
view (`band_pool_v`); the read path hits it directly.

A `band.overlap.invalidated` domain event is published (broadcast to downstream
consumers) whenever band membership or the overlap threshold changes. This event
exists **only** to notify external systems (notifications, caches, the overlap
worker for denormalised read models if we ever add them) so they can refresh
their own snapshots — **not** because the pool itself needs rebuilding, since
it's always fresh on the next query.

## Consequences

- A song can drop out of the pool the instant someone leaves. This is visible to
  every member and is intended behaviour, not a glitch.
- No consistency bugs between a stored pool and the underlying likes.
- The view must stay within the RDS ∩ Spanner SQL dialect intersection
  ([ADR 0009](0009-state-inside-both-clouds.md)) — `count(distinct …)` and a `having` clause are fine in both.
- If read volume ever justifies it, a cached/denormalised projection can be
  added *behind* the same read interface without changing this decision.
