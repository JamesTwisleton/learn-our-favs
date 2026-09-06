# Architecture Decision Records

Append-only, numbered, normal prose. Format and rules: [ADR 0001](./0001-record-architecture-decisions.md).

| # | Title | Closes ⬥ | Both versions? |
|---|---|---|---|
| [0001](./0001-record-architecture-decisions.md) | Record architecture decisions | — | — |
| [0002](./0002-identity-keyed-on-provider-sub.md) | Identities keyed on (provider, provider_user_id), never email | — | Yes |
| [0003](./0003-no-auto-linking-by-email.md) | No auto identity linking; only from an authenticated session | — | Yes |
| [0004](./0004-band-roles-resolved-per-request.md) | Band roles resolved per request, not in the token | — | Yes |
| [0005](./0005-band-scope-vs-platform-scope.md) | Band scope and platform scope are separate authorities | — | Yes |
| [0006](./0006-learning-state-per-user-song-instrument.md) | Learning state keyed on (user, song, instrument) | — | Yes |
| [0007](./0007-overlap-computed-on-read.md) | Band pool overlap computed on read, not stored | — | Yes |
| [0008](./0008-server-side-slug-generation.md) | Band slugs generated server-side from a curated list | — | Yes |
| [0009](./0009-state-inside-both-clouds.md) | State inside both clouds (RDS + Spanner) | #3 | Demo only |
| [0010](./0010-youtube-link-paste-only-v1.md) | YouTube in v1: link-paste only, no API search | #8 | Yes |
| [0011](./0011-user-rated-difficulty.md) | Difficulty is user-submitted and aggregated | #2 | Yes |
| [0012](./0012-media-uncapped-with-cost-monitoring.md) | Media uncapped, controlled by cost monitoring | #4 | Demo diverges |
| [0013](./0013-cross-provider-match-thresholds.md) | Cross-provider match thresholds (0.60 / 0.85) | #1 | Yes |
| [0014](./0014-note-authorship-on-member-departure.md) | Note authorship relabelled "Former member" on departure | #5 | Yes |
| [0015](./0015-log-retention-periods.md) | Log retention: app 30d, audit 90d | #6 | Yes |
| [0016](./0016-llm-build-cost-tracking.md) | Build-time LLM spend estimated and tracked | #7 | Demo (practice) |
| [0017](./0017-claim-check-for-media-events.md) | Media events carry an object key, not bytes | — | Demo only |
| [0018](./0018-kafka-for-cross-cloud-portability.md) | Kafka as the broker for identical cross-cloud behaviour | — | Demo only |

All eight ⬥ open decisions from PRD draft 0.1 are closed.
