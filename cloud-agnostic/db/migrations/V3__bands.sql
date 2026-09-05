-- V3 — Bands, memberships, join requests. See ADR 0004, 0005, 0007, 0008.

CREATE TABLE bands (
    id                 varchar(36)  NOT NULL,
    slug               varchar(80)  NOT NULL,   -- server-generated, 3 words (ADR 0008)
    name               varchar(120) NOT NULL,
    overlap_threshold  bigint       NOT NULL DEFAULT 2,
    created_at         timestamptz  NOT NULL DEFAULT now(),
    updated_at         timestamptz  NOT NULL DEFAULT now(),
    deleted_at         timestamptz,
    CONSTRAINT pk_bands PRIMARY KEY (id),
    CONSTRAINT uq_bands_slug UNIQUE (slug),
    CONSTRAINT ck_bands_threshold CHECK (overlap_threshold >= 1)
);

-- role is resolved per request from this table (ADR 0004); never a token claim.
-- joined_at drives automatic owner succession (PRD §4 floor rules).
CREATE TABLE band_memberships (
    id          varchar(36) NOT NULL,
    band_id     varchar(36) NOT NULL,
    user_id     varchar(36) NOT NULL,
    role        varchar(16) NOT NULL DEFAULT 'member',
    joined_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_band_memberships PRIMARY KEY (id),
    CONSTRAINT fk_membership_band FOREIGN KEY (band_id) REFERENCES bands (id),
    CONSTRAINT fk_membership_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT uq_membership_band_user UNIQUE (band_id, user_id),
    CONSTRAINT ck_membership_role CHECK (role IN ('owner', 'admin', 'member'))
);

CREATE INDEX ix_membership_user ON band_memberships (user_id);
CREATE INDEX ix_membership_band ON band_memberships (band_id);

CREATE TABLE join_requests (
    id                  varchar(36) NOT NULL,
    band_id             varchar(36) NOT NULL,
    user_id             varchar(36) NOT NULL,
    status              varchar(16) NOT NULL DEFAULT 'pending',
    created_at          timestamptz NOT NULL DEFAULT now(),
    decided_at          timestamptz,
    decided_by_user_id  varchar(36),
    CONSTRAINT pk_join_requests PRIMARY KEY (id),
    CONSTRAINT fk_joinreq_band FOREIGN KEY (band_id) REFERENCES bands (id),
    CONSTRAINT fk_joinreq_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT ck_joinreq_status
        CHECK (status IN ('pending', 'accepted', 'refused', 'withdrawn'))
);

-- Application enforces "at most one pending request per (band, user)".
CREATE INDEX ix_joinreq_band_status ON join_requests (band_id, status);
