-- V6 — User-submitted difficulty ratings (ADR 0011). No algorithmic difficulty.

CREATE TABLE difficulty_ratings (
    id             varchar(36) NOT NULL,
    user_id        varchar(36) NOT NULL,
    song_id        varchar(36) NOT NULL,
    instrument_id  varchar(36) NOT NULL,
    rating         bigint      NOT NULL,   -- 1..5
    note           varchar(500),
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_difficulty_ratings PRIMARY KEY (id),
    CONSTRAINT fk_dr_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_dr_song FOREIGN KEY (song_id) REFERENCES songs (id),
    CONSTRAINT fk_dr_instrument FOREIGN KEY (instrument_id) REFERENCES instruments (id),
    CONSTRAINT uq_dr_user_song_instrument UNIQUE (user_id, song_id, instrument_id),
    CONSTRAINT ck_dr_rating CHECK (rating BETWEEN 1 AND 5)
);

CREATE INDEX ix_dr_song_instrument ON difficulty_ratings (song_id, instrument_id);
