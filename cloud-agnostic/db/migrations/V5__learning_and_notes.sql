-- V5 — Per-instrument learning state, note pointers, per-band per-song state.

-- Keyed on (user, song, instrument). No song-level difficulty column (ADR 0006).
CREATE TABLE learning_state (
    id             varchar(36) NOT NULL,
    user_id        varchar(36) NOT NULL,
    song_id        varchar(36) NOT NULL,
    instrument_id  varchar(36) NOT NULL,
    status         varchar(16) NOT NULL,
    updated_at     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_learning_state PRIMARY KEY (id),
    CONSTRAINT fk_ls_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_ls_song FOREIGN KEY (song_id) REFERENCES songs (id),
    CONSTRAINT fk_ls_instrument FOREIGN KEY (instrument_id) REFERENCES instruments (id),
    CONSTRAINT uq_ls_user_song_instrument UNIQUE (user_id, song_id, instrument_id),
    CONSTRAINT ck_ls_status CHECK (status IN ('want', 'learning', 'can_play'))
);

CREATE INDEX ix_ls_song_instrument ON learning_state (song_id, instrument_id);

-- Pointer to the band-note document in MongoDB. Content and author
-- anonymisation on member departure (ADR 0014) live in Mongo, not here.
CREATE TABLE note_docs (
    id            varchar(36)  NOT NULL,
    band_id       varchar(36)  NOT NULL,
    song_id       varchar(36),
    mongo_doc_id  varchar(64)  NOT NULL,
    title         varchar(200) NOT NULL,
    created_at    timestamptz  NOT NULL DEFAULT now(),
    updated_at    timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT pk_note_docs PRIMARY KEY (id),
    CONSTRAINT fk_note_docs_band FOREIGN KEY (band_id) REFERENCES bands (id),
    CONSTRAINT fk_note_docs_song FOREIGN KEY (song_id) REFERENCES songs (id),
    CONSTRAINT uq_note_docs_mongo UNIQUE (mongo_doc_id)
);

CREATE INDEX ix_note_docs_band ON note_docs (band_id);

-- Per-band, per-song working state (distinct from an individual's learning
-- state): what the band has collectively decided about a pool song.
CREATE TABLE band_song_state (
    id         varchar(36) NOT NULL,
    band_id    varchar(36) NOT NULL,
    song_id    varchar(36) NOT NULL,
    status     varchar(16) NOT NULL DEFAULT 'candidate',
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_band_song_state PRIMARY KEY (id),
    CONSTRAINT fk_bss_band FOREIGN KEY (band_id) REFERENCES bands (id),
    CONSTRAINT fk_bss_song FOREIGN KEY (song_id) REFERENCES songs (id),
    CONSTRAINT uq_bss_band_song UNIQUE (band_id, song_id),
    CONSTRAINT ck_bss_status
        CHECK (status IN ('candidate', 'learning', 'in_setlist', 'parked'))
);
