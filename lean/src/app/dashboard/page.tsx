import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSpotifyAccessToken } from "@/lib/spotify-server";
import { getTopTracks, getRecentTracks, type SpotifyTrack } from "@/lib/spotify";
import { Nav } from "@/components/Nav";
import { InstrumentsSection } from "@/components/InstrumentsSection";
import { toggleLike } from "./actions";

export const dynamic = "force-dynamic";

type TabKey = "top" | "recent" | "favourites";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; edit_instruments?: string }>;
}) {
  const { tab: tabParam, edit_instruments } = await searchParams;
  const tab: TabKey =
    tabParam === "recent"
      ? "recent"
      : tabParam === "favourites"
        ? "favourites"
        : "top";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [
    { data: profile },
    { data: instruments },
    { data: proficiency },
    { data: likes },
    { data: memberships },
  ] = await Promise.all([
    supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).single(),
    supabase.from("instruments").select("id, name, display_name, icon_emoji").order("display_name"),
    supabase.from("instrument_proficiency").select("instrument_id, skill_level"),
    supabase
      .from("song_likes")
      .select("song_id, songs(spotify_track_id, title, artist, album_art_url, isrc)"),
    supabase
      .from("band_memberships")
      .select("role, bands(id, slug, name)")
      .eq("user_id", user.id),
  ]);

  type LikedSong = {
    spotify_track_id: string | null;
    title: string;
    artist: string;
    album_art_url: string | null;
    isrc: string | null;
  };

  const likedSongs: (LikedSong & { song_id: string })[] = (likes ?? [])
    .map((l) => {
      const s = l.songs as unknown as LikedSong | null;
      return s
        ? { ...s, song_id: (l as unknown as { song_id: string }).song_id }
        : null;
    })
    .filter(Boolean) as (LikedSong & { song_id: string })[];

  const likedTrackIds = new Set(
    likedSongs.map((s) => s.spotify_track_id).filter(Boolean) as string[],
  );

  const accessToken = await getSpotifyAccessToken(user.id);

  const hasPickedInstruments = (proficiency ?? []).length > 0;
  const showInstrumentEditor = !hasPickedInstruments || edit_instruments === "1";

  let tracks: SpotifyTrack[] = [];
  if (accessToken) {
    if (tab === "top") tracks = await getTopTracks(accessToken, "medium_term", 30);
    else if (tab === "recent") tracks = await getRecentTracks(accessToken, 30);
  }

  return (
    <>
      <Nav
        displayName={profile?.display_name ?? "You"}
        avatarUrl={profile?.avatar_url}
      />

      <h1 className="page-title">
        Welcome back, {(profile?.display_name ?? "You").split(" ")[0]}
      </h1>

      <InstrumentsSection
        instruments={instruments ?? []}
        proficiency={proficiency ?? []}
        editing={showInstrumentEditor}
      />

      <section className="section">
        <div className="tracks-header">
          <h2 className="section-title" style={{ margin: 0 }}>
            Your tracks
          </h2>
          <div className="tabs">
            <Link
              href="/dashboard?tab=top"
              className={`tab ${tab === "top" ? "tab-active" : ""}`}
            >
              Top
            </Link>
            <Link
              href="/dashboard?tab=recent"
              className={`tab ${tab === "recent" ? "tab-active" : ""}`}
            >
              Recent
            </Link>
            <Link
              href="/dashboard?tab=favourites"
              className={`tab ${tab === "favourites" ? "tab-active" : ""}`}
            >
              Favourited
            </Link>
          </div>
        </div>
        {tab === "favourites" ? (
          <FavouritesList likedSongs={likedSongs} />
        ) : !accessToken ? (
          <div className="cta-card">
            <p style={{ marginTop: 0 }}>
              Connect Spotify to pull your listening history.
            </p>
            <a className="btn" href="/auth/spotify">
              Connect Spotify
            </a>
          </div>
        ) : tracks.length === 0 ? (
          <div className="cta-card">
            <p className="muted" style={{ margin: 0 }}>No tracks to show yet.</p>
          </div>
        ) : (
          <div className="tracks-panel">
            {tracks.map((t) => {
              const liked = likedTrackIds.has(t.id);
              return (
                <div key={t.id} className="song">
                  {t.album.images[0]?.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.album.images[0].url} alt="" />
                  )}
                  <div className="grow">
                    <div className="song-title">{t.name}</div>
                    <div className="muted song-artist">
                      {t.artists.map((a) => a.name).join(", ")}
                    </div>
                  </div>
                  <form action={toggleLike}>
                    <input type="hidden" name="spotifyTrackId" value={t.id} />
                    <input type="hidden" name="title" value={t.name} />
                    <input
                      type="hidden"
                      name="artist"
                      value={t.artists.map((a) => a.name).join(", ")}
                    />
                    <input type="hidden" name="isrc" value={t.external_ids?.isrc ?? ""} />
                    <input
                      type="hidden"
                      name="albumArtUrl"
                      value={t.album.images[0]?.url ?? ""}
                    />
                    <input type="hidden" name="liked" value={String(liked)} />
                    <button
                      type="submit"
                      className={`like-btn ${liked ? "liked" : ""}`}
                      aria-label={liked ? "Unlike" : "Like"}
                    >
                      {liked ? "♥" : "♡"}
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="section">
        <h2 className="section-title">Your bands</h2>
        {(memberships ?? []).length === 0 ? (
          <div className="cta-card">
            <p style={{ marginTop: 0 }} className="muted">
              You&apos;re not in any bands yet.
            </p>
            <Link href="/bands" className="btn">Create or join a band</Link>
          </div>
        ) : (
          <>
            <div className="bands-grid">
              {(memberships ?? []).map((m) => {
                const band = m.bands as unknown as { slug: string; name: string };
                return (
                  <Link
                    key={band.slug}
                    href={`/b/${band.slug}`}
                    className="band-card"
                  >
                    <div className="band-card-name">{band.name}</div>
                    <div className="band-card-meta">
                      <span className="pill">{m.role}</span>
                      <span className="muted">/b/{band.slug}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
            <Link href="/bands" className="muted-link">
              Manage bands →
            </Link>
          </>
        )}
      </section>
    </>
  );
}

function FavouritesList({
  likedSongs,
}: {
  likedSongs: {
    song_id: string;
    spotify_track_id: string | null;
    title: string;
    artist: string;
    album_art_url: string | null;
    isrc: string | null;
  }[];
}) {
  if (likedSongs.length === 0) {
    return (
      <div className="cta-card">
        <p className="muted" style={{ margin: 0 }}>
          You haven&apos;t liked any songs yet.
        </p>
      </div>
    );
  }
  return (
    <div className="tracks-panel">
      {likedSongs.map((s) => (
        <div key={s.song_id} className="song">
          {s.album_art_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.album_art_url} alt="" />
          )}
          <div className="grow">
            <div className="song-title">{s.title}</div>
            <div className="muted song-artist">{s.artist}</div>
          </div>
          {s.spotify_track_id && (
            <form action={toggleLike}>
              <input type="hidden" name="spotifyTrackId" value={s.spotify_track_id} />
              <input type="hidden" name="title" value={s.title} />
              <input type="hidden" name="artist" value={s.artist} />
              <input type="hidden" name="isrc" value={s.isrc ?? ""} />
              <input type="hidden" name="albumArtUrl" value={s.album_art_url ?? ""} />
              <input type="hidden" name="liked" value="true" />
              <button type="submit" className="like-btn liked" aria-label="Unlike">
                ♥
              </button>
            </form>
          )}
        </div>
      ))}
    </div>
  );
}
