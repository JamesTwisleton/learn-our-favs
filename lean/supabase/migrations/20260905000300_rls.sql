-- Row-level security. This is where band-scope authorisation lives in the lean
-- version (ADR 0004): policies, not application checks.

alter table public.profiles              enable row level security;
alter table public.instruments           enable row level security;
alter table public.instrument_proficiency enable row level security;
alter table public.songs                 enable row level security;
alter table public.song_likes            enable row level security;
alter table public.difficulty_ratings    enable row level security;
alter table public.bands                 enable row level security;
alter table public.band_memberships      enable row level security;
alter table public.join_requests         enable row level security;
alter table public.band_notes            enable row level security;
alter table public.spotify_connections   enable row level security;   -- deny-all to clients

-- Profiles: anyone signed in can read (needed for band member lists / pre-join
-- visibility); you may only edit your own.
create policy profiles_read on public.profiles
    for select to authenticated using (true);
create policy profiles_update_own on public.profiles
    for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Instruments: read-only reference data.
create policy instruments_read on public.instruments
    for select to authenticated using (true);

-- Instrument proficiency: your own only.
create policy prof_all_own on public.instrument_proficiency
    for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Songs: readable by any signed-in user; insertable by any signed-in user
-- (adding a song is part of liking it). No updates/deletes from clients.
create policy songs_read on public.songs
    for select to authenticated using (true);
create policy songs_insert on public.songs
    for insert to authenticated with check (true);

-- Likes: you manage your own. Band members may READ each other's likes so the
-- pool ("liked by 3 of 5") can name who — the pool function itself is
-- security-definer, this policy is for direct reads in the UI.
create policy likes_write_own on public.song_likes
    for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy likes_read_bandmates on public.song_likes
    for select to authenticated using (
        exists (
            select 1
            from public.band_memberships me
            join public.band_memberships them
              on them.band_id = me.band_id
            where me.user_id = auth.uid()
              and them.user_id = public.song_likes.user_id
        )
    );

-- Difficulty ratings: write your own; read all (aggregated in the UI, ADR 0011).
create policy ratings_read on public.difficulty_ratings
    for select to authenticated using (true);
create policy ratings_write_own on public.difficulty_ratings
    for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Bands: a signed-in user can read any band's row (pre-join visibility is the
-- name + member count + instruments, PRD §4). Pool, notes and recordings are
-- gated separately below. Bands are created via public.create_band(), so no
-- direct INSERT policy. Only owner/admin may UPDATE settings.
create policy bands_read on public.bands
    for select to authenticated using (true);
create policy bands_update_privileged on public.bands
    for update to authenticated
    using (public.band_role(id) in ('owner', 'admin'))
    with check (public.band_role(id) in ('owner', 'admin'));

-- Memberships: members see their band's roster; you can always see your own
-- rows; you may leave (delete your own row). Promotions/demotions go through a
-- privileged path (owner/admin) — enforced here for UPDATE.
create policy memberships_read on public.band_memberships
    for select to authenticated
    using (user_id = auth.uid() or public.is_band_member(band_id));
create policy memberships_leave on public.band_memberships
    for delete to authenticated using (user_id = auth.uid());
create policy memberships_manage on public.band_memberships
    for update to authenticated
    using (public.band_role(band_id) in ('owner', 'admin'))
    with check (public.band_role(band_id) in ('owner', 'admin'));

-- Join requests: you create and see your own; band admins see and decide those
-- for their band.
create policy joinreq_create_own on public.join_requests
    for insert to authenticated with check (user_id = auth.uid());
create policy joinreq_read on public.join_requests
    for select to authenticated
    using (user_id = auth.uid() or public.band_role(band_id) in ('owner', 'admin'));
create policy joinreq_decide on public.join_requests
    for update to authenticated
    using (public.band_role(band_id) in ('owner', 'admin'))
    with check (public.band_role(band_id) in ('owner', 'admin'));

-- Band notes: members only, for everything.
create policy notes_member_all on public.band_notes
    for all to authenticated
    using (public.is_band_member(band_id))
    with check (public.is_band_member(band_id));

-- No policies on public.spotify_connections: RLS is on and nothing matches, so
-- the anon/authenticated roles get zero rows. Only the service role (used by
-- server-side route handlers) bypasses RLS.
