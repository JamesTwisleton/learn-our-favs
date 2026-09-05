"use client";

import { useState } from "react";
import Image from "next/image";
import { DifficultyBadge } from "./DifficultyBadge";
import { cn } from "@/lib/cn";

export interface SongData {
  spotifyTrackId: string;
  trackName: string;
  artistName: string;
  albumName: string | null;
  albumImageUrl: string | null;
  spotifyUrl: string;
  difficulty: number | null;
  ultimateGuitarUrl: string;
  songsterrUrl: string;
  source: string | null;
  isFavourited: boolean;
}

export function SongCard({ song }: { song: SongData }) {
  const [favourited, setFavourited] = useState(song.isFavourited);
  const [toggling, setToggling] = useState(false);

  const toggleFavourite = async () => {
    setToggling(true);
    try {
      const res = await fetch("/api/songs/favourites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spotifyTrackId: song.spotifyTrackId,
          trackName: song.trackName,
          artistName: song.artistName,
          albumName: song.albumName,
          albumImageUrl: song.albumImageUrl,
        }),
      });
      const data = await res.json();
      setFavourited(data.favourited);
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="glass flex items-center gap-4 p-4 transition-all hover:bg-[var(--glass-hover)]">
      {song.albumImageUrl ? (
        <Image
          src={song.albumImageUrl}
          alt={song.albumName || song.trackName}
          width={56}
          height={56}
          className="rounded-lg"
        />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[var(--input-bg)]">
          <svg className="h-6 w-6 text-muted-40" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h3 className="truncate font-semibold text-primary">{song.trackName}</h3>
        <p className="truncate text-sm text-muted-60">{song.artistName}</p>
        {song.albumName && (
          <p className="truncate text-xs text-muted-40">{song.albumName}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <DifficultyBadge difficulty={song.difficulty} />

        <button
          onClick={toggleFavourite}
          disabled={toggling}
          className={cn(
            "rounded-full p-2 transition-all",
            favourited
              ? "text-red-500 hover:text-red-400"
              : "text-muted-40 hover:text-red-500"
          )}
          title={favourited ? "Remove from favourites" : "Add to favourites"}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill={favourited ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        <a
          href={song.ultimateGuitarUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-[var(--input-bg)] px-3 py-1.5 text-xs font-medium text-yellow-500 transition-colors hover:bg-[var(--input-bg-hover)]"
          title="Search on Ultimate Guitar"
        >
          UG
        </a>

        <a
          href={song.songsterrUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-[var(--input-bg)] px-3 py-1.5 text-xs font-medium text-blue-400 transition-colors hover:bg-[var(--input-bg-hover)]"
          title="Search on Songsterr"
        >
          Songsterr
        </a>

        <a
          href={song.spotifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-[var(--input-bg)] p-1.5 text-muted-50 transition-colors hover:text-spotify-green"
          title="Open in Spotify"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
        </a>
      </div>
    </div>
  );
}
