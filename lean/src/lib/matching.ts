/**
 * Cross-provider song matching (ADR 0013). Shared shape with the cloud-agnostic
 * backend's `SongMatcher`. The normaliser base and the first noise tokens are
 * carried over from the prototype's songsterr.ts (SALVAGE.md).
 */
// Multi-word noise phrases are stripped before tokenising; single noise tokens
// after. Carried over and extended from the prototype's songsterr.ts (SALVAGE.md).
const NOISE_PHRASES = [
  "official music video", "official lyric video", "official video",
  "official audio", "lyric video", "visualizer",
];
const NOISE_TOKENS = new Set([
  "official", "video", "audio", "lyric", "lyrics", "ft", "feat", "featuring",
  "remastered", "remaster", "hd", "4k", "live", "explicit", "mv",
]);

export function normalise(raw: string): string {
  let s = (raw ?? "")
    .toLowerCase()
    .replace(/\((?:19|20)\d{2}\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");
  for (const phrase of NOISE_PHRASES) s = s.split(phrase).join(" ");
  return s
    .split(/\s+/)
    .filter((t) => t && !NOISE_TOKENS.has(t))
    .join(" ");
}

/** De-duplicated, sorted tokens of (title + artist), so word order is neutral. */
export function comparisonKey(title: string, artist: string): string {
  const combined = `${normalise(title)} ${normalise(artist)}`.trim();
  return [...new Set(combined.split(/\s+/).filter(Boolean))].sort().join(" ");
}

function trigrams(s: string): Set<string> {
  const padded = `  ${s}  `;
  const out = new Set<string>();
  for (let i = 0; i + 3 <= padded.length; i++) out.add(padded.slice(i, i + 3));
  return out;
}

/** Sørensen–Dice coefficient over character trigrams. Range 0..1. */
export function similarity(a: string, b: string): number {
  const ta = trigrams(a);
  const tb = trigrams(b);
  if (ta.size === 0 && tb.size === 0) return 1;
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return (2 * shared) / (ta.size + tb.size);
}

export const AUTO_ACCEPT = 0.85;
export const PROMPT_FLOOR = 0.6;

export type MatchDecision = "same_song" | "ask_user" | "different_song";

export function matchTracks(
  a: { isrc?: string; title: string; artist: string },
  b: { isrc?: string; title: string; artist: string },
): { decision: MatchDecision; score: number; exact: boolean } {
  if (a.isrc && b.isrc && a.isrc.toLowerCase() === b.isrc.toLowerCase()) {
    return { decision: "same_song", score: 1, exact: true };
  }
  const score = similarity(
    comparisonKey(a.title, a.artist),
    comparisonKey(b.title, b.artist),
  );
  const decision: MatchDecision =
    score >= AUTO_ACCEPT ? "same_song" : score >= PROMPT_FLOOR ? "ask_user" : "different_song";
  return { decision, score, exact: false };
}
