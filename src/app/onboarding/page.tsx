"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SKILL_LEVELS, PLAY_STYLES } from "@/lib/constants";
import { cn } from "@/lib/cn";

interface Instrument {
  id: string;
  name: string;
  displayName: string;
  iconEmoji: string;
}

interface Selection {
  instrumentId: string;
  skillLevel: string;
  playStyle: string | null;
}

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [selections, setSelections] = useState<Selection[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
    }
  }, [status, router]);

  useEffect(() => {
    fetch("/api/instruments")
      .then((res) => res.json())
      .then(setInstruments);

    // Load existing selections
    fetch("/api/user/instruments")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setSelections(
            data.map((ui: { instrumentId: string; skillLevel: string; playStyle: string | null }) => ({
              instrumentId: ui.instrumentId,
              skillLevel: ui.skillLevel,
              playStyle: ui.playStyle,
            }))
          );
        }
      });
  }, []);

  const toggleInstrument = (id: string) => {
    setSelections((prev) => {
      const existing = prev.find((s) => s.instrumentId === id);
      if (existing) {
        return prev.filter((s) => s.instrumentId !== id);
      }
      return [...prev, { instrumentId: id, skillLevel: "BEGINNER", playStyle: null }];
    });
  };

  const updateSelection = (instrumentId: string, field: "skillLevel" | "playStyle", value: string) => {
    setSelections((prev) =>
      prev.map((s) =>
        s.instrumentId === instrumentId ? { ...s, [field]: value } : s
      )
    );
  };

  const handleSave = async () => {
    if (!selections.length) return;
    setSaving(true);

    await fetch("/api/user/instruments", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instruments: selections }),
    });

    router.push("/dashboard");
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-spotify-green border-t-transparent" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold">Choose Your Instruments</h1>
      <p className="mb-8 text-muted-60">
        Select the instruments you play and your skill level for each.
      </p>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {instruments.map((inst) => {
          const selected = selections.some((s) => s.instrumentId === inst.id);
          return (
            <button
              key={inst.id}
              onClick={() => toggleInstrument(inst.id)}
              className={cn(
                "glass flex flex-col items-center gap-2 p-6 transition-all",
                selected
                  ? "border-spotify-green bg-spotify-green/10"
                  : "hover:bg-[var(--glass-hover)]"
              )}
              style={selected ? { borderColor: "var(--color-spotify-green)" } : undefined}
            >
              <span className="text-4xl">{inst.iconEmoji}</span>
              <span className="font-medium">{inst.displayName}</span>
            </button>
          );
        })}
      </div>

      {selections.map((sel) => {
        const inst = instruments.find((i) => i.id === sel.instrumentId);
        if (!inst) return null;

        return (
          <div key={sel.instrumentId} className="glass mb-4 p-6">
            <h3 className="mb-4 text-lg font-semibold">
              {inst.iconEmoji} {inst.displayName}
            </h3>

            <div className="mb-4">
              <label className="mb-2 block text-sm text-muted-60">Skill Level</label>
              <div className="flex gap-2">
                {SKILL_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => updateSelection(sel.instrumentId, "skillLevel", level.value)}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-medium transition-all",
                      sel.skillLevel === level.value
                        ? "bg-spotify-green text-black"
                        : "bg-[var(--input-bg)] text-muted-60 hover:text-primary"
                    )}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-muted-60">Play Style (optional)</label>
              <div className="flex flex-wrap gap-2">
                {PLAY_STYLES.map((style) => (
                  <button
                    key={style.value}
                    onClick={() =>
                      updateSelection(
                        sel.instrumentId,
                        "playStyle",
                        sel.playStyle === style.value ? "" : style.value
                      )
                    }
                    className={cn(
                      "rounded-full px-3 py-1.5 text-sm font-medium transition-all",
                      sel.playStyle === style.value
                        ? "bg-spotify-green text-black"
                        : "bg-[var(--input-bg)] text-muted-60 hover:text-primary"
                    )}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      <button
        onClick={handleSave}
        disabled={!selections.length || saving}
        className={cn(
          "mt-6 w-full rounded-full py-3 text-lg font-semibold transition-all",
          selections.length
            ? "bg-spotify-green text-black hover:bg-spotify-green-dark"
            : "bg-[var(--input-bg)] text-muted-40 cursor-not-allowed"
        )}
      >
        {saving ? "Saving..." : "Continue to Songs"}
      </button>
    </div>
  );
}
