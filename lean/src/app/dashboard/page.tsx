import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSpotifyAccessToken } from "@/lib/spotify-server";
import { getTopTracks, getRecentTracks, type SpotifyTrack } from "@/lib/spotify";
import { Nav } from "@/components/Nav";
import { toggleLike, setProficiency } from "./actions";

export const dynamic = "force-dynamic";

type TabKey = "top" | "recent";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const tab: TabKey = tabParam === "recent" ? "recent" : "top";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data: profile }, { data: instruments }, { data: proficiency }, { data: likes }] =
    await Promise.all([
      supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).single(),
      supabase.from("instruments").select("id, name, display_name, icon_emoji").order("display_name"),
      supabase.from("instrument_proficiency").select("instrument_id, skill_level"),
      supabase.from("song_likes").select("song_id, songs(spotify_track_id)"),
    ]);

  const likedTrackIds = new Set(
    (likes ?? [])
      .map(
        (l) =>
          (l.songs as unknown as { spotify_track_id: string | null } | null)
            ?.spotify_track_id,
      )
      .filter(Boolean) as string[],
  );
  const proficiencyByInstrument = new Map(
    (proficiency ?? []).map((p) => [p.instrument_id, p.skill_level]),
  );

  const accessToken = await getSpotifyAccessToken(user.id);
  let tracks: SpotifyTrack[] = [];
  if (accessToken) {
    tracks =
      tab === "recent"
        ? await getRecentTracks(accessToken, 30)
        : await getTopTracks(accessToken, "medium_term", 30);
  }

  return (
    <>
      <Nav
        displayName={profile?.display_name ?? "You"}
        avatarUrl={profile?.avatar_url}
      />

      <h1 className="page-title">Your dashboard</h1>

      <section className="section">
        <h2 className="section-title">Instruments you play</h2>
        <div className="instruments-grid">
          {(instruments ?? []).map((inst) => {
            const currentLevel = proficiencyByInstrument.get(inst.id) ?? "";
            return (
              <form
                key={inst.id}
                action={setProficiency}
                className={`instrument-card ${currentLevel ? "active" : ""}`}
              >
                <div className="instrument-header">
                  <span className="instrument-emoji">{inst.icon_emoji}</span>
                  <span className="instrument-name">{inst.display_name}</span>
                </div>
                <input type="hidden" name="instrumentId" value={inst.id} />
                <select
                  name="skillLevel"
                  defaultValue={currentLevel}
                  className="skill-select"
                >
                  <option value="">— not played —</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
                <button type="submit" className="save-btn">
                  Save
                </button>
              </form>
            );
          })}
        </div>
      </section>

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
          </div>
        </div>
        {!accessToken ? (
          <div className="panel">
            <p>Connect Spotify to pull your listening history.</p>
            <a className="btn" href="/auth/spotify">
              Connect Spotify
            </a>
          </div>
        ) : tracks.length === 0 ? (
          <div className="panel">
            <p className="muted">No tracks to show yet.</p>
          </div>
        ) : (
          <div className="panel tracks-panel">
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
    </>
  );
}
