-- V2 — Instruments and per-user proficiency.
-- Seed rows for `instruments` are applied from db/seed/, not here.

CREATE TABLE instruments (
    id            varchar(36) NOT NULL,
    name          varchar(40) NOT NULL,   -- stable key: 'guitar', 'piano', ...
    display_name  varchar(60) NOT NULL,
    icon_emoji    varchar(16) NOT NULL,
    CONSTRAINT pk_instruments PRIMARY KEY (id),
    CONSTRAINT uq_instruments_name UNIQUE (name)
);

CREATE TABLE instrument_proficiency (
    id             varchar(36) NOT NULL,
    user_id        varchar(36) NOT NULL,
    instrument_id  varchar(36) NOT NULL,
    skill_level    varchar(16) NOT NULL,
    play_style     varchar(24),
    created_at     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_instrument_proficiency PRIMARY KEY (id),
    CONSTRAINT fk_prof_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_prof_instrument FOREIGN KEY (instrument_id) REFERENCES instruments (id),
    CONSTRAINT uq_prof_user_instrument UNIQUE (user_id, instrument_id),
    CONSTRAINT ck_prof_skill
        CHECK (skill_level IN ('beginner', 'intermediate', 'advanced')),
    CONSTRAINT ck_prof_style
        CHECK (play_style IS NULL OR play_style IN
            ('chords', 'fingerpicking', 'strumming', 'lead', 'rhythm',
             'accompaniment', 'full_score'))
);

CREATE INDEX ix_prof_user ON instrument_proficiency (user_id);
