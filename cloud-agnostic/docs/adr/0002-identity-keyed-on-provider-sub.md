# ADR 0002 — Identities keyed on (provider, provider_user_id), never email

**Status:** Accepted · 2026-09-05 · Survives in both versions

## Context

A user can authenticate through several providers (Google, Facebook, Spotify,
Apple). We need a stable key that identifies "the same external account" across
sign-ins.

Email is the tempting key. It is also:

- **Mutable** — users change it at the provider; our copy silently goes stale.
- **Sometimes absent** — Apple private-relay addresses, phone-registered
  accounts, providers where the user declined the email scope.
- **Attacker-controllable** — a provider account can be created carrying any
  address, verified or not.

## Decision

`IDENTITY` is unique on `(provider, provider_user_id)`, where `provider_user_id`
is the OIDC `sub` claim. Email is stored on the identity row for display only
and is **never** part of a lookup, join, or uniqueness constraint.
`email_verified` is stored as received but is not a trust anchor on its own.

## Consequences

- Changing your Google email never affects sign-in.
- A provider that gives us no email is fully supported.
- Account linking cannot lean on email matching — see [ADR 0003](0003-no-auto-linking-by-email.md), which is the
  security-critical half of this decision.
- Display code must tolerate a null email.
