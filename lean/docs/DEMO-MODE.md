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

### `POST /auth/demo` — auto-login

[`src/app/auth/demo/route.ts`](../src/app/auth/demo/route.ts).

Uses the service-role Supabase admin client to generate a magic-link for
`demo@learn-our-favs.app` (`auth.admin.generateLink({ type: "magiclink" })`),
then 303s the browser to the returned `action_link`. Supabase's `/auth/v1/verify`
endpoint sets the session cookie and redirects to
`${publicOrigin}/auth/callback?next=/dashboard`, which is the same callback
Google sign-in uses.

No client-side JS, no interstitial. The visitor sees one redirect chain.

The demo user's redirect target must be in the project's `uri_allow_list`
(Supabase dashboard → Authentication → URL Configuration). Prod already has
`https://learn-our-favs.vercel.app/auth/callback` allowlisted.

### `POST /api/demo/reset` — hourly reset

[`src/app/api/demo/reset/route.ts`](../src/app/api/demo/reset/route.ts).

Gated by `Authorization: Bearer $CRON_SECRET`. Wipes the demo user's mutable
state — `song_likes`, `difficulty_ratings`, `join_requests`,
`instrument_proficiency` — then re-seeds:

- Baseline instruments (guitar intermediate, piano beginner)
- Likes on the first 25 songs by creation order (matches the seeded top-tracks
  order)
- One pending join-request into **The Basement Session**, so a demo visitor
  can see the "your request is pending" state without staging it themselves

Scheduled hourly via [`vercel.json`](../vercel.json):

```json
{ "crons": [ { "path": "/api/demo/reset", "schedule": "0 * * * *" } ] }
```

Vercel injects `Authorization: Bearer $CRON_SECRET` automatically. To trigger
manually:

```bash
curl -X POST https://learn-our-favs.vercel.app/api/demo/reset \
  -H "Authorization: Bearer $CRON_SECRET"
```

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

### Bands

| Band | Threshold | Members | Owner | ajtwisleton |
|---|---|---|---|---|
| **Weekend Warriors** | 3 | 5 (aj, Milo, Sasha, Juno, demo) | ajtwisleton | Owner |
| **Bedroom Studio Club** | 2 | 4 (Milo, aj, Sasha, demo) | Milo | Member |
| **Piano Bar Nights** | 2 | 4 (Juno, aj, Rebecca, demo) | Juno | Member |
| **The Basement Session** | 2 | 3 (Otis, Sasha, Juno) | Otis | Not a member — has a pending request |

Overlap patterns are chosen so the pool at each band's threshold is non-empty
but not the full song list.

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
