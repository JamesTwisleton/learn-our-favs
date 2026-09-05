"use client";

import { useState, useEffect, useCallback } from "react";
import type { TimeRange } from "@/lib/constants";
import type { SongData } from "@/components/songs/SongCard";

export function useTopTracks(timeRange: TimeRange, instrumentId: string | null) {
  const [songs, setSongs] = useState<SongData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTracks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ timeRange });
      if (instrumentId) params.set("instrumentId", instrumentId);

      const res = await fetch(`/api/spotify/top-tracks?${params}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch tracks: ${res.status}`);
      }

      const data = await res.json();
      setSongs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch tracks");
    } finally {
      setLoading(false);
    }
  }, [timeRange, instrumentId]);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  return { songs, loading, error, refetch: fetchTracks };
}
