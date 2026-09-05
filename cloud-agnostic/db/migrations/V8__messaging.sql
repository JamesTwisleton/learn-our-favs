-- V8 — Transactional outbox feeding Kafka, and consumer idempotency.
-- Payloads carry user IDs only, never personal data (PRD §10, ADR 0017).

CREATE TABLE outbox (
    id             varchar(36)  NOT NULL,
    aggregate_type varchar(40)  NOT NULL,   -- 'recording', 'band', 'catalogue', ...
    aggregate_id   varchar(36)  NOT NULL,
    topic          varchar(80)  NOT NULL,   -- 'media.uploaded', 'band.overlap.invalidated', ...
    payload        jsonb        NOT NULL,
    created_at     timestamptz  NOT NULL DEFAULT now(),
    published_at   timestamptz,
    attempts       bigint       NOT NULL DEFAULT 0,
    CONSTRAINT pk_outbox PRIMARY KEY (id),
    CONSTRAINT ck_outbox_topic CHECK (topic IN (
        'media.uploaded',
        'catalogue.ingest.requested',
        'band.overlap.invalidated',
        'notification.raised'
    ))
);

-- Relay polls unpublished rows in creation order.
CREATE INDEX ix_outbox_unpublished ON outbox (created_at);

-- A consumer records each event id it has fully processed, so redelivery is a
-- no-op (at-least-once delivery).
CREATE TABLE processed_events (
    event_id     varchar(64) NOT NULL,
    consumer     varchar(60) NOT NULL,
    processed_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_processed_events PRIMARY KEY (event_id, consumer)
);
