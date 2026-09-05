"""Media worker — consumes `media.uploaded`.

Claim-check pattern (ADR 0017): the event carries only the object key, never the
bytes. The worker streams the object from storage, transcodes with ffmpeg,
writes a thumbnail and the derived audio/video back, extracts the duration, and
updates the `recordings` row.

Media is uncapped in the demonstration version (ADR 0012); cost is watched via
egress dashboards and a kill switch, not a duration limit here.
"""

from __future__ import annotations

from typing import Any

import structlog

from lmf_workers.consumer import run

log = structlog.get_logger()

WORKER = "media-worker"
TOPIC = "media.uploaded"


def handle(event: dict[str, Any]) -> None:
    log.info(
        "media.received",
        recording_id=event.get("recording_id"),
        object_key=event.get("object_key"),
        content_type=event.get("content_type"),
        byte_size=event.get("byte_size"),
    )
    # TODO:
    #   1. object_store.presigned_download(object_key) -> stream
    #   2. ffmpeg: transcode to a web-friendly codec; make a thumbnail
    #   3. probe duration_seconds
    #   4. object_store.put(derived keys)
    #   5. UPDATE recordings SET status='ready', duration_seconds=? WHERE id=?
    #      (in the same tx: INSERT INTO processed_events)


def main() -> None:
    run(WORKER, TOPIC, handle)


if __name__ == "__main__":
    main()
