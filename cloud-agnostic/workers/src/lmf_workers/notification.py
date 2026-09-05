"""Notification worker — consumes `notification.raised`.

Classic decoupled consumer: a join request, a comment, a new recording, or a
song entering a band pool produces an event; this worker delivers it (in-app
inbox row now; email/push later).

Payloads carry user ids only, never personal data (PRD §10) — the worker looks
up display names itself at delivery time.
"""

from __future__ import annotations

from typing import Any

import structlog

from lmf_workers.consumer import run

log = structlog.get_logger()

WORKER = "notification-worker"
TOPIC = "notification.raised"


def handle(event: dict[str, Any]) -> None:
    log.info(
        "notification.received",
        kind=event.get("kind"),
        recipient_user_id=event.get("recipient_user_id"),
        subject_id=event.get("subject_id"),
    )
    # TODO:
    #   1. INSERT INTO notifications (recipient_user_id, kind, subject_id, ...)
    #   2. if the recipient has email/push enabled, enqueue that delivery


def main() -> None:
    run(WORKER, TOPIC, handle)


if __name__ == "__main__":
    main()
