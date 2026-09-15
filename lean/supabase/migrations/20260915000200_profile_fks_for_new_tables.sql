-- PostgREST needs an explicit FK to public.profiles to resolve
-- `select("... profiles(display_name)")` joins. The new tables (and
-- difficulty_ratings which pre-existed) reference auth.users(id); this adds a
-- parallel constraint against public.profiles(id), following the pattern from
-- 20260907000200_membership_profile_fk.sql.

alter table public.song_comments
    add constraint song_comments_user_id_profile_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.recordings
    add constraint recordings_user_id_profile_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.difficulty_ratings
    add constraint difficulty_ratings_user_id_profile_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade;
