# ADR 0004 — Band roles resolved per request, never baked into the session token

**Status:** Accepted · 2026-09-05 · Survives in both versions

## Context

The session token needs a claim set. Band membership and role
(`owner` / `admin` / `member`) are authorisation inputs — should they be claims?

Band membership is volatile: people join, get promoted, get demoted, leave, and
ownership auto-transfers when an owner departs. A role encoded in a JWT is:

- **Stale** the moment anything changes, until the token expires.
- **Not revocable** before expiry — a demoted admin keeps admin rights for the
  token lifetime.

## Decision

- The session token carries **stable identity only**: `user_id`, `is_staff`,
  issue/expiry. Nothing band-scoped.
- Band role is resolved **per request** from the relational database, keyed on
  `(band_id, user_id)`.
- The lookup result is cached in Redis with a short TTL and an explicit
  invalidation on any membership write (`band.overlap.invalidated` also clears
  it).

## Consequences

- A demotion takes effect on the next request, not the next login.
- Every band-scoped endpoint does one cheap cache-backed lookup. Acceptable.
- The lean version reaches the same outcome with Postgres row-level security
  policies instead of an application-layer check.
- Platform scope (`is_staff`) *is* in the token because it is rare, slow-moving,
  and administered out of band — see [ADR 0005](0005-band-scope-vs-platform-scope.md).
