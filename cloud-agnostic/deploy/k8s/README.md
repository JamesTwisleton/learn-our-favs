# Kubernetes manifests

Kustomize. `base/` is cloud-neutral; `overlays/` patch per environment.

```
base/
  backend/           Deployment + Service + HPA + probes (/actuator/health/*)
  frontend/          Deployment + Service
  workers/           one Deployment per worker (media, ingestion, overlap, notification)
  kafka/             Strimzi Kafka + KafkaTopic resources (the 4 topics)
overlays/
  dev/               1 replica each; KAFKA_TOPIC_PREFIX = <branch>; shared DB/Kafka/OpenSearch
  prod-aws/          CLOUD_PROVIDER=aws; RDS + S3 + Cognito endpoints from Terraform
  prod-gcp/          CLOUD_PROVIDER=gcp; Spanner + GCS + Identity Platform endpoints
```

## Why Kubernetes at all

Honestly: the product does not need it (PRD §12 — Cloud Run or ECS Fargate would
do). It is here to exercise container orchestration and to keep the compute
layer identical on both clouds. The lean version uses Vercel and a single
managed container.

## Why Kafka on Kubernetes (Strimzi)

It is the one broker that behaves identically on EKS and GKE (ADR 0018). SNS/SQS
or Pub/Sub would be cheaper and easier on either cloud alone, but not both.

## PR previews (PRD §9)

`overlays/dev` gives each PR its own backend + frontend + worker pods, but
Postgres, Kafka, OpenSearch and object storage are **shared**. Consequences that
are designed for, not discovered:

- Migrations must be backwards-compatible ([`../../db/migrations/README.md`](../../db/migrations/README.md)).
- `KAFKA_TOPIC_PREFIX` = branch name, so topics and consumer groups do not
  collide between previews.

## State: skeleton

Directory layout and the prefix strategy are defined; the manifests themselves
are the next task (no cluster available in this environment to validate against).
