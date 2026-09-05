# Terraform modules

Each capability is a module with a **stable interface** (same input variables
and output values regardless of cloud) and two implementations selected by the
root env module.

| Module | Inputs (excerpt) | Outputs (excerpt) | AWS | GCP |
|---|---|---|---|---|
| `network` | `cidr`, `region` | `vpc_id`, `subnet_ids` | VPC | VPC |
| `kubernetes` | `subnet_ids`, `node_size`, `min/max_nodes` | `cluster_endpoint`, `kubeconfig` | EKS | GKE |
| `database` | `instance_size`, `db_name` | `jdbc_url`, `secret_ref` | RDS PostgreSQL | Spanner (PG interface) |
| `object-store` | `bucket_name`, `cors_origins` | `bucket`, `endpoint` | S3 | GCS |
| `secrets` | `name_prefix` | `endpoint`, `iam_binding` | Secrets Manager | Secret Manager |
| `identity` | `callback_urls`, `providers` | `issuer_url`, `client_id` | Cognito user pool | Identity Platform |

The root env module (`envs/aws`, `envs/gcp`) wires these together and emits the
backend Deployment's environment: `CLOUD_PROVIDER`, `DATABASE_URL`,
`OBJECT_STORE_*`, `IDP_ISSUER_URL`, `KAFKA_BOOTSTRAP_SERVERS`, ...

## Caveats already known (PRD §7)

1. **RDS ≠ Spanner.** The `database` module's Spanner impl accepts the same
   inputs but the schema must stay in the dialect intersection
   (`../../db/migrations/README.md`). Not a drop-in swap — a real constraint.
2. **Cognito ≠ Identity Platform.** The `identity` module hides different token
   formats and user-pool models behind one interface. "One account, many
   providers" is implemented twice.
