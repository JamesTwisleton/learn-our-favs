-- V9 — Application audit trail. Retention 90 days (ADR 0015), enforced by a
-- scheduled anonymise/delete job. User IDs only, no personal data, no tokens.

CREATE TABLE audit_log (
    id             varchar(36) NOT NULL,
    actor_user_id  varchar(36),
    actor_kind     varchar(16) NOT NULL,   -- 'user' | 'staff' | 'system'
    action         varchar(80) NOT NULL,   -- 'identity.linked', 'band.role.changed', ...
    target_type    varchar(40) NOT NULL,
    target_id      varchar(36),
    detail         jsonb,
    created_at     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_audit_log PRIMARY KEY (id),
    CONSTRAINT ck_audit_actor_kind
        CHECK (actor_kind IN ('user', 'staff', 'system'))
);

CREATE INDEX ix_audit_created ON audit_log (created_at);
CREATE INDEX ix_audit_target ON audit_log (target_type, target_id);
