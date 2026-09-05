"""A minimal, at-least-once Kafka consumer loop shared by all four workers.

Idempotency (PRD §8): each worker records processed event ids in
`processed_events` so a redelivery is a no-op. The check is stubbed here with an
in-process set; the real implementation writes to Postgres in the same
transaction as the side effect.
"""

from __future__ import annotations

import json
import signal
from collections.abc import Callable
from typing import Any

import structlog
from confluent_kafka import Consumer, KafkaError

from lmf_workers.config import Config

log = structlog.get_logger()

Handler = Callable[[dict[str, Any]], None]


def run(worker_name: str, logical_topic: str, handler: Handler) -> None:
    cfg = Config.from_env()
    topic = cfg.topic(logical_topic)

    consumer = Consumer(
        {
            "bootstrap.servers": cfg.bootstrap_servers,
            "group.id": cfg.group_id(worker_name),
            "auto.offset.reset": "earliest",
            "enable.auto.commit": False,
        }
    )
    consumer.subscribe([topic])
    log.info("worker.started", worker=worker_name, topic=topic)

    running = True

    def stop(*_: object) -> None:
        nonlocal running
        running = False

    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)

    seen: set[str] = set()  # TODO: replace with processed_events table

    try:
        while running:
            msg = consumer.poll(1.0)
            if msg is None:
                continue
            if msg.error():
                if msg.error().code() != KafkaError._PARTITION_EOF:
                    log.error("kafka.error", error=str(msg.error()))
                continue

            event = json.loads(msg.value())
            event_id = event.get("event_id") or f"{msg.topic()}:{msg.partition()}:{msg.offset()}"

            if event_id in seen:
                log.info("event.duplicate.skipped", event_id=event_id)
            else:
                handler(event)
                seen.add(event_id)

            consumer.commit(msg, asynchronous=False)
    finally:
        consumer.close()
        log.info("worker.stopped", worker=worker_name)
