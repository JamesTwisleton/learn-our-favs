# Learn My Faves

Musicians rarely learn the songs they most want to play, because working out
*which* of their favourites is achievable — and finding someone to play it with —
is tedious. Learn My Faves connects to a listening account, pulls a user's
most-played tracks, and lets them form small groups ("bands") around songs that
more than one member already loves.

This repository holds **two implementations of the same product**, kept
side by side on purpose.

| Folder | What it is | Status |
|---|---|---|
| [`lean/`](./lean) | The version intended to actually run: Next.js + Supabase, one platform, one bill. | Spec only ([PRD](./lean/learn-my-faves-prd-lean.md)) |
| [`cloud-agnostic/`](./cloud-agnostic) | The deliberately over-engineered version: dual-cloud IaC, event-driven services, federated identity, orchestration, observability. Built to exercise a specific set of engineering practices end to end. | In progress — foundation |

The two share a domain model and a set of product-and-safety decisions on
purpose, so the lean version is not a dead end. Where the `cloud-agnostic`
version is heavier than the problem demands, [its tradeoff register](./cloud-agnostic/docs/learn-my-faves-prd-demonstration.md#12-tradeoff-register)
says so plainly.

**New here? Read [`docs/UNDERSTANDING-THIS-REPO.md`](./docs/UNDERSTANDING-THIS-REPO.md)** —
the guided tour of both implementations and the decisions they share.

## History

An earlier prototype (Next.js + Prisma + NextAuth + Fly.io) lived at the repo
root and was taken offline for cost. It has been removed on this branch; the
parts worth keeping are catalogued in
[`cloud-agnostic/docs/SALVAGE.md`](./cloud-agnostic/docs/SALVAGE.md).

## Where to start reading

- Product: `lean/learn-my-faves-prd-lean.md` sections *Product* and *Stack*.
- Architecture rationale: `cloud-agnostic/docs/learn-my-faves-prd-demonstration.md`.
- Decisions already closed: `cloud-agnostic/docs/adr/`.
- Running the `cloud-agnostic` stack locally: `cloud-agnostic/README.md`.
