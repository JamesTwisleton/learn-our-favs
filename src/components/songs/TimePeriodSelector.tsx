"use client";

import { TIME_RANGES, type TimeRange } from "@/lib/constants";
import { cn } from "@/lib/cn";

interface TimePeriodSelectorProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

export function TimePeriodSelector({ value, onChange }: TimePeriodSelectorProps) {
  return (
    <div className="flex gap-1 rounded-full bg-[var(--input-bg)] p-1">
      {TIME_RANGES.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-medium transition-all",
            value === range.value
              ? "bg-spotify-green text-black"
              : "text-muted-60 hover:text-primary"
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
