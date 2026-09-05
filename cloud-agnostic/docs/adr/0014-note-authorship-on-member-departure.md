# ADR 0014 — On member departure, band-note content is kept and authorship is relabelled "Former member"

**Status:** Accepted · 2026-09-05 · Closes open decision #5 · Survives in both versions

## Context

Band notes (MongoDB in the demonstration version, a JSONB column in the lean
version) are collaboratively edited and versioned. When a member leaves a band,
what happens to the parts they wrote?

- **Keep content, keep attribution** — simplest, but a departed person's name
  lingers in a band they left; weak on data minimisation.
- **Strip their contributions** — cleanest privacy story, but destroys shared
  work the band still needs.
- **Keep content, anonymise attribution** — the middle path.

Band notes are the band's working material. Removing a departed guitarist's
chord chart because they left punishes the people still in the band.

## Decision

On departure (voluntary leave or removal):

- **Note content is retained** — it belongs to the band, retention is life of
  the band.
- **Authorship is anonymised**: every note/version/edit attributed to that user
  in that band has its author reference replaced with a stable sentinel
  rendered as **"Former member"**. Personal identifiers (name, avatar, user ID
  link) are dropped from those records.
- This is scoped to the band being left. The user's identity and their notes in
  *other* bands are untouched.
- A full account erasure (GDPR) applies the same anonymisation across all bands.

## Consequences

- The note history stays coherent ("someone added this in v4") without naming a
  person who has left.
- Requires an anonymisation routine that rewrites author refs in the note store,
  invoked from both the leave-band and delete-account paths.
- "Former member" is one sentinel per band, not per departed user — we do not
  keep a shadow mapping, because that would defeat the anonymisation.
