# Authorisation in the lean version

All authorisation is **row-level security (RLS) in Postgres**. The app sends the
signed-in user's JWT with every query; Postgres decides what rows come back and
which writes are allowed. If the app has a bug and asks for the wrong data, the
database still says no.

## The building blocks

Two `SECURITY DEFINER` functions (they run with the definer's rights, so they
can see `band_memberships` regardless of the caller's RLS):

```sql
is_band_member(band uuid) -> boolean   -- is auth.uid() a member?
band_role(band uuid)      -> text      -- 'owner' | 'admin' | 'member' | null
```

Every band-scoped policy is written in terms of these. Example — who can change
a band's settings:

```sql
create policy bands_update_privileged on public.bands
    for update to authenticated
    using (public.band_role(id) in ('owner', 'admin'))
    with check (public.band_role(id) in ('owner', 'admin'));
```

## The policy map

| Table | Read | Write |
|---|---|---|
| `profiles` | any signed-in user (needed for member lists) | own row only |
| `instruments` | any signed-in user | — (reference data) |
| `instrument_proficiency` | own rows only | own rows only |
| `songs` | any signed-in user | insert only (adding a song = part of liking it) |
| `song_likes` | own rows + **bandmates'** rows (so the pool can say "liked by X") | own rows only |
| `difficulty_ratings` | all (aggregated in UI) | own rows only |
| `bands` | any signed-in user (pre-join visibility) | owner/admin only |
| `band_memberships` | own rows + fellow members | leave = delete own row; promote/demote = owner/admin |
| `join_requests` | own + band admins | create = own; decide = band admins |
| `band_notes` | members only | members only |
| `spotify_connections` | **nobody** (no policy) — service role only | same |

## Why `spotify_connections` has no policy

RLS is enabled, and there is no policy that matches the `authenticated` role, so
a normal query returns zero rows. Only the `service_role` key — used only in
server route handlers (`/auth/spotify/callback`, [`src/lib/spotify-server.ts`](../src/lib/spotify-server.ts)) —
bypasses RLS and can touch refresh tokens. The browser can never read them.

## The pre-join boundary (PRD §4)

A non-member visiting `/b/<slug>` can see the band name, member count, and the
set of instruments played — and nothing else. This is enforced by:

- `bands` read policy allows reading the row (name, slug, threshold).
- `band_public_summary(band)` and `band_instruments(band)` are `SECURITY
  DEFINER` and return only aggregates — never who plays what, never the pool.
- `band_pool()`, `band_notes` policy, etc. all check `is_band_member()` first
  and raise / return nothing for non-members.

## Owner succession

`band_memberships` has an `AFTER DELETE` trigger (`handle_membership_removed`).
If the row removed was the last `owner`, it promotes the member with the
earliest `joined_at`. A band is never left ownerless (PRD §4 floor rules).
