const SONGSTERR_API = "https://www.songsterr.com/a/ra/songs.json";

interface SongsterrResult {
  id: number;
  title: string;
  artist: { name: string };
  tracks: { instrumentId: number; difficulty: string }[];
}

// Songsterr instrument ID mapping
const SONGSTERR_INSTRUMENT_MAP: Record<string, number[]> = {
  guitar: [1, 2, 3], // electric, acoustic, classical
  bass: [4],
  drums: [5],
  piano: [6, 7], // piano, keyboard
  ukulele: [8],
};

export interface SongsterrMatch {
  songsterrId: number;
  title: string;
  artist: string;
  tabUrl: string;
  instrumentDifficulty: string | null;
}

function normalise(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(a: string, b: string): number {
  const na = normalise(a);
  const nb = normalise(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;

  const wordsA = na.split(" ");
  const wordsB = nb.split(" ");
  const common = wordsA.filter((w) => wordsB.includes(w)).length;
  return common / Math.max(wordsA.length, wordsB.length);
}

export async function searchSongsterr(
  artist: string,
  title: string,
  instrumentName: string
): Promise<SongsterrMatch | null> {
  const query = encodeURIComponent(`${artist} ${title}`);
  const res = await fetch(`${SONGSTERR_API}?pattern=${query}`);

  if (!res.ok) return null;

  const results: SongsterrResult[] = await res.json();
  if (!results.length) return null;

  // Find best match by artist + title similarity
  let bestMatch: SongsterrResult | null = null;
  let bestScore = 0;

  for (const result of results.slice(0, 10)) {
    const titleScore = similarity(result.title, title);
    const artistScore = similarity(result.artist.name, artist);
    const combined = titleScore * 0.5 + artistScore * 0.5;

    if (combined > bestScore && combined >= 0.5) {
      bestScore = combined;
      bestMatch = result;
    }
  }

  if (!bestMatch) return null;

  // Find difficulty for the requested instrument
  const instrumentIds = SONGSTERR_INSTRUMENT_MAP[instrumentName] || [];
  const matchingTrack = bestMatch.tracks?.find((t) =>
    instrumentIds.includes(t.instrumentId)
  );

  return {
    songsterrId: bestMatch.id,
    title: bestMatch.title,
    artist: bestMatch.artist.name,
    tabUrl: `https://www.songsterr.com/a/wsa/${encodeURIComponent(
      bestMatch.artist.name.toLowerCase().replace(/\s+/g, "-")
    )}-${encodeURIComponent(
      bestMatch.title.toLowerCase().replace(/\s+/g, "-")
    )}-tab-s${bestMatch.id}`,
    instrumentDifficulty: matchingTrack?.difficulty ?? null,
  };
}

// Map Songsterr difficulty strings to our 1-10 scale
export function mapSongsterrDifficulty(difficulty: string | null): number {
  if (!difficulty) return 5; // default to medium if unknown
  switch (difficulty.toLowerCase()) {
    case "novice":
      return 2;
    case "beginner":
      return 3;
    case "intermediate":
      return 5;
    case "advanced":
      return 7;
    case "expert":
      return 9;
    default:
      return 5;
  }
}
