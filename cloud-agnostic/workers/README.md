# Workers — Python Kafka consumers

Four consumers, one per topic (PRD §8). Each earns async treatment by being
slow, spiky, retry-worthy, or fan-out shaped.

| Command | Topic | Does |
|---|---|---|
| `media-worker` | `media.uploaded` | transcode, thumbnail, duration (ADR 0017) |
| `ingestion-worker` | `catalogue.ingest.requested` | pull top tracks, respect quotas (ADR 0010) |
| `overlap-worker` | `band.overlap.invalidated` | fan-out on membership/threshold change (ADR 0007) |
| `notification-worker` | `notification.raised` | deliver notifications |

## Run

```bash
cd cloud-agnostic
docker compose up -d kafka postgres redis minio

cd workers
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"

# each in its own shell
media-worker
ingestion-worker
overlap-worker
notification-worker
```

With `KAFKA_TOPIC_PREFIX=local` (the default), every worker subscribes to
`local.<topic>` and uses consumer group `local-<worker>` — so PR previews on the
shared dev cluster never steal each other's messages (PRD §9).

## Shared code

- `config.py` — env config + topic/group-id prefixing
- `consumer.py` — the at-least-once poll loop with idempotency (stubbed;
  `processed_events` table is the real store)

## State: skeletons

Every `handle()` logs the event and lists its `TODO` steps. No side effects
yet. The consumer loop, topic prefixing, and graceful shutdown are real.
