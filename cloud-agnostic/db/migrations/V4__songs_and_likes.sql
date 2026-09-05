-- V4 — Canonical songs, provider sources, cross-provider match prompts, likes.
-- See ADR 0013 (matching), ADR 0007 (pool from likes), ADR 0010 (YouTube).

-- One canonical song. ISRC, when known, is the exact key (ADR 0013).
CREATE TABLE songs (
    id                varchar(36)  NOT NULL,
    canonical_title   varchar(400) NOT NULL,
    canonical_artist  varchar(400) NOT NULL,
    isrc              varchar(15),
    created_at        timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT pk_songs PRIMARY KEY (id),
    CONSTRAINT uq_songs_isrc UNIQUE (isrc)   -- NULLs allowed and not deduped
);

-- A provider-specific reference to a song. match_status governs whether likes
-- on this source count toward a band pool.
CREATE TABLE song_sources (
    id               varchar(36)   NOT NULL,
    song_id          varchar(36)   NOT NULL,
    provider         varchar(16)   NOT NULL,   -- 'spotify' | 'youtube'
    provider_ref     varchar(64)   NOT NULL,   -- spotify track id | youtube video id
    url              varchar(512),
    raw_title        varchar(400)  NOT NULL,
    raw_artist       varchar(400),
    added_by_user_id varchar(36),
    match_method     varchar(16)   NOT NULL,   -- 'isrc' | 'trigram' | 'manual'
    match_score      numeric,                  -- 0.000–1.000, null for isrc/manual
    match_status     varchar(16)   NOT NULL DEFAULT 'confirmed',
    created_at       timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT pk_song_sources PRIMARY KEY (id),
    CONSTRAINT fk_song_sources_song FOREIGN KEY (song_id) REFERENCES songs (id),
    CONSTRAINT uq_song_sources_provider_ref UNIQUE (provider, provider_ref),
    CONSTRAINT ck_song_sources_provider CHECK (provider IN ('spotify', 'youtube')),
    CONSTRAINT ck_song_sources_method
        CHECK (match_method IN ('isrc', 'trigram', 'manual')),
    CONSTRAINT ck_song_sources_status
        CHECK (match_status IN ('confirmed', 'pending', 'rejected'))
);

CREATE INDEX ix_song_sources_song ON song_sources (song_id);

-- "Your bandmate likes this — is it the same song?" (ADR 0013, score 0.60–0.85).
-- While a prompt is pending, the candidate song does not enter that band's pool.
CREATE TABLE song_match_prompts (
    id                  varchar(36)  NOT NULL,
    song_source_id      varchar(36)  NOT NULL,
    band_id             varchar(36)  NOT NULL,
    candidate_song_id   varchar(36)  NOT NULL,
    score               numeric      NOT NULL,
    status              varchar(16)  NOT NULL DEFAULT 'pending',
    resolved_by_user_id varchar(36),
    created_at          timestamptz  NOT NULL DEFAULT now(),
    resolved_at         timestamptz,
    CONSTRAINT pk_song_match_prompts PRIMARY KEY (id),
    CONSTRAINT fk_smp_source FOREIGN KEY (song_source_id) REFERENCES song_sources (id),
    CONSTRAINT fk_smp_band FOREIGN KEY (band_id) REFERENCES bands (id),
    CONSTRAINT fk_smp_candidate FOREIGN KEY (candidate_song_id) REFERENCES songs (id),
    CONSTRAINT ck_smp_status CHECK (status IN ('pending', 'same', 'different'))
);

CREATE INDEX ix_smp_band_status ON song_match_prompts (band_id, status);

-- One unified thumbs-up per (user, song), however the song arrived (PRD §3.1).
-- Manual add counts as a like. Likes are global, not per band; the band pool
-- counts distinct likers among current members (ADR 0007).
CREATE TABLE song_likes (
    id         varchar(36) NOT NULL,
    user_id    varchar(36) NOT NULL,
    song_id    varchar(36) NOT NULL,
    origin     varchar(16) NOT NULL,   -- 'top_tracks' | 'manual' | 'search'
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_song_likes PRIMARY KEY (id),
    CONSTRAINT fk_song_likes_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_song_likes_song FOREIGN KEY (song_id) REFERENCES songs (id),
    CONSTRAINT uq_song_likes_user_song UNIQUE (user_id, song_id),
    CONSTRAINT ck_song_likes_origin
        CHECK (origin IN ('top_tracks', 'manual', 'search'))
);

CREATE INDEX ix_song_likes_song ON song_likes (song_id);
CREATE INDEX ix_song_likes_user ON song_likes (user_id);
