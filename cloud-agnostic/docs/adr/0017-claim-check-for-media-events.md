# ADR 0017 — Media events carry an object key, not bytes (claim-check pattern)

**Status:** Accepted · 2026-09-05 · Demonstration version only

## Context

When a recording is uploaded it must be transcoded, thumbnailed, and have its
duration extracted — asynchronously, via `media.uploaded` on Kafka. The naive
approach puts the file in the event.

Kafka's default `max.message.bytes` is 1 MB. Real recordings are tens to
hundreds of MB. Pushing media bytes through a log broker is a known
anti-pattern: it blows the message limit, bloats the log, wrecks retention
economics, and couples broker sizing to file sizes.

## Decision

**Claim-check pattern:** Instead of sending large payloads through a message
broker (anti-pattern), store the payload in durable external storage and send
only a reference/receipt ("claim check") through the broker. Like a coat-check
ticket: you leave the coat (file) with the attendant (object store), get a
ticket (object key), and pass the ticket around; the file stays safe elsewhere.

The client uploads the file **directly to object storage** (presigned PUT to S3 /
GCS). Only once the upload completes does the backend publish `media.uploaded`,
and the event body is small:

```
{ recording_id, band_id, uploader_user_id, object_key, content_type,
  byte_size, uploaded_at }
```

The media worker reads the key, streams the object from storage, does its work,
writes derived objects back, and updates the relational row.

## Consequences

- Kafka messages stay well under 1 MB regardless of file size.
- Combined with "no personal data in payloads" (PRD §10): the payload is IDs and
  a key, so the log is erasure-neutral — deleting the object and the row is
  enough, the log entry references nothing sensitive.
- The upload path needs presigned-URL issuance and a completion callback, which
  is more moving parts than a direct POST. Worth it.
