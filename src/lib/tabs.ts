/**
 * Generate search URLs for tab providers.
 * Since Songsterr's API is no longer available, we link directly
 * to search results on Ultimate Guitar and Songsterr.
 */

const INSTRUMENT_TAB_TYPES: Record<string, string> = {
  guitar: "chords",
  piano: "chords",
  bass: "bass-tabs",
  ukulele: "ukulele-chords",
  drums: "drum-tabs",
};

export function getUltimateGuitarUrl(artist: string, title: string, instrumentName: string): string {
  const query = `${artist} ${title}`;
  const tabType = INSTRUMENT_TAB_TYPES[instrumentName] || "chords";
  return `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(query)}&type=${tabType}`;
}

export function getSongsterrUrl(artist: string, title: string): string {
  const query = `${artist} ${title}`;
  return `https://www.songsterr.com/?pattern=${encodeURIComponent(query)}`;
}
