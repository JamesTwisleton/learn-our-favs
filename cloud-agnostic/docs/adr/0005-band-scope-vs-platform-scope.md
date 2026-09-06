# ADR 0005 — Band scope and platform scope are separate authorities

**Status:** Accepted · 2026-09-05 · Survives in both versions

## Context

There are two kinds of elevated permission:

- **Band scope** — `owner` / `admin` within a single band: set the overlap
  threshold, accept join requests, promote and demote *within that band*.
- **Platform scope** — `is_staff`: the admin portal, able to view, edit, and
  delete any user or band.

If these share a mechanism — one `role` field, one `is_admin` flag, one check —
a band owner can be mistaken for a site administrator, and deleting *their* band
becomes deleting *any* band.

## Decision

- Two independent representations: `band_membership.role` (per band, in the
  database) and `user.is_staff` (per user, also a token claim).
- Two independent enforcement paths. A band-scoped guard never consults
  `is_staff`; a platform-scoped guard never consults `band_membership`.
- The admin portal is a separate module with its own guard that checks
  `is_staff` and nothing else.

## Consequences

- A band owner has zero visibility into other bands.
- Staff act through the portal, not through band endpoints — staff actions are
  audit-logged separately ([ADR 0015](0015-log-retention-periods.md)).
- Tests assert that a band `owner` calling an admin-portal route gets 403.
