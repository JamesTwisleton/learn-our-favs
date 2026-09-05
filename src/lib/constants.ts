export const TIME_RANGES = [
  { value: "short_term", label: "Last 4 Weeks" },
  { value: "medium_term", label: "Last 6 Months" },
  { value: "long_term", label: "All Time" },
] as const;

export type TimeRange = (typeof TIME_RANGES)[number]["value"];

export const SKILL_LEVELS = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
] as const;

export const PLAY_STYLES = [
  { value: "CHORDS", label: "Chords" },
  { value: "FINGERPICKING", label: "Fingerpicking" },
  { value: "STRUMMING", label: "Strumming" },
  { value: "LEAD", label: "Lead" },
  { value: "RHYTHM", label: "Rhythm" },
  { value: "ACCOMPANIMENT", label: "Accompaniment" },
  { value: "FULL_SCORE", label: "Full Score" },
] as const;

export const DIFFICULTY_LABELS = {
  easy: { max: 3, label: "Easy", color: "text-green-400" },
  medium: { max: 6, label: "Medium", color: "text-yellow-400" },
  hard: { max: 10, label: "Hard", color: "text-red-400" },
} as const;

export function getDifficultyLabel(score: number) {
  if (score <= DIFFICULTY_LABELS.easy.max) return DIFFICULTY_LABELS.easy;
  if (score <= DIFFICULTY_LABELS.medium.max) return DIFFICULTY_LABELS.medium;
  return DIFFICULTY_LABELS.hard;
}

// Cache TTLs in milliseconds
export const CACHE_TTL = {
  short_term: 24 * 60 * 60 * 1000, // 24 hours
  medium_term: 3 * 24 * 60 * 60 * 1000, // 3 days
  long_term: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const;
