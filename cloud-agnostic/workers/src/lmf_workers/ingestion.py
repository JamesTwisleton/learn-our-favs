"""Ingestion worker — consumes `catalogue.ingest.requested`.

Pulls a user's top tracks from Spotify after they connect or refresh. Upstream
is rate-limited, so this path needs backoff and caching (Redis, keyed by
(user, time_range) with the salvaged TTLs: 24h / 3d / 7d — SALVAGE.md).

YouTube is link-paste only in v1 (ADR 0010): no `search` calls here, only
`videos.list` by id (1 quota unit), cached by video id.
"""

from __future__ import annotations

from typing import Any

import structlog

from lmf_workers.consumer import run

log = structlog.get_logger()

WORKER = "ingestion-worker"
TOPIC = "catalogue.ingest.requested"


def handle(event: dict[str, Any]) -> None:
    log.info(
        "ingest.received",
        user_id=event.get("user_id"),
        provider=event.get("provider"),
        time_range=event.get("time_range"),
    )
    # TODO:
    #   1. resolve Spotify access token from the secret store (via backend API)
    #   2. GET /me/top/tracks?time_range=&limit=50  (respect 429 + Retry-After)
    #   3. upsert songs + song_sources (match_method='isrc' when present)
    #   4. cache the raw response in Redis with the time-range TTL


def main() -> None:
    run(WORKER, TOPIC, handle)


if __name__ == "__main__":
    main()
