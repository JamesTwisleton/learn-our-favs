# Demo mode

A "Try the demo — no sign-in" button on the landing page that signs the visitor
in as a shared demo account pre-loaded with rich data (songs, likes,
instruments, four bands, pending join requests, notes). Built so a stakeholder
can click one button and see every screen working with realistic content.

## What the visitor experiences

1. Lands on `/`.
2. Clicks **Try the demo — no sign-in** (under the Google sign-in button).
3. Browser POSTs to `/auth/demo`, is 303'd through a Supabase magic-link, and
   arrives at `/dashboard` signed in as `demo@learn-our-favs.app`.
4. From there, everything is the real app — the demo user is a normal
   `auth.users` row with a normal profile, likes, memberships. RLS runs
   unchanged.

## Why this shape

Considered three options (see conversation, 2026-09-15):

| Option | Complexity | Cross-visitor interference |
|---|---|---|
| **Auto-login as shared demo user** (chosen) | Low — one route, one form button, one cron | Yes — mitigated by hourly reset |
| Public read-only view of demo data | High — every mutation site needs gating + a "read-only" banner | No |
| Ephemeral guest session (clone seed per visitor) | Very high — clone seed data on entry, GC later | No |

For a stakeholder demo, "one button, everything works, occasionally resets"
beats a bespoke read-only mode.

## The pieces

### `POST /auth/demo` → verify → `/auth/demo-complete`

Two files:
- [`src/app/auth/demo/route.ts`](../src/app/auth/demo/route.ts) — POST handler.
- [`src/app/auth/demo-complete/page.tsx`](../src/app/auth/demo-complete/page.tsx) — client-side session setter.

**Flow**

1. Landing form POSTs to `/auth/demo`.
2. That route hits Supabase Auth admin REST
   (`POST /auth/v1/admin/generate_link`, `type: "magiclink"`) with
   `redirect_to = ${publicOrigin}/auth/demo-complete`, then 303s the browser
   to the returned `action_link`.
3. Supabase's `/auth/v1/verify` verifies the token and 302s the browser to
   `/auth/demo-complete#access_token=…&refresh_token=…` (implicit flow — the
   session tokens are in the **URL fragment**, not the query string, and are
   invisible to the server).
4. The `demo-complete` client component parses `window.location.hash`, calls
   `supabase.auth.setSession({ access_token, refresh_token })` (which the ssr
   browser client persists as cookies), then `window.location.replace('/dashboard')`.
5. `/dashboard` renders as the signed-in demo user.

**Gotchas discovered building this**

- The REST endpoint wants `redirect_to` at the **top level** of the body, not
  inside `options`. supabase-js sets `options.redirectTo` which is silently
  dropped — the response falls back to the project's `site_url`. This is why
  the demo route uses `fetch` directly instead of `admin.generateLink`.
- The redirect target must be in the project's `uri_allow_list` (Supabase
  dashboard → Authentication → URL Configuration). Prod is configured with
  `https://learn-our-favs.vercel.app/**` (wildcard) so any callback path
  matches.
- Magic-link verify uses **implicit flow (fragment)**, not PKCE (`?code=`),
  which is why we need a client component instead of reusing
  `/auth/callback` (that route uses `exchangeCodeForSession`).

### Reset — restore full baseline

[`src/app/api/demo/reset/route.ts`](../src/app/api/demo/reset/route.ts).

Exports both a `POST /api/demo/reset` handler (secret-gated) and a `resetDemo()`
function that `/auth/demo` calls **on every entry** so a new visitor always
starts from baseline, not from whatever the previous visitor left behind.

The reset:

1. Wipes demo user's `song_likes`, `difficulty_ratings`, `join_requests`,
   `instrument_proficiency`, `song_comments`, `recordings` (plus the storage
   objects for those recordings), and `band_memberships`.
