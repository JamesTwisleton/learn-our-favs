-- Seed data (not schema). Instrument set carried over from the prototype
-- (docs/SALVAGE.md). IDs are fixed so environments agree.
INSERT INTO instruments (id, name, display_name, icon_emoji) VALUES
    ('0a9d1f7c-0001-4a00-8000-000000000001', 'guitar',  'Guitar',  '🎸'),
    ('0a9d1f7c-0002-4a00-8000-000000000002', 'piano',   'Piano',   '🎹'),
    ('0a9d1f7c-0003-4a00-8000-000000000003', 'bass',    'Bass',    '🎸'),
    ('0a9d1f7c-0004-4a00-8000-000000000004', 'ukulele', 'Ukulele', '🪕'),
    ('0a9d1f7c-0005-4a00-8000-000000000005', 'drums',   'Drums',   '🥁');
