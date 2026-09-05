# Understanding this repository

A guided tour of both implementations. Read this first; it points everywhere
else.

## The one idea

Musicians want to play the songs they already love, with other people who love
them too. The app connects to Spotify, pulls your top tracks, and lets you form
a small **band** around songs more than one of you likes.

That is the whole product. Everything else is engineering.

## Two implementations, on purpose

| | `lean/` | `cloud-agnostic/` |
|---|---|---|
| Purpose | Ship it. Real users. Stay affordable. | Exercise a set of practices end to end. |
| Stack | Next.js + Supabase | Next.js + Java/Spring + Kafka + K8s + Terraform (AWS *and* GCP) + Mongo + OpenSearch + Redis |
| Build time | ~2 weeks | months |
| Would I run it? | Yes | No — and the PRD says so |

They **share a domain model and a set of product-and-safety decisions**, so the
lean version is not a dead end and the heavy version is not a different product.

## Read order

### Everyone (30 min)

1. `lean/learn-my-faves-prd-lean.md` — the short PRD. Product + stack + what was
   dropped and why.
2. `cloud-agnostic/docs/learn-my-faves-prd-demonstration.md` §12 — the tradeoff
   register. The honest "isn't this over-engineered? yes, here's what I'd ship".
3. `cloud-agnostic/docs/adr/README.md` — the decision index.

### The decisions that matter in both versions

These are product and safety, not infrastructure fashion. Same behaviour in
`lean/` and `cloud-agnostic/`:

| Decision | ADR | lean implementation | cloud-agnostic implementation |
|---|---|---|---|
| Identity keyed on `(provider, sub)`, never email | 0002 | Supabase Auth + our tables key on `user.id` | `identities` unique `(provider, provider_user_id)` |
| No auto-linking by email (account-takeover) | 0003 | project setting + manual linking | `IdentityLinkingService.resolveOnSignIn` |
| Band roles resolved per request | 0004 | RLS calls `band_role()` every query | `BandRoleResolver` + Redis |
| Band scope ≠ platform scope | 0005 | `band_memberships.role` vs `profiles.is_staff` | same split |
| Learning state per (user, song, instrument) | 0006 | 3-column keys | 3-column keys |
| Pool computed on read | 0007 | `band_pool()` function | `band_pool_v` view |
| Server-side slugs | 0008 | `generate_band_slug()` | backend + curated word list |
| User-rated difficulty, no algorithm | 0011 | `difficulty_ratings` | `difficulty_ratings` + `song_difficulty_v` |
| Cross-provider matching thresholds | 0013 | `src/lib/matching.ts` | `catalogue/matching/*.java` — same algorithm |
| Note authorship → "Former member" on departure | 0014 | `band_notes.updated_by_label` | Mongo anonymisation routine |

### Then dive into whichever version you care about

- **lean:** `lean/README.md` → `lean/docs/ARCHITECTURE.md` → `lean/docs/AUTHORISATION.md` → `lean/docs/REQUEST-FLOW.md`
- **cloud-agnostic:** `cloud-agnostic/README.md` → `cloud-agnostic/docs/READ-IN-THIS-ORDER.md` → `cloud-agnostic/docs/SYSTEM-WALKTHROUGH.md`

## Getting it running

Both have a "Run it locally" section in their README. Neither could be
end-to-end verified in the environment this foundation was built in (no Docker
daemon, no JDK, no Terraform), so each README has a **verification status** box
telling you exactly what was and was not checked.

Quick version:

```bash
# lean
cd lean && npm install && npm run db:start && cp .env.example .env.local
#   fill in keys from `supabase start` output + a Spotify app
npm run dev            # http://127.0.0.1:3000

# cloud-agnostic
cd cloud-agnostic && cp .env.example .env && docker compose up -d
docker compose run --rm flyway migrate
cd backend && mvn spring-boot:run          # :8080/api/health   (needs JDK 25)
cd ../frontend && npm install && npm run dev # :3001
```

## The prototype that was here before

An earlier Next.js + Prisma + Fly.io version lived at the repo root and was
removed on the `reimplementation` branch (cost). What was worth keeping —
the Spotify client, the string-matching seed, the instrument taxonomy — is
catalogued in `cloud-agnostic/docs/SALVAGE.md` and carried into both new
versions.
