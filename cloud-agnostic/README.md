# Learn My Faves — cloud-agnostic version

The deliberately over-engineered implementation. Dual-cloud IaC, event-driven
services, federated identity, orchestration, observability. Built to exercise
those practices end to end — **not** the version you would ship (that is
[`../lean`](../lean)).

- **Why each piece exists:** [`docs/learn-my-faves-prd-demonstration.md`](./docs/learn-my-faves-prd-demonstration.md)
- **Decisions, closed:** [`docs/adr/`](./docs/adr)
- **Where to start reading the code:** [`docs/READ-IN-THIS-ORDER.md`](./docs/READ-IN-THIS-ORDER.md)
- **How it all fits together:** [`docs/SYSTEM-WALKTHROUGH.md`](./docs/SYSTEM-WALKTHROUGH.md)

## What runs today

| Piece | State | Verify |
|---|---|---|
| `db/migrations` | Complete v1 schema, RDS ∩ Spanner-PG dialect | `docker compose run --rm --profile tools flyway migrate` |
| `backend` (Spring Boot) | Boots; health, config, ports, matcher, identity-linking rule | `mvn spring-boot:run` → `/api/health` |
| `frontend` (Next.js) | Boots; shows backend health | `npm run dev` → `:3001` |
| `workers` (×4 Python) | Consumer loop + topic prefixing real; handlers are skeletons | `media-worker` etc. |
| `deploy/terraform`, `deploy/k8s` | Structure + interfaces + READMEs; no HCL/manifests yet | — |

## Local development

```bash
cd cloud-agnostic
cp .env.example .env

# 1. Infra: Postgres, Kafka, Redis, MongoDB, OpenSearch, MinIO
docker compose up -d

# 2. Schema
docker compose run --rm flyway migrate        # applies db/migrations

# 3. Backend (needs JDK 25 + Maven)
cd backend && mvn spring-boot:run             # :8080 — Flyway also runs here
#   http://localhost:8080/api/health

# 4. Frontend
cd ../frontend && npm install && npm run dev   # :3001

# 5. Workers (needs Python 3.12)
cd ../workers && python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
media-worker        # and ingestion-worker, overlap-worker, notification-worker
```

MinIO console: <http://localhost:9001> (`lmf` / `lmf-secret`).
OpenSearch: <http://localhost:9200>.

## Verification status

This foundation was built in an environment with **no JDK, Docker daemon, or
Terraform**. Verified here: the SQL is hand-reviewed against the dialect rules;
the frontend builds; the Python parses. **Not** verified here: `mvn verify`,
`docker compose up`, Flyway apply, and the Terraform. Run `.github/workflows/ci.yml`
locally or on a push to check those — the backend and schema jobs are the ones
to watch first.

## The honest summary

Everything in the tradeoff register (PRD §12) still holds: this is Kubernetes
for a problem that does not need Kubernetes, Spanner for a hobby app, Kafka
where one queue would do. The point is the practice, and the
[`../lean`](../lean) version is what real users would get.
