# ADR 0010 — YouTube ships in v1 as link-paste only, with no API search

**Status:** Accepted · 2026-09-05 · Closes open decision #8 · Survives in both versions

## Context

The YouTube Data API's default free quota is 10,000 units/day. A `search` call
costs **100 units** — about 100 searches per day across *all users combined*. A
`videos.list` lookup by video ID costs **1 unit**.

An unrestricted search feature would exhaust the quota within a handful of active
users and then fail for everyone.

## Decision

v1 supports YouTube through **pasted links only**:

- The user pastes a YouTube URL. We extract the video ID and call
  `videos.list` (1 unit) to resolve title, channel, and duration.
- Results are cached in Redis keyed by video ID (indefinite TTL — video metadata
  barely changes).
- **No `search` calls at all in v1.** No "search YouTube" box.
- Spotify remains the primary catalogue; YouTube is for songs not on Spotify or
  for a specific performance a bandmate wants to reference.

Revisit if we obtain a raised quota or move to a paid tier.

## Consequences

- The YouTube experience is deliberately degraded — "paste a link" is more
  friction than "search". Honest tradeoff; the alternative is an unreliable
  feature.
- Cross-provider matching ([ADR 0013](0013-cross-provider-match-thresholds.md)) still applies to pasted YouTube videos
  against Spotify likes.
- Quota headroom is large enough that a genuine spike stays inside the free
  tier.
