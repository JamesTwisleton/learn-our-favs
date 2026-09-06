# ADR 0018 — Kafka is the broker, chosen for identical behaviour on both clouds

**Status:** Accepted · 2026-09-05 · Demonstration version only

## Context

The event backbone (PRD §8) needs a broker. On AWS the easy choice is SNS/SQS or
EventBridge; on GCP it is Pub/Sub. Both are cheaper and lower-operational-effort
than running Kafka — *on their own cloud*.

The demonstration version's entire thesis is that the same application runs on
either cloud. A managed broker breaks that: the producer and consumer code, the
delivery semantics, and the ops model would all differ between deployments.

## Decision

**Apache Kafka**, run on Kubernetes (via the Strimzi operator) identically on
EKS and GKE. One producer API, one consumer API, one set of delivery semantics,
regardless of cloud.

- Topics (PRD §8):
  - `media.uploaded` — recording uploaded, ready for transcode/thumbnail worker
  - `catalogue.ingest.requested` — new song added to band catalogue, ready for
    metadata enrichment
  - `band.overlap.invalidated` — band membership or threshold changed; listeners
    can refresh cached pool state
  - `notification.raised` — event ready to deliver (email, push, etc.)
- Non-production: topic names and consumer group IDs are **prefixed by branch**
  so PR previews sharing the dev cluster do not steal each other's messages
  (PRD §9).
- Claim-check for media ([ADR 0017](0017-claim-check-for-media-events.md)); user IDs only, no personal data (PRD §10).

## Consequences

- We run a stateful distributed system we would not otherwise need — this is
  acknowledged over-engineering (PRD §12: "one background queue for media" is
  what would actually ship).
- Operational cost: broker upgrades, partition/consumer-lag monitoring, disk
  sizing. Datadog covers the dashboards.
- The lean version replaces this entirely with a Postgres queue table behind the
  same producer interface, so the swap is a documented, one-module change.
