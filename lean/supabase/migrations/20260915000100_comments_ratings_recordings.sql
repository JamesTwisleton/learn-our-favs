-- Per-song commenting, per-band-song recordings, and a bandmates read
-- policy for instrument_proficiency (so the band page can list each
-- member's instruments next to their name). Difficulty ratings already
-- have a table (from the initial migration) — no schema change needed for
-- those.

-- ---------------------------------------------------------------------------
-- Instrument proficiency — let bandmates read each other's rows.
-- Mirrors the likes_read_bandmates pattern in the initial RLS. The existing
-- prof_all_own policy still governs writes.
-- ---------------------------------------------------------------------------
create policy prof_read_bandmates on public.instrument_proficiency
    for select to authenticated using (
        exists (
            select 1
            from public.band_memberships me
            join public.band_memberships them
              on them.band_id = me.band_id
            where me.user_id = auth.uid()
              and them.user_id = public.instrument_proficiency.user_id
        )
    );

-- ---------------------------------------------------------------------------
-- Comments: a band-member can leave text on a song *in the context of a band*.
-- Threading kept out of the schema — each row is a top-level comment. The
-- band scope is what gates visibility.
-- ---------------------------------------------------------------------------
create table public.song_comments (
    id         uuid primary key default gen_random_uuid(),
    band_id    uuid not null references public.bands (id) on delete cascade,
    song_id    uuid not null references public.songs (id) on delete cascade,
    user_id    uuid not null references auth.users (id) on delete cascade,
    body       text not null check (length(body) between 1 and 2000),
    created_at timestamptz not null default now()
);
create index on public.song_comments (band_id, song_id, created_at desc);

alter table public.song_comments enable row level security;

create policy comments_read_members on public.song_comments
    for select to authenticated
    using (public.is_band_member(band_id));

create policy comments_insert_members on public.song_comments
    for insert to authenticated
    with check (
        user_id = auth.uid()
        and public.is_band_member(band_id)
    );

create policy comments_delete_own on public.song_comments
    for delete to authenticated
    using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Recordings: per-band audio takes for a specific song. `storage_path` points
-- into the `recordings` Storage bucket. Duration cap enforced client-side
-- (PRD ADR 0012 — lean ships audio-only with a duration cap).
-- ---------------------------------------------------------------------------
create table public.recordings (
    id               uuid primary key default gen_random_uuid(),
    band_id          uuid not null references public.bands (id) on delete cascade,
    song_id          uuid references public.songs (id) on delete set null,
    user_id          uuid not null references auth.users (id) on delete cascade,
    title            text not null check (length(title) between 1 and 200),
    storage_path     text not null unique,
    mime_type        text not null,
    duration_seconds int,
    size_bytes       int,
    created_at       timestamptz not null default now()
);
create index on public.recordings (band_id, song_id, created_at desc);

alter table public.recordings enable row level security;

create policy recordings_read_members on public.recordings
    for select to authenticated
    using (public.is_band_member(band_id));

create policy recordings_insert_members on public.recordings
    for insert to authenticated
    with check (
        user_id = auth.uid()
        and public.is_band_member(band_id)
    );

create policy recordings_delete_own_or_admin on public.recordings
    for delete to authenticated
    using (
        user_id = auth.uid()
        or public.band_role(band_id) in ('owner', 'admin')
    );

-- ---------------------------------------------------------------------------
-- Storage bucket for recordings. Objects live at path `{band_id}/{recording_id}`.
-- The bucket is private (public = false); reads come via signed URLs minted
-- server-side after verifying band membership.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', false)
on conflict (id) do nothing;

-- Storage RLS: allow authenticated users to INSERT into the recordings bucket
-- only under a band-id prefix they're a member of. Reads go through service-
-- role-minted signed URLs, so no SELECT policy for the client role.
create policy recordings_bucket_insert on storage.objects
    for insert to authenticated
    with check (
        bucket_id = 'recordings'
        and public.is_band_member((split_part(name, '/', 1))::uuid)
    );

create policy recordings_bucket_delete on storage.objects
    for delete to authenticated
    using (
        bucket_id = 'recordings'
        and public.is_band_member((split_part(name, '/', 1))::uuid)
    );
