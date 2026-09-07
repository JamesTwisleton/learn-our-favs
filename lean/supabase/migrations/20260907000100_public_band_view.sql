-- Allow anonymous users to see basic band info (name, slug, member count,
-- instruments). Pool, notes, join requests remain members-only.

drop policy if exists bands_read on public.bands;
create policy bands_read on public.bands
    for select to anon, authenticated using (true);

grant execute on function public.band_public_summary(uuid) to anon;
grant execute on function public.band_instruments(uuid) to anon;
