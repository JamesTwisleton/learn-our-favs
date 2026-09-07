-- Adds explicit FKs from band_memberships and join_requests to profiles so
-- PostgREST can resolve `select("... profiles(display_name)")` joins.
-- Both tables already reference auth.users(id) — this is a parallel constraint
-- against public.profiles(id), which itself references auth.users(id).

alter table public.band_memberships
    add constraint band_memberships_user_id_profile_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.join_requests
    add constraint join_requests_user_id_profile_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade;
