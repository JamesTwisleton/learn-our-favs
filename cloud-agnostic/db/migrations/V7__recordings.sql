-- V7 — Recordings and timestamped feedback. Claim-check upload (ADR 0017):
-- the file goes straight to object storage; this row holds only the key.

CREATE TABLE recordings (
    id                varchar(36)  NOT NULL,
    band_id           varchar(36)  NOT NULL,
    song_id           varchar(36),
    uploader_user_id  varchar(36),
    object_key        varchar(512) NOT NULL,
    content_type      varchar(80)  NOT NULL,
    byte_size         bigint       NOT NULL,
    duration_seconds  bigint,
    status            varchar(16)  NOT NULL DEFAULT 'uploaded',
    created_at        timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT pk_recordings PRIMARY KEY (id),
    CONSTRAINT fk_recordings_band FOREIGN KEY (band_id) REFERENCES bands (id),
    CONSTRAINT fk_recordings_song FOREIGN KEY (song_id) REFERENCES songs (id),
    CONSTRAINT ck_recordings_status
        CHECK (status IN ('uploaded', 'processing', 'ready', 'failed'))
);

CREATE INDEX ix_recordings_band ON recordings (band_id);

-- author_user_id is nulled and author_label set to 'Former member' when the
-- author leaves the band (ADR 0014).
CREATE TABLE timestamped_comments (
    id                varchar(36)  NOT NULL,
    recording_id      varchar(36)  NOT NULL,
    author_user_id    varchar(36),
    author_label      varchar(60),
    position_seconds  bigint       NOT NULL,
    body              varchar(2000) NOT NULL,
    created_at        timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT pk_timestamped_comments PRIMARY KEY (id),
    CONSTRAINT fk_tc_recording FOREIGN KEY (recording_id) REFERENCES recordings (id),
    CONSTRAINT ck_tc_author
        CHECK (author_user_id IS NOT NULL OR author_label IS NOT NULL)
);

CREATE INDEX ix_tc_recording ON timestamped_comments (recording_id);
