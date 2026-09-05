"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoginButton } from "@/components/auth/LoginButton";

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.replace("/dashboard");
    }
  }, [session, router]);

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4">
      <div className="max-w-2xl text-center">
        <h1 className="mb-4 text-5xl font-bold tracking-tight">
          <span className="text-spotify-green">Learn</span> My Favs
        </h1>
        <p className="mb-8 text-lg text-muted-60">
          Discover which of your most-played Spotify songs are easy to play on
          your favourite instrument. Get tabs, sort by difficulty, and jam with
          friends.
        </p>
        <LoginButton />
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="glass p-6 text-center">
            <div className="mb-3 text-3xl">🎸</div>
            <h3 className="mb-1 font-semibold">Pick Your Instrument</h3>
            <p className="text-sm text-muted-50">
              Guitar, piano, bass, ukulele, drums
            </p>
          </div>
          <div className="glass p-6 text-center">
            <div className="mb-3 text-3xl">📊</div>
            <h3 className="mb-1 font-semibold">See Difficulty</h3>
            <p className="text-sm text-muted-50">
              Your top songs ranked by how easy they are to play
            </p>
          </div>
          <div className="glass p-6 text-center">
            <div className="mb-3 text-3xl">🎵</div>
            <h3 className="mb-1 font-semibold">Get Tabs & Jam</h3>
            <p className="text-sm text-muted-50">
              Links to tabs, create playlists, and jam with friends
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
