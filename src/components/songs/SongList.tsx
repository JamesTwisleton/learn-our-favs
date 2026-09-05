"use client";

import { useState } from "react";
import { SongCard, type SongData } from "./SongCard";
import { cn } from "@/lib/cn";

type SortOption = "difficulty_asc" | "difficulty_desc" | "name" | "artist";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "difficulty_asc", label: "Easiest First" },
  { value: "difficulty_desc", label: "Hardest First" },
  { value: "name", label: "Song Name" },
  { value: "artist", label: "Artist" },
];

function sortSongs(songs: SongData[], sort: SortOption): SongData[] {
  return [...songs].sort((a, b) => {
    switch (sort) {
      case "difficulty_asc":
        return (a.difficulty ?? 99) - (b.difficulty ?? 99);
      case "difficulty_desc":
        return (b.difficulty ?? 0) - (a.difficulty ?? 0);
      case "name":
        return a.trackName.localeCompare(b.trackName);
      case "artist":
        return a.artistName.localeCompare(b.artistName);
    }
  });
}

export function SongList({ songs, loading }: { songs: SongData[]; loading: boolean }) {
  const [sort, setSort] = useState<SortOption>("difficulty_asc");

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="glass animate-pulse p-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-lg bg-[var(--input-bg)]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 rounded bg-[var(--input-bg)]" />
                <div className="h-3 w-32 rounded bg-[var(--input-bg)]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!songs.length) {
    return (
      <div className="glass p-8 text-center text-muted-50">
        No tracks found for this time period. Listen to more music on Spotify!
      </div>
    );
  }

  const sorted = sortSongs(songs, sort);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-muted-50">Sort by:</span>
        <div className="flex gap-1 rounded-full bg-[var(--input-bg)] p-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSort(opt.value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-all",
                sort === opt.value
                  ? "bg-spotify-green text-black"
                  : "text-muted-60 hover:text-primary"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-sm text-muted-40">{songs.length} songs</span>
      </div>

      <div className="flex flex-col gap-2">
        {sorted.map((song) => (
          <SongCard key={song.spotifyTrackId} song={song} />
        ))}
      </div>
    </div>
  );
}
