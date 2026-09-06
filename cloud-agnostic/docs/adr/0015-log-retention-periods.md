# ADR 0015 — Log retention: application logs 30 days, audit/security logs 90 days

**Status:** Accepted · 2026-09-05 · Closes open decision #6 · Survives in both versions

## Context

UK GDPR sets no fixed retention period — each data type gets a period justified
against its purpose, then documented. Logs and telemetry were left as
"⬥ define — 30/90 days typical".

Two distinct purposes:

- **Application / operational logs** — request logs, worker logs, debug traces.
  Purpose: debugging and performance analysis. Value decays fast.
- **Audit / security logs** — authentication events, identity linking, role
  changes, staff-portal actions, erasure requests. Purpose: incident forensics,
  abuse investigation, demonstrating compliance.

## Decision

| Log class | Retention | Store |
|---|---|---|
| Application / operational | **30 days**, then deleted | CloudWatch / Google Cloud Logging, retention set by Terraform |
| Audit / security | **90 days**, then deleted | Separate log group (AWS) or sink (GCP: dedicated routing destination), write-restricted |
| Datadog (dashboards, cross-cloud) | 15 days indexed, matching its default | Datadog |

- The two classes are separated at emission — audit events go through a
  dedicated logger to a dedicated destination, never mixed with request logs.
- Retention is enforced by the platform (log-group retention policy), set in
  Terraform, not by a cron job we have to maintain.
- Personal data in logs is minimised: user IDs, not names or emails; no tokens;
  no request bodies for auth endpoints.

## Consequences

- An incident older than 90 days cannot be reconstructed from logs. Accepted.
- Audit logs are covered by the same erasure obligations, but user IDs (not
  personal data) keep them low-risk — same principle as Kafka payloads
  ([ADR 0017](0017-claim-check-for-media-events.md), PRD §10).
- Retention values live in Terraform variables, one place to change.
