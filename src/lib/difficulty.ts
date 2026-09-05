import { prisma } from "./prisma";
import { getUltimateGuitarUrl, getSongsterrUrl } from "./tabs";

export interface SongDifficultyResult {
  spotifyTrackId: string;
  trackName: string;
  artistName: string;
  instrumentId: string;
  instrumentName: string;
  difficulty: number;
  ultimateGuitarUrl: string;
  songsterrUrl: string;
  source: string;
}

/**
 * Get or compute difficulty for a track + instrument pair.
 * Checks cache first, falls back to heuristic.
 * Always provides Ultimate Guitar and Songsterr search URLs.
 */
export async function getOrComputeDifficulty(
  spotifyTrackId: string,
  trackName: string,
  artistName: string,
  instrumentId: string,
  instrumentName: string
): Promise<SongDifficultyResult> {
  const ultimateGuitarUrl = getUltimateGuitarUrl(artistName, trackName, instrumentName);
  const songsterrUrl = getSongsterrUrl(artistName, trackName);

  // Check cache
  const cached = await prisma.songDifficulty.findUnique({
    where: {
      spotifyTrackId_instrumentId: { spotifyTrackId, instrumentId },
    },
  });

  if (cached) {
    return {
      spotifyTrackId,
      trackName: cached.trackName,
      artistName: cached.artistName,
      instrumentId,
      instrumentName,
      difficulty: cached.difficulty,
      ultimateGuitarUrl,
      songsterrUrl,
      source: cached.source,
    };
  }

  // Heuristic difficulty based on instrument
  const difficulty = heuristicDifficulty(instrumentName);

  await prisma.songDifficulty.create({
    data: {
      spotifyTrackId,
      trackName,
      artistName,
      instrumentId,
      difficulty,
      tabUrl: ultimateGuitarUrl,
      tabProvider: "ultimate_guitar",
      source: "heuristic",
    },
  });

  return {
    spotifyTrackId,
    trackName,
    artistName,
    instrumentId,
    instrumentName,
    difficulty,
    ultimateGuitarUrl,
    songsterrUrl,
    source: "heuristic",
  };
}

/**
 * Simple heuristic when no external data is available.
 */
function heuristicDifficulty(instrumentName: string): number {
  switch (instrumentName) {
    case "drums":
      return 5;
    case "bass":
      return 4;
    case "ukulele":
      return 3;
    case "guitar":
      return 5;
    case "piano":
      return 5;
    default:
      return 5;
  }
}
