# Salvage analysis — the removed prototype

The repo root previously held a Next.js + Prisma + NextAuth + Fly.io prototype
(commits up to `8b2b54d`). It was removed on the `reimplementation` branch. This
document records what was examined and what is being carried forward.

## Verdict summary

| Prototype asset | Verdict | Where it goes |
|---|---|---|
| Spotify Web API client (`src/lib/spotify.ts`) | **Keep as reference** | Port to `backend` Spotify client — endpoints, scopes, refresh flow, 100-track playlist batching are all correct |
| OAuth scopes list (`src/lib/auth.ts`) | **Keep** | `user-read-email user-top-read playlist-modify-public playlist-modify-private` — reused verbatim |
| Token-refresh logic (`spotify.ts` `refreshAccessToken`, `auth.ts` jwt callback) | **Keep as reference** | The "refresh when `expires_at` passed, rotate refresh token if returned" logic ports directly to the backend's per-user Spotify token store |
| String normalisation + similarity (`src/lib/songsterr.ts` lines 27–45) | **Keep, extend** | Seed for ADR 0013 cross-provider matching. `normalise()` is the base; noise-token stripping and trigram scoring are added |
| Songsterr difficulty → 1–N mapping (`songsterr.ts`) | **Keep as reference** | Informs the 1–5 user rating scale label mapping (ADR 0011) |
| Instrument taxonomy (`src/lib/constants.ts`, `prisma/seed.ts`) | **Keep** | guitar / piano / bass / ukulele / drums with emoji; skill levels; play styles — becomes seed data `db/seed/instruments.sql` |
| Time-range cache TTLs (`constants.ts` `CACHE_TTL`) | **Keep** | 24h / 3d / 7d for short/medium/long term → Redis TTLs for the ingestion cache |
| Difficulty tier thresholds + colours (`constants.ts`) | **Keep** | Easy/Medium/Hard banding for the aggregated rating display |
| `HOW_IT_WORKS.md` difficulty section | **Keep as source** | The "why every automated difficulty source fails" analysis is folded into ADR 0011 |
| Prisma schema (`prisma/schema.prisma`) | **Reference only** | Column choices inform `db/migrations`; the model itself is superseded (friends → bands, per-song difficulty → per-(user,song,instrument) rating) |
| Tab URL builders (`src/lib/tabs.ts`) | **Drop** | The app hosts no notation and does not send users to scrape targets; band notes hold pasted references instead |
| React components (`src/components/**`) | **Drop** | New design system with Storybook; different domain (bands, not friendships) |
| NextAuth setup | **Drop** | Replaced by Cognito / GCP Identity Platform + a self-minted session token (PRD §3.2). The *rules* are kept (ADR 0002, 0003); the mechanism is not |
| Prisma as ORM | **Drop** | Backend is Java; persistence is Flyway migrations + JPA/jOOQ |
| Fly.io deploy (`fly.toml`, `.github/workflows/fly-*.yml`, `server.js`, `Dockerfile`) | **Drop** | Replaced by Kubernetes + Terraform (PRD §6, §7) |
| `TopTracksCache` table | **Drop** | Becomes a Redis cache keyed by `(user, time_range)` with the salvaged TTLs |
| `Friendship` model | **Drop** | Superseded by bands and memberships |

## Concrete carry-overs (extracted, not just referenced)

These snippets are lifted into the new codebase during implementation:

1. **`normalise(str)`** — lowercase, strip non-alphanumeric, collapse whitespace.
   Base of the ADR 0013 normaliser.
2. **Noise-token list** — starting set: `official video`, `lyrics`, `ft`,
   `remastered`. Extended in ADR 0013 to include `official audio`,
   `lyric video`, `feat`, `hd`, `4k`, `live`, `audio`, bracketed years.
3. **Spotify endpoint map** — `GET /v1/me/top/tracks?time_range=&limit=`,
   `GET /v1/me`, `POST /v1/users/{id}/playlists`,
   `POST /v1/playlists/{id}/tracks` (batch 100), `POST /api/token` refresh with
   Basic auth. No rediscovery needed.
4. **Instrument seed data** — five instruments with display names and emoji.
5. **Cache TTLs** — `short_term` 24h, `medium_term` 3d, `long_term` 7d.

## Nothing security-sensitive was carried over verbatim

The prototype's NextAuth cookie config and JWT handling are **not** reused — the
new identity design (self-minted session token, no provider tokens in the domain
layer, per-request role resolution) is a clean implementation against ADRs
0002–0005.
