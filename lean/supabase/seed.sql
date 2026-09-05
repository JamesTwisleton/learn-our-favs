-- Applied by `supabase db reset`. Reference data only.
insert into public.instruments (name, display_name, icon_emoji) values
    ('guitar',  'Guitar',  '🎸'),
    ('piano',   'Piano',   '🎹'),
    ('bass',    'Bass',    '🎸'),
    ('ukulele', 'Ukulele', '🪕'),
    ('drums',   'Drums',   '🥁')
on conflict (name) do nothing;
