"""Kafka consumers for the cloud-agnostic architecture (PRD §8).

    media         media.uploaded              transcode, thumbnail, duration
    ingestion     catalogue.ingest.requested  pull top tracks, respect quotas
    overlap       band.overlap.invalidated    recompute affected pools
    notification  notification.raised         deliver notifications
"""
