-- V1 — Identity. See ADR 0002 (keying), ADR 0003 (linking rules).
-- Dialect: RDS PostgreSQL ∩ Spanner PostgreSQL. See db/migrations/README.md.

CREATE TABLE users (
    id                 varchar(36)  NOT NULL,
    display_name       varchar(120) NOT NULL,
    avatar_object_key  varchar(512),
    is_staff           boolean      NOT NULL DEFAULT false,
    created_at         timestamptz  NOT NULL DEFAULT now(),
    updated_at         timestamptz  NOT NULL DEFAULT now(),
    deleted_at         timestamptz,
    CONSTRAINT pk_users PRIMARY KEY (id)
);

-- One row per external account. Unique on (provider, provider_user_id) = OIDC
-- sub. Email is display-only and is NEVER part of a lookup or constraint.
CREATE TABLE identities (
    id                varchar(36)  NOT NULL,
    user_id           varchar(36)  NOT NULL,
    provider          varchar(32)  NOT NULL,
    provider_user_id  varchar(255) NOT NULL,
    email             varchar(320),
    email_verified    boolean      NOT NULL DEFAULT false,
    created_at        timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT pk_identities PRIMARY KEY (id),
    CONSTRAINT fk_identities_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT uq_identities_provider_sub UNIQUE (provider, provider_user_id),
    CONSTRAINT ck_identities_provider
        CHECK (provider IN ('google', 'facebook', 'apple', 'spotify'))
);

CREATE INDEX ix_identities_user ON identities (user_id);

-- Reference to the Spotify refresh token held in the cloud secret store.
-- The token itself is never stored in the database (PRD §3.2).
CREATE TABLE spotify_links (
    user_id      varchar(36)  NOT NULL,
    secret_ref   varchar(512) NOT NULL,  -- Secrets Manager ARN / Secret Manager resource name
    scopes       varchar(512) NOT NULL,
    linked_at    timestamptz  NOT NULL DEFAULT now(),
    updated_at   timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT pk_spotify_links PRIMARY KEY (user_id),
    CONSTRAINT fk_spotify_links_user FOREIGN KEY (user_id) REFERENCES users (id)
);
