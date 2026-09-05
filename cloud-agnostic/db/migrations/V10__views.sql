-- V10 — Read-time views. Plain views only (ADR 0009). No materialised views,
-- no ordered-set aggregates.

-- Band pool: a song is in a band's pool when the number of distinct likers who
-- are CURRENT members is at least the band's overlap_threshold (ADR 0007).
-- A song with an unresolved match prompt for that band is excluded (ADR 0013).
CREATE VIEW band_pool_v AS
SELECT counted.band_id,
       counted.song_id,
       counted.liker_count
FROM (
    SELECT bm.band_id,
           sl.song_id,
           count(DISTINCT sl.user_id) AS liker_count
    FROM band_memberships bm
    JOIN song_likes sl ON sl.user_id = bm.user_id
    GROUP BY bm.band_id, sl.song_id
) counted
JOIN bands b ON b.id = counted.band_id
WHERE b.deleted_at IS NULL
  AND counted.liker_count >= b.overlap_threshold
  AND NOT EXISTS (
      SELECT 1
      FROM song_match_prompts smp
      WHERE smp.band_id = counted.band_id
        AND smp.candidate_song_id = counted.song_id
        AND smp.status = 'pending'
  );

-- Aggregated difficulty per (song, instrument). The displayed value is the
-- median, computed in the service layer from difficulty_ratings — Spanner PG
-- has no WITHIN GROUP, so this view exposes avg + count only (ADR 0011).
CREATE VIEW song_difficulty_v AS
SELECT song_id,
       instrument_id,
       avg(rating)  AS avg_rating,
       count(*)     AS rating_count
FROM difficulty_ratings
GROUP BY song_id, instrument_id;
