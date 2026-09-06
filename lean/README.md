# Learn Our Favs — lean version

Next.js (App Router) + Supabase. One platform, one bill. This is the version
meant to actually run for real users. Spec: [`learn-our-favs-prd-lean.md`](./learn-our-favs-prd-lean.md).

For the *why* behind each decision, read [`docs/`](./docs) — start with
[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## Prerequisites

- Node 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`supabase --version`)
- Docker running (the CLI uses it for the local stack)
- A Spotify app: <https://developer.spotify.com/dashboard>
  - Add redirect URI `http://127.0.0.1:3000/auth/spotify/callback`

## Run it locally

```bash
cd lean
npm install

# 1. Start the local Supabase stack (Postgres, Auth, Studio, ...).
#    Applies everything in supabase/migrations + supabase/seed.sql.
npm run db:start        # = supabase start
#    ... prints an API URL, anon key, and service_role key. Keep them.

# 2. Wire up env.
cp .env.example .env.local
#    Fill in:
#      NEXT_PUBLIC_SUPABASE_ANON_KEY   <- "anon key" from step 1
#      SUPABASE_SERVICE_ROLE_KEY       <- "service_role key" from step 1
#      SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET  <- your Spotify app

# 3. Enable a sign-in provider. Easiest for local dev is GitHub or Google —
#    set enabled = true under [auth.external.<provider>] in supabase/config.toml
#    and export the client id/secret, then `supabase stop && supabase start`.
#    (Or use the email magic-link flow in Supabase Studio at :54323.)

# 4. Run the app.
npm run dev             # http://127.0.0.1:3000
```

Then: sign in → **Connect Spotify** on the dashboard → set an instrument or two
→ like some tracks → go to **Bands**, create one → open its `/b/<slug>` link in
another browser profile signed in as a second user → request to join → approve →
have both users like the same song → it appears in the pool.

## Reset the database

```bash
npm run db:reset        # drops, re-runs all migrations + seed
```

## Tests

```bash
npm test                # vitest — cross-provider matching (src/lib/matching.test.ts)
```

## Layout

```
supabase/migrations/   schema, functions/triggers, RLS — the authorisation model
supabase/seed.sql      reference data (instruments)
src/lib/supabase/      server / browser / service-role clients
src/lib/spotify*.ts    Spotify Web API client + token refresh (server side)
src/lib/matching.ts    cross-provider song matching (ADR 0013)
src/app/               App Router pages + server actions
middleware.ts          refreshes the Supabase session cookie
```

## Known limitations

See [`docs/KNOWN-LIMITATIONS.md`](./docs/KNOWN-LIMITATIONS.md) — in particular,
Supabase Auth's email-based identity linking needs a project setting to fully
satisfy ADR 0003.
