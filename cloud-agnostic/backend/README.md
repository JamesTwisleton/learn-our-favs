# Backend — Java 25 Spring Boot

The API for the cloud-agnostic version. Maven build (`pom.xml`).

## Prerequisites

- JDK 25 (`java -version`)
- Maven 3.9+ (`mvn -v`) — or generate a wrapper: `mvn -N wrapper:wrapper`
- The docker-compose stack from [`../docker-compose.yml`](../docker-compose.yml) running (Postgres,
  Kafka, Redis, Mongo, OpenSearch, MinIO)

## Run

```bash
cd cloud-agnostic
docker compose up -d                       # infra

cd backend
cp ../.env.example .env                     # or export the vars
mvn spring-boot:run
# Flyway applies ../db/migrations on startup.
# http://localhost:8080/api/health
# http://localhost:8080/actuator/health
```

## Test

```bash
mvn verify        # unit + Testcontainers integration tests
```

`SongMatcherTest` (`src/test/java/.../catalogue/matching`) pins the ADR 0013
matching thresholds and needs no containers.

## What is here now (foundation)

| Package | Purpose | State |
|---|---|---|
| `platform.ports` | Provider-agnostic interfaces: `ObjectStore`, `SecretStore`, `FederatedIdentityProvider` (ADR 0009). No cloud type in any signature. | interfaces done |
| `platform.local` | docker-compose-backed implementations, `@ConditionalOnProperty(app.cloud-provider=local)` | stubs |
| `identity` | `IdentityLinkingService` — the ADR 0003 rule (never auto-link by email) | logic done, persistence pending |
| `catalogue.matching` | `TitleNormalizer` + `TrigramSimilarity` + `SongMatcher` ([ADR 0013](../docs/adr/0013-cross-provider-match-thresholds.md)). Mirrors [`lean/src/lib/matching.ts`](../../lean/src/lib/matching.ts). | done + tested |
| `bands` | `BandRoleResolver` — per-request role resolution (ADR 0004) | interface |
| `messaging` | `Topics` — the four Kafka topics + branch prefixing (PRD §8/§9) | constants |
| `web` | `HealthController` | done |
| `config` | properties binding, baseline security | done |

## What is not here yet

JPA entities and repositories, the session-token decoder, REST controllers for
bands / likes / pool, the transactional outbox relay, Kafka consumers (those
live in [`../workers`](../workers)), the AWS/GCP `platform.*` implementations. Order of work:
[`../docs/READ-IN-THIS-ORDER.md`](../docs/READ-IN-THIS-ORDER.md).
