# ADR 0012 — Media is uncapped in the demonstration version, controlled by cost monitoring

**Status:** Accepted · 2026-09-05 · Closes open decision #4 · **Divergence: lean version differs**

## Context

Recordings are the main cost risk. Egress dominates — serving video out is what
costs money, not storing it. Options:

- **Audio-only + duration cap** — bounded cost, limited feature.
- **Video + hard duration cap** — full pipeline, bounded cost.
- **Uncapped + cost monitoring** — full pipeline, highest demonstration value,
  relies on observability to catch runaway spend.

The whole point of the demonstration version is to exercise the transcode
pipeline, feature tagging, egress dashboards, and billing alerts end to end.

## Decision

The **demonstration version runs media uncapped**: video and audio, no duration
cap, no audio-only mode. Control is via observability:

- Every media resource tagged by feature so egress is attributable
  (PRD §10).
- Datadog dashboard for media egress, separate from everything else.
- Billing alerts on both clouds with a hard threshold that pages.
- A documented kill switch: a feature flag that disables uploads and, if
  necessary, media serving, flipped from config.

The **lean version diverges**: it ships audio-only with a duration cap, because
its whole premise is affordability. This is the one deliberate place the two
versions differ on product behaviour, and both PRDs say so.

## Consequences

- The demonstration version could get expensive under real load. Accepted for
  its stated purpose; the kill switch and alerts are the mitigation.
- The transcode worker (`workers/media/`) handles both audio and video from day
  one.
- If this were ever pointed at real users, revert to the lean behaviour.
