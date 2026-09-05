"use client";

import { cn } from "@/lib/cn";

interface Instrument {
  id: string;
  instrumentId: string;
  instrument: {
    id: string;
    name: string;
    displayName: string;
    iconEmoji: string;
  };
}

interface InstrumentFilterProps {
  instruments: Instrument[];
  selectedId: string | null;
  onChange: (id: string) => void;
}

export function InstrumentFilter({ instruments, selectedId, onChange }: InstrumentFilterProps) {
  if (instruments.length <= 1) return null;

  return (
    <div className="flex gap-2">
      {instruments.map((ui) => (
        <button
          key={ui.instrumentId}
          onClick={() => onChange(ui.instrumentId)}
          className={cn(
            "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
            selectedId === ui.instrumentId
              ? "bg-spotify-green text-black"
              : "glass text-muted-60 hover:text-primary"
          )}
        >
          <span>{ui.instrument.iconEmoji}</span>
          <span>{ui.instrument.displayName}</span>
        </button>
      ))}
    </div>
  );
}
