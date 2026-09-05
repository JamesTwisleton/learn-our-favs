-- Learn My Faves — lean schema.
-- Portable Postgres (RDS-compatible): native uuid, text + CHECK for enums,
-- timestamptz everywhere. RLS and functions are in the next migration.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Identity: profile mirror of auth.users. Supabase Auth owns (provider, sub)
-- in auth.identities; we key our data on the user id, never on email
-- (ADR 0002). Auto-linking behaviour is a project setting — see lean/docs.
-- ---------------------------------------------------------------------------
create table public.profiles (
    id           uuid primary key references auth.users (id) on delete cascade,
    display_name text not null default 'New member',
    avatar_url   text,
    is_staff     boolean not null default false,   -- platform scope (ADR 0005)
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

-- Spotify refresh tokens. In `public` so PostgREST can reach it, but RLS is
-- enabled with NO policies for client roles — only the service role (used by
-- server-side route handlers) can read or write it.
create table public.spotify_connections (
    user_id       uuid primary key references auth.users (id) on delete cascade,
    refresh_token text not null,
    scope         text not null,
    updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Instruments
-- ---------------------------------------------------------------------------
create table public.instruments (
    id           uuid primary key default gen_random_uuid(),
    name         text not null unique,
    display_name text not null,
    icon_emoji   text not null
);

create table public.instrument_proficiency (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references auth.users (id) on delete cascade,
    instrument_id uuid not null references public.instruments (id) on delete cascade,
    skill_level   text not null check (skill_level in ('beginner', 'intermediate', 'advanced')),
    play_style    text check (play_style in
        ('chords','fingerpicking','strumming','lead','rhythm','accompaniment','full_score')),
    created_at    timestamptz not null default now(),
    unique (user_id, instrument_id)
);

-- ---------------------------------------------------------------------------
-- Songs and the one unified like (ADR 0007). A like is global per (user,song);
-- the band pool counts distinct likers among current members.
-- ---------------------------------------------------------------------------
create table public.songs (
    id               uuid primary key default gen_random_uuid(),
    title            text not null,
    artist           text not null,
    isrc             text unique,
    spotify_track_id text unique,
    youtube_video_id text unique,
    album_art_url    text,
    created_at       timestamptz not null default now()
);

create table public.song_likes (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid not null references auth.users (id) on delete cascade,
    song_id    uuid not null references public.songs (id) on delete cascade,
    origin     text not null check (origin in ('top_tracks', 'manual', 'search')),
    created_at timestamptz not null default now(),
    unique (user_id, song_id)
);
create index on public.song_likes (song_id);

create table public.difficulty_ratings (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references auth.users (id) on delete cascade,
    song_id       uuid not null references public.songs (id) on delete cascade,
    instrument_id uuid not null references public.instruments (id) on delete cascade,
    rating        smallint not null check (rating between 1 and 5),
    note          text,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now(),
    unique (user_id, song_id, instrument_id)
);
create index on public.difficulty_ratings (song_id, instrument_id);

-- ---------------------------------------------------------------------------
-- Bands. Slug is server-generated (ADR 0008). Role is read per request from
-- band_memberships (ADR 0004) — never stored in the JWT.
-- ---------------------------------------------------------------------------
create table public.bands (
    id                uuid primary key default gen_random_uuid(),
    slug              text not null unique,
    name              text not null,
    overlap_threshold smallint not null default 2 check (overlap_threshold >= 1),
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

create table public.band_memberships (
    id        uuid primary key default gen_random_uuid(),
    band_id   uuid not null references public.bands (id) on delete cascade,
    user_id   uuid not null references auth.users (id) on delete cascade,
    role      text not null default 'member' check (role in ('owner', 'admin', 'member')),
    joined_at timestamptz not null default now(),   -- drives owner succession
    unique (band_id, user_id)
);
create index on public.band_memberships (user_id);

create table public.join_requests (
    id                 uuid primary key default gen_random_uuid(),
    band_id            uuid not null references public.bands (id) on delete cascade,
    user_id            uuid not null references auth.users (id) on delete cascade,
    status             text not null default 'pending'
        check (status in ('pending', 'accepted', 'refused', 'withdrawn')),
    created_at         timestamptz not null default now(),
    decided_at         timestamptz,
    decided_by_user_id uuid references auth.users (id)
);
create index on public.join_requests (band_id, status);

-- Band notes: a JSONB column, not a second datastore (lean PRD "what is dropped").
create table public.band_notes (
    id         uuid primary key default gen_random_uuid(),
    band_id    uuid not null references public.bands (id) on delete cascade,
    song_id    uuid references public.songs (id) on delete set null,
    title      text not null,
    body       jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now(),
    updated_by uuid references auth.users (id),
    updated_by_label text   -- 'Former member' after departure (ADR 0014)
);
create index on public.band_notes (band_id);
