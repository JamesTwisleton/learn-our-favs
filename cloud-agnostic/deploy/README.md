# Deploy — Terraform + Kubernetes

The portability thesis (PRD §7): **the same application runs on AWS or GCP,
provisioned by Terraform, sharing one Cloudflare-managed domain.**

```
deploy/
  terraform/
    modules/            provider-agnostic module interfaces + per-cloud impls
      network/
      kubernetes/        EKS (aws/) | GKE (gcp/)
      database/          RDS (aws/) | Spanner PG (gcp/)
      object-store/      S3 (aws/) | GCS (gcp/)
      secrets/           Secrets Manager (aws/) | Secret Manager (gcp/)
      identity/          Cognito (aws/) | Identity Platform (gcp/)
    envs/
      aws/               root module, backend config, tfvars
      gcp/
  k8s/
    base/                Deployments, Services, HPAs, Kafka (Strimzi)
    overlays/
      dev/               shared stateful services, branch-prefixed topics (§9)
      prod-aws/
      prod-gcp/
```

## The rule that keeps the abstraction honest

> No provider-specific claim, key format, or error type may leak into the
> domain layer.

Terraform sets one value — `CLOUD_PROVIDER` (`aws` | `gcp`) — as an env var on
the backend Deployment. That selects the `faves.learn.platform.*` bean set
(ADR 0009). Everything else the app needs (bucket name, DB URL, secret store
endpoint, IdP issuer) is injected as config, produced by the active cloud's
modules.

## Migration runbook (PRD §7)

`export from cloud A → terraform apply on cloud B → import data → cut over
Cloudflare DNS → terraform destroy on cloud A`. A real sequence with downtime
during DNS propagation. Naively running `terraform destroy` first would take
every user's data with it — getting the order right is the exercise. Full
runbook: `../docs/runbooks/cloud-migration.md` (TBD).

## State: skeleton

Module interfaces and the env layout are defined; the per-cloud implementations
are stubs. This environment has no Terraform binary, so nothing here is
`terraform validate`-clean yet — that is the first task when picking this up.
