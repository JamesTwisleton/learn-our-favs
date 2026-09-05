"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TimePeriodSelector } from "@/components/songs/TimePeriodSelector";
import { InstrumentFilter } from "@/components/songs/InstrumentFilter";
import { SongList } from "@/components/songs/SongList";
import { useTopTracks } from "@/hooks/useTopTracks";
import type { TimeRange } from "@/lib/constants";

interface UserInstrument {
  id: string;
  instrumentId: string;
  skillLevel: string;
  playStyle: string | null;
  instrument: {
    id: string;
    name: string;
    displayName: string;
    iconEmoji: string;
  };
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<TimeRange>("medium_term");
  const [userInstruments, setUserInstruments] = useState<UserInstrument[]>([]);
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string | null>(null);
  const [instrumentsLoaded, setInstrumentsLoaded] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    fetch("/api/user/instruments")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setUserInstruments(data);
          if (data.length > 0) {
            setSelectedInstrumentId(data[0].instrumentId);
          } else {
            router.replace("/onboarding");
          }
        }
        setInstrumentsLoaded(true);
      });
  }, [status, router]);

  const { songs, loading, error } = useTopTracks(timeRange, selectedInstrumentId);

  if (status === "loading" || !instrumentsLoaded) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-spotify-green border-t-transparent" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-bold">Your Easy Songs</h1>
        <p className="text-muted-60">
          Your most-played tracks on Spotify, ranked by how easy they are to play.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <TimePeriodSelector value={timeRange} onChange={setTimeRange} />
        <InstrumentFilter
          instruments={userInstruments}
          selectedId={selectedInstrumentId}
          onChange={setSelectedInstrumentId}
        />
      </div>

      {error && (
        <div className="glass mb-4 border-red-500/30 p-4 text-red-400">
          {error}
        </div>
      )}

      <SongList songs={songs} loading={loading} />
    </div>
  );
}
