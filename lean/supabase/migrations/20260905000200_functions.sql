-- Functions and triggers. Security-definer helpers let RLS policies ask
-- "is the caller a member of this band?" without recursive policy evaluation.

-- Create a profile row when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
    insert into public.profiles (id, display_name, avatar_url)
    values (
        new.id,
        coalesce(new.raw_user_meta_data ->> 'full_name',
                 new.raw_user_meta_data ->> 'name',
                 'New member'),
        new.raw_user_meta_data ->> 'avatar_url'
    );
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- Is the current user a member of this band? (ADR 0004 — resolved per request.)
create or replace function public.is_band_member(band uuid)
returns boolean
language sql
security definer set search_path = ''
stable
as $$
    select exists (
        select 1 from public.band_memberships m
        where m.band_id = band and m.user_id = auth.uid()
    );
$$;

-- The current user's role in this band, or null.
create or replace function public.band_role(band uuid)
returns text
language sql
security definer set search_path = ''
stable
as $$
    select m.role from public.band_memberships m
    where m.band_id = band and m.user_id = auth.uid();
$$;

-- Server-generated three-word slug (ADR 0008): adjective-adjective-animal,
-- retry on unique-constraint conflict, bounded attempts.
create or replace function public.generate_band_slug()
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
    adjectives text[] := array[
        'amber','bold','bright','brave','calm','clever','cosy','crisp','eager',
        'gentle','glad','golden','happy','hearty','jolly','keen','kind','lively',
        'lucky','mellow','merry','mighty','nimble','noble','plucky','quiet',
        'rapid','rosy','snug','spry','sunny','swift','tidy','tuneful','vivid',
        'witty','zesty','zippy'];
    animals text[] := array[
        'otter','badger','heron','puffin','marten','lynx','tapir','gecko',
        'finch','robin','wren','pika','quokka','lemur','dingo','civet','ibex',
        'serval','caracal','numbat','bilby','quoll','possum','wombat','koala',
        'kestrel','osprey','merlin','avocet','godwit','dunlin','turnstone',
        'redshank','teal'];
    candidate text;
    attempt int := 0;
begin
    loop
        attempt := attempt + 1;
        candidate :=
            adjectives[1 + floor(random() * array_length(adjectives, 1))::int] || '-' ||
            adjectives[1 + floor(random() * array_length(adjectives, 1))::int] || '-' ||
            animals[1 + floor(random() * array_length(animals, 1))::int];
        exit when not exists (select 1 from public.bands b where b.slug = candidate);
        if attempt >= 10 then
            candidate := candidate || '-' || substr(gen_random_uuid()::text, 1, 4);
            exit;
        end if;
    end loop;
    return candidate;
end;
$$;

-- Create a band and make the caller its owner, atomically.
create or replace function public.create_band(band_name text)
returns public.bands
language plpgsql
security definer set search_path = ''
as $$
declare
    new_band public.bands;
begin
    if auth.uid() is null then
        raise exception 'not authenticated';
    end if;
    insert into public.bands (slug, name)
    values (public.generate_band_slug(), band_name)
    returning * into new_band;

    insert into public.band_memberships (band_id, user_id, role)
    values (new_band.id, auth.uid(), 'owner');

    return new_band;
end;
$$;

-- The band pool, computed on read (ADR 0007). Caller must be a member.
-- Returns each song liked by at least the band's threshold of current members.
create or replace function public.band_pool(band uuid)
returns table (
    song_id      uuid,
    title        text,
    artist       text,
    album_art_url text,
    liker_count  bigint,
    member_count bigint
)
language plpgsql
security definer set search_path = ''
stable
as $$
declare
    threshold int;
    members   int;
begin
    if not public.is_band_member(band) then
        raise exception 'not a member of this band';
    end if;

    select b.overlap_threshold into threshold from public.bands b where b.id = band;
    select count(*) into members from public.band_memberships m where m.band_id = band;

    return query
    select s.id, s.title, s.artist, s.album_art_url,
           count(distinct sl.user_id) as liker_count,
           members::bigint            as member_count
    from public.band_memberships m
    join public.song_likes sl on sl.user_id = m.user_id
    join public.songs s       on s.id = sl.song_id
    where m.band_id = band
    group by s.id, s.title, s.artist, s.album_art_url
    having count(distinct sl.user_id) >= threshold
    order by liker_count desc, s.title;
end;
$$;

-- Pre-join visibility (PRD §4): any signed-in user may see a band's name,
-- member count, and the set of instruments its members play — but NOT who plays
-- what, the pool, notes, or recordings. Security-definer so it is not blocked by
-- the per-user RLS on instrument_proficiency / band_memberships.
create or replace function public.band_public_summary(band uuid)
returns table (slug text, name text, member_count bigint)
language sql
security definer set search_path = ''
stable
as $$
    select b.slug, b.name,
           (select count(*) from public.band_memberships m where m.band_id = b.id)
    from public.bands b
    where b.id = band;
$$;

create or replace function public.band_instruments(band uuid)
returns table (name text, display_name text, icon_emoji text, player_count bigint)
language sql
security definer set search_path = ''
stable
as $$
    select i.name, i.display_name, i.icon_emoji, count(distinct p.user_id)
    from public.band_memberships m
    join public.instrument_proficiency p on p.user_id = m.user_id
    join public.instruments i on i.id = p.instrument_id
    where m.band_id = band
    group by i.name, i.display_name, i.icon_emoji
    order by i.display_name;
$$;

-- When a member leaves, never leave the band ownerless: promote the
-- longest-serving remaining member (PRD §4 floor rules).
create or replace function public.handle_membership_removed()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
    remaining_owner int;
    heir uuid;
begin
    if old.role <> 'owner' then
        return old;
    end if;
    select count(*) into remaining_owner
    from public.band_memberships
    where band_id = old.band_id and role = 'owner';

    if remaining_owner = 0 then
        select user_id into heir
        from public.band_memberships
        where band_id = old.band_id
        order by joined_at asc
        limit 1;

        if heir is not null then
            update public.band_memberships
            set role = 'owner'
            where band_id = old.band_id and user_id = heir;
        end if;
    end if;
    return old;
end;
$$;

create trigger on_membership_removed
    after delete on public.band_memberships
    for each row execute function public.handle_membership_removed();
