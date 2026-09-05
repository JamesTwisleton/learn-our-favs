"use client";

import { getDifficultyLabel } from "@/lib/constants";
import { cn } from "@/lib/cn";

export function DifficultyBadge({ difficulty }: { difficulty: number | null }) {
  if (difficulty === null) {
    return (
      <span className="rounded-full bg-[var(--input-bg)] px-3 py-1 text-xs text-muted-40">
        Unknown
      </span>
    );
  }

  const { label, color } = getDifficultyLabel(difficulty);

  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-xs font-semibold",
        color,
        difficulty <= 3 && "bg-green-400/15",
        difficulty > 3 && difficulty <= 6 && "bg-yellow-400/15",
        difficulty > 6 && "bg-red-400/15"
      )}
    >
      {label} ({difficulty}/10)
    </span>
  );
}
