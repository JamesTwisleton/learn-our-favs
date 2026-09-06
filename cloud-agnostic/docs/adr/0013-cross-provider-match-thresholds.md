# ADR 0013 — Cross-provider song matching: auto ≥ 0.85, prompt 0.60–0.85, reject < 0.60

**Status:** Accepted · 2026-09-05 · Closes open decision #1 · Survives in both versions

## Context

Matching a song across providers:

- **Spotify → Spotify**: exact, via **ISRC** in standard track metadata.
- **Spotify → YouTube**: no shared identifier. A pasted YouTube video has a
  free-text title only.

We need thresholds that decide: same song (link automatically), maybe (ask the
user), or different (do not link).

## Decision

Compute a similarity score in `[0, 1]` between the Spotify track and the YouTube
video:

1. **Normalise** both sides: lowercase; strip punctuation; collapse whitespace;
   remove noise tokens — `official video`, `official audio`, `lyrics`,
   `lyric video`, `ft`, `feat`, `remastered`, `hd`, `4k`, `live`, `audio`,
   bracketed years.
2. Build the comparison string as `title + " " + primary_artist` on each side.
3. Score = **trigram (Dice) coefficient** over character trigrams of the two
   normalised strings.

### Trigram Similarity (Dice Coefficient)

A **trigram** is a sequence of 3 consecutive characters. For example, the string
`"hello"` yields trigrams: `"hel"`, `"ell"`, `"llo"`.

The **Dice coefficient** measures overlap between two sets. For trigram matching:

```
Dice(A, B) = 2 × |A ∩ B| / (|A| + |B|)
```

Where:
- `A` = set of trigrams from string 1
- `B` = set of trigrams from string 2
- `∩` = intersection (shared items)
- `| |` = cardinality (count/size of a set)
- `|A ∩ B|` = how many trigrams appear in both sets
- `|A| + |B|` = total trigrams across both sets
- Result is in `[0, 1]`: 1 = identical, 0 = no overlap

**Example:** `"hello world"` vs `"helo world"` (typo):
- Trigrams A: `{hel, ell, llo, lo , o w, wor, orl, rld}`
- Trigrams B: `{hel, elo, lo , o w, wor, orl, rld}` (8 vs 8)
- Intersection: 7 shared
- Score: `2 × 7 / 16 = 0.875` → auto-accept

Bands:

| Score | Action |
|---|---|
| ≥ 0.85 | Auto-accept — treat as the same song, enters the pool |
| 0.60 – 0.85 | Prompt: *"Your bandmate likes this — is it the same song?"* Pending; **not** in the pool until confirmed |
| < 0.60 | Reject — kept as a separate song |

The numbers are a **starting point**, tuned against real data post-launch. They
live in one config object, not scattered as literals.

## Consequences

- A pending match does not appear in the band pool (PRD §5).
- The normaliser's **noise-token list** (words stripped during normalization:
  `official video`, `official audio`, `lyrics`, `lyric video`, `ft`, `feat`,
  `remastered`, `hd`, `4k`, `live`, `audio`, bracketed years) is seeded from the
  old prototype's `songsterr.ts` (`SALVAGE.md`) and extended as edge cases arise.
- Trigram similarity is cheap and needs no external dependency; it is
  implemented in the backend and unit-tested against a fixture set of known
  pairs.
