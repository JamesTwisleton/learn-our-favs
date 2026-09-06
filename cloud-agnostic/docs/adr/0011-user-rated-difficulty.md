# ADR 0011 — Difficulty is user-submitted and aggregated, not algorithmic

**Status:** Accepted · 2026-09-05 · Closes open decision #2 · Survives in both versions

## Context

"How hard is this song on my instrument" is the question users most want
answered, and there is no good automated source:

- **Songsterr's** free difficulty API (`/a/ra/songs.json`) has been shut down —
  it 404s for every request. It was the original prototype's primary source.
- **Spotify audio features** (tempo, key, energy) are being deprecated and
  correlate weakly with playability — a slow song can have a brutal chord
  progression.
- **Scraping** Ultimate Guitar / Songsterr is fragile, legally grey, and slow at
  50 tracks per user per time range.

A bad rubric is worse than none: it looks authoritative and is wrong.

## Decision

v1 ships **user-submitted difficulty ratings, aggregated on read**:

- `difficulty_rating` keyed on `(user_id, song_id, instrument_id)`, integer
  1–5, optional short note.
- The displayed difficulty is the aggregate (median, with rating count shown) —
  computed on read, like the band pool ([ADR 0007](0007-overlap-computed-on-read.md)). No stored `songs.difficulty`.
- A user is prompted to rate a song when they move its learning state to
  `can_play` ([ADR 0006](0006-learning-state-per-user-song-instrument.md)) — the point at which they actually know.
- Sparse data is shown honestly: "2 ratings" not a false-precision average.

Non-goal for v1: any algorithmic or ML difficulty prediction. The rating table
is the training data if that is ever built.

## Consequences

- Adds one table and an aggregation view (dialect-safe: `median` is emulated
  with an ordered-set aggregate or a percentile function available in both
  dialects — see `db/migrations`).
- Cold-start: early users see few ratings. Acceptable — better than a confident
  wrong number.
- Moderation surface: free-text notes need the same treatment as band notes.
