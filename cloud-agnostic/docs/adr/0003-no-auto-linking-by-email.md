# ADR 0003 — No automatic identity linking; linking only from an authenticated session

**Status:** Accepted · 2026-09-05 · Survives in both versions

## Context

"One account, many providers" needs a linking rule. The naive rule is: if a new
provider identity carries an email that matches an existing user, attach it to
that user.

That rule is an account-takeover vulnerability. An attacker:

1. Creates a Facebook account with the victim's email address as its profile
   email.
2. Signs in to Learn Our Favs with it.
3. The app sees a matching email and attaches the new identity to the victim's
   account.
4. The attacker now has full access — bands, notes, linked Spotify tokens — with
   no password and no interaction from the victim.

A uniqueness constraint does not help: the two identity rows are legitimately
distinct `(provider, sub)` pairs. The flaw is in the *linking decision*, which
is application logic.

## Decision

- New provider identity, no existing match on `(provider, sub)` → **create a new
  user**. Never attach to an existing user by email or any other attribute.
- Attaching a second provider to an existing user happens **only** from an
  already-authenticated session: the user is signed in, clicks "Connect
  Facebook", completes the provider flow, and the new identity is attached to
  `current_user_id`.
- Email collision between two separate accounts is allowed and surfaced to the
  user as "you may already have an account" guidance — never auto-merged.

## Consequences

- A user who signed up with Google and later signs in with Facebook (same
  person, same email) gets *two* accounts until they explicitly link. Acceptable
  and reversible; silent takeover is not.
- Account merge is a deliberate, authenticated, confirmable action (post-v1).
- Integration tests assert that an unauthenticated sign-in with a colliding
  email produces a distinct `user_id`.
