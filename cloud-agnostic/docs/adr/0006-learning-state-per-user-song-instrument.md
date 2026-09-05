# ADR 0006 — Learning state is keyed on (user, song, instrument)

**Status:** Accepted · 2026-09-05 · Survives in both versions

## Context

"How far along is this song" is a per-person, per-instrument fact. Someone can
already play *Wonderwall* on guitar while learning it on piano. The tempting
simplification is a `songs.difficulty` column or a `(user, song)` learning
state.

## Decision

`LEARNING_STATE` is keyed on `(user_id, song_id, instrument_id)` with a status
enum `want | learning | can_play`. There is no song-level difficulty column;
difficulty is a separate, aggregated, user-submitted signal (ADR 0011) and is
also per instrument.

## Consequences

- The dashboard shows per-instrument progress.
- The band pool can answer "who can already play this, on what".
- Slightly more rows and a three-column key everywhere learning state is
  touched. Worth it — the alternative is wrong, not just smaller.
