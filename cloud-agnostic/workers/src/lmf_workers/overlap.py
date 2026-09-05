"""Overlap worker — consumes `band.overlap.invalidated`.

The band pool is computed on read (ADR 0007), so this worker does NOT rebuild a
stored pool. It exists for fan-out reactions to a membership or threshold
change: bust the Redis pool cache for the band, raise `notification.raised` for
songs that just entered or left the pool, and (if a denormalised read model is
ever added) refresh it.
"""

from __future__ import annotations

from typing import Any

import structlog

from lmf_workers.consumer import run

log = structlog.get_logger()

WORKER = "overlap-worker"
TOPIC = "band.overlap.invalidated"


def handle(event: dict[str, Any]) -> None:
    log.info(
        "overlap.received",
        band_id=event.get("band_id"),
        reason=event.get("reason"),  # 'membership_changed' | 'threshold_changed'
    )
    # TODO:
    #   1. DEL redis pool:{band_id}
    #   2. diff previous vs current pool membership
    #   3. emit notification.raised for songs that entered the pool


def main() -> None:
    run(WORKER, TOPIC, handle)


if __name__ == "__main__":
    main()
