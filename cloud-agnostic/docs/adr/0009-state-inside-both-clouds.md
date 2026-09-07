# ADR 0009 — Stateful data lives inside both clouds (RDS on AWS, Spanner on GCP)

**Status:** Accepted · 2026-09-05 · Closes open decision #3 · **Demonstration version only**

## Context

The portability thesis is "the same app runs on AWS or GCP". Where the
relational database lives is the crux.

- **Inside both clouds** — RDS (PostgreSQL) on AWS, Spanner (PostgreSQL
  interface) on GCP. Keeps a genuine, hard demonstration: one schema and one
  query set compatible with both dialects.
- **Outside both clouds** — Neon or PlanetScale for relational, Cloudflare R2
  for objects. Makes portability nearly free, but deletes the demonstration
  entirely.

## Decision

State stays **inside both clouds**. RDS on AWS, Spanner on GCP. Object storage is
S3 on AWS and GCS on GCP behind a provider-agnostic interface (ADR follows the
same pattern as identity and secrets).

All SQL is written to the **intersection of the RDS PostgreSQL and Spanner
PostgreSQL dialects**:

- No `SERIAL` / identity columns — application-generated UUIDs (`uuid` stored as
  a fixed-width value; `gen_random_uuid()` is not assumed).
- Foreign keys declared, but the schema does not rely on `ON DELETE CASCADE`
  semantics differing — erasure is done explicitly in application code.
- No stored procedures, no triggers, no materialised views. Plain views only.
- `INTERLEAVE` / co-location is *not* used, so the schema also loads on plain
  PostgreSQL for local dev and Testcontainers.
- Migrations are backwards-compatible (ADR ties to §9 shared-DB previews).

## Consequences

- Local development and CI run against plain PostgreSQL 16; a Spanner
  PostgreSQL-dialect emulator job runs in CI to catch dialect drift.
- Some convenient PostgreSQL features are off the table. Documented in
  [`db/migrations/README.md`](../../db/migrations/README.md).
- The migration runbook (`docs/runbooks/cloud-migration.md`, TBD) is a real
  export → provision → import → cut over → destroy sequence.
- This is explicitly **not** what the lean version does — lean uses one managed
  Postgres and says so.
