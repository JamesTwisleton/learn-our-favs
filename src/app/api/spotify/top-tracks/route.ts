import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTopTracks, type SpotifyTrack } from "@/lib/spotify";
import { getOrComputeDifficulty } from "@/lib/difficulty";
import { getUltimateGuitarUrl, getSongsterrUrl } from "@/lib/tabs";
import { CACHE_TTL, type TimeRange } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const timeRange = (searchParams.get("timeRange") || "medium_term") as TimeRange;
  const instrumentId = searchParams.get("instrumentId");

  const user = await prisma.user.findUnique({
    where: { spotifyId: session.user.id },
    include: {
      instruments: { include: { instrument: true } },
      favourites: { select: { spotifyTrackId: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const favouriteTrackIds = new Set(user.favourites.map((f) => f.spotifyTrackId));

  // Check cache
  let tracks: SpotifyTrack[];
  const cached = await prisma.topTracksCache.findUnique({
    where: {
      userId_timeRange: { userId: user.id, timeRange },
    },
  });

  const ttl = CACHE_TTL[timeRange];
  const isFresh = cached && Date.now() - cached.fetchedAt.getTime() < ttl;

  if (isFresh && cached) {
    tracks = JSON.parse(cached.tracksJson);
  } else {
    tracks = await getTopTracks(session.accessToken, timeRange);

    await prisma.topTracksCache.upsert({
      where: {
        userId_timeRange: { userId: user.id, timeRange },
      },
      update: {
        tracksJson: JSON.stringify(tracks),
        fetchedAt: new Date(),
      },
      create: {
        userId: user.id,
        timeRange,
        tracksJson: JSON.stringify(tracks),
      },
    });
  }

  // Determine which instrument to use for difficulty
  const targetInstrument = instrumentId
    ? user.instruments.find((ui) => ui.instrumentId === instrumentId)
    : user.instruments[0];

  if (!targetInstrument) {
    return NextResponse.json(
      tracks.map((track) => ({
        spotifyTrackId: track.id,
        trackName: track.name,
        artistName: track.artists.map((a) => a.name).join(", "),
        albumName: track.album.name,
        albumImageUrl: track.album.images[0]?.url || null,
        spotifyUrl: track.external_urls.spotify,
        difficulty: null,
        ultimateGuitarUrl: getUltimateGuitarUrl(track.artists[0]?.name || "", track.name, "guitar"),
        songsterrUrl: getSongsterrUrl(track.artists[0]?.name || "", track.name),
        source: null,
        isFavourited: favouriteTrackIds.has(track.id),
      }))
    );
  }

  // Enrich with difficulty data (process in parallel, max 5 at a time)
  const enrichedTracks = [];
  for (let i = 0; i < tracks.length; i += 5) {
    const batch = tracks.slice(i, i + 5);
    const results = await Promise.all(
      batch.map((track) =>
        getOrComputeDifficulty(
          track.id,
          track.name,
          track.artists[0]?.name || "Unknown",
          targetInstrument.instrumentId,
          targetInstrument.instrument.name
        )
      )
    );

    for (let j = 0; j < batch.length; j++) {
      const track = batch[j];
      const diff = results[j];
      enrichedTracks.push({
        spotifyTrackId: track.id,
        trackName: track.name,
        artistName: track.artists.map((a) => a.name).join(", "),
        albumName: track.album.name,
        albumImageUrl: track.album.images[0]?.url || null,
        spotifyUrl: track.external_urls.spotify,
        difficulty: diff.difficulty,
        ultimateGuitarUrl: diff.ultimateGuitarUrl,
        songsterrUrl: diff.songsterrUrl,
        source: diff.source,
        isFavourited: favouriteTrackIds.has(track.id),
      });
    }
  }

  return NextResponse.json(enrichedTracks);
}