2. Deletes any stray bands demo created during a tour (owner-only, not in the
   seeded whitelist, no remaining members after demo's membership is removed).
3. Restores:
   - Baseline instruments (guitar intermediate, piano beginner)
   - Likes on the first 25 songs by creation order
   - Memberships in the seeded bands (member/admin/owner as per the table above)
   - Pending join request `demo → The Basement Session`
   - Pending join request `Milo → Living Room Jam` (populates demo's owner-scoped approve/refuse UI)
   - `spotify_connections` row for demo (copied from ajtwisleton's) if missing

**Triggers**

| Trigger | Frequency |
|---|---|
| `/auth/demo` entry | Every demo login (best-effort, non-blocking — if the reset errors, sign-in still proceeds) |
| Vercel Cron `0 4 * * *` (daily @ 04:00 UTC) | Once daily. Belt-and-braces safety net — Vercel Hobby caps crons at one run per day; we'd bump to hourly on Pro |
| Manual: `curl -X POST … -H "Authorization: Bearer $CRON_SECRET"` | On demand |

Vercel injects `Authorization: Bearer $CRON_SECRET` on cron requests
automatically.

### `scripts/seed-demo.mjs` — one-off seed

[`scripts/seed-demo.mjs`](../scripts/seed-demo.mjs). Idempotent Node script that
creates the demo user + 4 fake auxiliary users (Milo, Sasha, Juno, Otis),
upserts songs from a Spotify top-tracks response at `/tmp/songs.json`, sets
instrument proficiencies, wires up likes with deliberate overlap patterns, and
creates the four demo bands.

Not tied into `db:reset` because it depends on live prod state (existing
`auth.users` rows for ajtwisleton and Rebecca) and on a runtime Spotify fetch.
Meant to be run once against the deployed project when standing the demo up.

```bash
cd lean
vercel env pull .env.production   # if you don't have it
# regenerate /tmp/songs.json from Spotify top-tracks first (see the script header)
node scripts/seed-demo.mjs
```

## Seeded content

### Users

| Email | Instruments | Role |
|---|---|---|
| `ajtwisleton@gmail.com` | Guitar (intermediate), Piano (beginner) | Real user |
| `rebeccalaurapadgham@gmail.com` | none set | Real user |
| `milo.demo@learn-our-favs.app` | Drums (advanced), Guitar (intermediate) | Fake |
| `sasha.demo@learn-our-favs.app` | Bass (intermediate), Piano (beginner) | Fake |
| `juno.demo@learn-our-favs.app` | Piano (advanced), Ukulele (intermediate) | Fake |
| `otis.demo@learn-our-favs.app` | Guitar (advanced), Drums (beginner) | Fake |
| `demo@learn-our-favs.app` | Guitar (intermediate), Piano (beginner) | Demo-mode target |

Fake user passwords are unrecoverable random UUIDs — they're only reachable via
`auth.admin.*` calls.

### Songs

40 tracks from ajtwisleton's Spotify all-time top-tracks (Vampire Weekend,
Magdalena Bay, Andrew Bird, Khruangbin, etc.). Upserted on `spotify_track_id`,
so re-running the seed is safe.

### Per-song content (in bands)

- **Comments** on the top 5 pool songs of Weekend Warriors (one per fake user)
  and the top 3 of Living Room Jam
- **Difficulty ratings** on the top 5 pool songs of Weekend Warriors (5 ratings
  each, across guitar / bass / piano)
- **Recordings** — 2-second placeholder tone WAVs on a few songs in Weekend
  Warriors and Living Room Jam. Real audio (a 440Hz sine wave and friends) so
  the `<audio>` player has something to play. Generated in-script; no binary
  assets in the repo.

### Spotify connection for demo

Demo user's `spotify_connections` row copies ajtwisleton's `refresh_token`, so
`/dashboard`'s **Top / Recent / Favourites / Search** tabs are populated
against ajtwisleton's real Spotify account. Any demo visitor sees ajtwisleton's
live listening. This is a deliberate trade — the alternative was mocking the
Spotify API for the demo user, which meant maintaining a separate code path.

### Bands

| Band | Threshold | Members | Owner | demo user's role |
|---|---|---|---|---|
| **Weekend Warriors** | 3 | 5 (aj, Milo, Sasha, Juno, demo) | ajtwisleton | Member |
| **Bedroom Studio Club** | 2 | 4 (Milo, aj, Sasha, demo) | Milo | Admin |
| **Piano Bar Nights** | 2 | 4 (Juno, aj, Rebecca, demo) | Juno | Member |
| **The Basement Session** | 2 | 3 (Otis, Sasha, Juno) | Otis | Not a member — has a pending request |
| **Living Room Jam** | 2 | 3 (demo, Otis, Sasha) | **demo** | Owner |
| **Studio 6 Collective** | 2 | 3 (Juno, Otis, Milo) | Juno | Not a member — no pending request (click "Request to join" to demo the flow) |

Overlap patterns are chosen so the pool at each band's threshold is non-empty
but not the full song list. The band roster covers every role the demo user
might have (owner, admin, member, non-member-with-pending, non-member-no-pending)
so every UI state is reachable in a tour.

### Pending join requests

- **Otis → Weekend Warriors** (visible to ajtwisleton as owner — demo the
  approve/refuse UI)
- **ajtwisleton → The Basement Session** (visible to ajtwisleton as "your
  request is pending" on that band page)
- **demo → The Basement Session** (visible to the demo user for the same demo)

### Band notes

Four `band_notes` rows across three bands (setlist, practice notes, demo track
ideas, residency plan). JSONB bodies as per the schema — no editor UI yet, but
they're visible to the RLS query path.

## Ops notes

- `CRON_SECRET` is set in Vercel production. If you rotate it, `vercel env rm`
  then `vercel env add`.
- The demo Supabase project is `qrhrcmcfgleuhattugpt` in eu-west-2. It
  auto-pauses when idle on the free tier — the first request after a pause
  takes ~60s to warm up. Any visitor click hitting `/auth/demo` will trigger
  the wake.
- Rate limit: Supabase's `admin.generateLink` has generous defaults but is not
  free. If demo traffic spikes, consider caching the action_link for a few
  seconds server-side.
