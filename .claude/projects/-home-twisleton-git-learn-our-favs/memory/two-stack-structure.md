---
name: two-stack-structure
description: Repo holds two parallel implementations — lean/ and cloud-agnostic/ — of the same product
metadata:
  type: project
---

The `learn-our-favs` repo (branch `reimplementation`) is being rebuilt from two
PRDs into **two side-by-side implementations of the same product**:

- **`lean/`** — Next.js (App Router) + Supabase. The version meant to actually
  run. Authorisation = Postgres RLS. Runnable: `npm run db:start` + `npm run dev`.
- **`cloud-agnostic/`** — deliberately over-engineered: Java 25 Spring Boot API
  (Maven), Next.js frontend, 4 Python Kafka workers, dual-cloud Terraform + K8s,
  Mongo + OpenSearch + Redis. Runnable target: `docker compose up` + `mvn
  spring-boot:run` + `npm run dev` + workers.

The old root prototype (Next + Prisma + Fly.io) was deleted; salvage notes in
`cloud-agnostic/docs/SALVAGE.md`.

**Shared decisions** (ADRs in `cloud-agnostic/docs/adr/`, 0001–0018): all 8 open
⬥ decisions from the demo PRD are closed. Notably: identity keyed on
`(provider,sub)` never email; no auto-linking; roles resolved per request;
overlap computed on read; user-rated difficulty (no algorithm); YouTube
link-paste only; cross-provider match auto≥0.85 / prompt 0.60–0.85; media
uncapped in cloud-agnostic but audio-only+cap in lean (the one divergence).

**As of 2026-09-05 the foundation is built** (not committed — staged only).
Verified here: lean builds + `matching` tests pass; cloud-agnostic frontend
builds; workers parse. NOT verifiable in the build environment (no JDK, Docker
daemon, or Terraform): `mvn verify`, `docker compose up`, Flyway apply, tf.
Backlog for continuing: `cloud-agnostic/docs/SYSTEM-WALKTHROUGH.md` (ordered) and
`lean/docs/KNOWN-LIMITATIONS.md`.

**Guided docs to keep current:** `docs/UNDERSTANDING-THIS-REPO.md` (root tour),
per-stack `docs/` folders. User wants heavy, digestible docs to retain cognitive
ownership — keep explaining *why*, not just *what*.
