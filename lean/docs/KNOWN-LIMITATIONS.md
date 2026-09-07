# Known limitations — lean version

Honest list. None of these block local development; they matter before real
users.

## 1. Supabase Auth identity linking vs ADR 0003

ADR 0003 says: a second provider is attached to an account **only from an
authenticated session**, never automatically by matching email.

Supabase Auth's historical default is to **link identities that share a
confirmed email**. To satisfy ADR 0003 you must:

- Set **"Prevent automatic linking of identities with the same email"** (or the
  equivalent current setting) in the Supabase dashboard → Authentication →
  Settings, and
- Rely on `enable_manual_linking = true` (already in `config.toml`) plus a
  deliberate "Connect another provider" action in account settings (not yet
  built in the UI).

Until the account-settings UI exists, linking is simply not offered — which is
the safe state.

## 2. `band_notes` is a stub

The table and RLS exist; there is no editor UI and no realtime collaboration
wired up yet. The lean PRD's plan is Supabase Realtime on this table.

## 3. Recordings are not implemented

No upload, no storage bucket, no audio player. The lean PRD ships audio-only
with a duration cap (the one place lean diverges from the cloud-agnostic
version, ADR 0012). Bucket + RLS + a size/duration check are the next slice.

## 4. Cross-provider matching has no YouTube path yet

[`src/lib/matching.ts`](../src/lib/matching.ts) is complete and tested, but nothing calls it — there is no
"paste a YouTube link" UI. ADR 0010 (link-paste only, `videos.list` = 1 quota
unit) is the plan.

## 5. Difficulty ratings: table only

`difficulty_ratings` + RLS exist; no "rate this" prompt when a song moves to
`can_play`, and the dashboard does not yet show the aggregate. ADR 0011.

## 6. No tests beyond `matching.ts`

The RLS policies are the security-critical surface and deserve pgTAP or
Testcontainers coverage (a signed-in non-member gets 0 rows from `band_pool`,
etc.). Not yet written.

## 7. Spotify token refresh has no failure UI

If the refresh token is revoked, `getSpotifyAccessToken` throws and the
dashboard errors. It should degrade to "reconnect Spotify".
