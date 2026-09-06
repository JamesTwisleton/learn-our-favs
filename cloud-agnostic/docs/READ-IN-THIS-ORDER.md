# Read in this order

A path through the cloud-agnostic codebase that builds understanding without
backtracking. ~1 hour end to end.

## 1. The product and the honesty (20 min)

1. `learn-our-favs-prd-demonstration.md` §1–§3 — the product and the two flows
   that carry it (band pool overlap, identity linking).
2. `learn-our-favs-prd-demonstration.md` §12 — the tradeoff register. Read this
   early so every heavy choice later has context.
3. `docs/adr/README.md` — the index. Skim the one-liners.

## 2. The decisions that survive in both versions (15 min)

Read these ADRs in full — they are product and safety, not infrastructure:

- 0002 identity keyed on `(provider, sub)`
- 0003 no auto-linking (the account-takeover this prevents)
- 0004 band roles resolved per request
- 0005 band scope vs platform scope
- 0007 overlap computed on read
- 0013 cross-provider matching thresholds

Then the code that implements them:

- `backend/.../identity/IdentityLinkingService.java` — the ADR 0003 rule, in ~40 lines.
- `backend/.../catalogue/matching/` — `TitleNormalizer` → `TrigramSimilarity` → `SongMatcher`. Run `SongMatcherTest`.
- Compare with `../lean/src/lib/matching.ts` — same algorithm, same thresholds, different language.

## 3. The schema (10 min)

- `db/migrations/README.md` — the RDS ∩ Spanner dialect rules and *why* each one.
- `db/migrations/V1__identity.sql` and `V4__songs_and_likes.sql` — the two most
  load-bearing tables.
- `db/migrations/V10__views.sql` — `band_pool_v`, the "computed on read" pool.

## 4. Portability (10 min)

- `learn-our-favs-prd-demonstration.md` §7.
- ADR 0009 (state inside both clouds), 0018 (Kafka), 0017 (claim-check).
- `backend/.../platform/ports/package-info.java` — the rule that keeps the
  abstraction honest.
- `deploy/README.md` and `deploy/terraform/modules/README.md`.

## 5. Events (5 min)

- `learn-our-favs-prd-demonstration.md` §8.
- `backend/.../messaging/Topics.java` and `workers/README.md`.
- One worker end to end: `workers/src/lmf_workers/media.py` +
  `workers/src/lmf_workers/consumer.py`.

## Then: what to build next

`SYSTEM-WALKTHROUGH.md` ends with the ordered backlog. Short version:

1. JPA entities + repositories for `identity` (make `IdentityLinkingService` real).
2. Session-token mint + decode; turn `SecurityConfig` `.permitAll()` into `.authenticated()`.
3. `BandRoleResolver` impl (DB + Redis cache) and the band/like/pool REST slice.
4. Transactional outbox relay + wire the first real Kafka producer/consumer.
5. AWS `platform.aws` implementation; then GCP.
