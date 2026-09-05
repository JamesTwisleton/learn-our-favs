"""Environment configuration shared by all four workers."""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Config:
    bootstrap_servers: str
    topic_prefix: str
    database_url: str
    object_store_endpoint: str
    object_store_bucket: str

    @classmethod
    def from_env(cls) -> "Config":
        return cls(
            bootstrap_servers=os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092"),
            topic_prefix=os.environ.get("KAFKA_TOPIC_PREFIX", "local"),
            database_url=os.environ.get(
                "DATABASE_URL", "postgresql://lmf:lmf@localhost:5432/lmf"
            ),
            object_store_endpoint=os.environ.get(
                "OBJECT_STORE_ENDPOINT", "http://localhost:9000"
            ),
            object_store_bucket=os.environ.get("OBJECT_STORE_BUCKET", "lmf-media"),
        )

    def topic(self, logical: str) -> str:
        """Branch-prefixed topic name in non-production (PRD §9, ADR 0018)."""
        if not self.topic_prefix or self.topic_prefix == "prod":
            return logical
        return f"{self.topic_prefix}.{logical}"

    def group_id(self, worker: str) -> str:
        prefix = self.topic_prefix or "prod"
        return f"{prefix}-{worker}"
