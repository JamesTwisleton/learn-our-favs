import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSpotifyAccessToken } from "@/lib/spotify-server";
import { getTopTracks } from "@/lib/spotify";
import { Nav } from "@/components/Nav";
import { toggleLike, setProficiency } from "./actions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data: profile }, { data: instruments }, { data: proficiency }, { data: likes }] =
    await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", user.id).single(),
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
  const tracks = accessToken ? await getTopTracks(accessToken, "medium_term", 30) : [];

  return (
    <>
      <Nav displayName={profile?.display_name ?? "You"} />

      <h1>Your dashboard</h1>

      <h2>Instruments you play</h2>
      <div className="panel list">
        {(instruments ?? []).map((inst) => (
          <form key={inst.id} action={setProficiency} className="row" style={{ justifyContent: "space-between" }}>
            <span>{inst.icon_emoji} {inst.display_name}</span>
            <input type="hidden" name="instrumentId" value={inst.id} />
            <select name="skillLevel" defaultValue={proficiencyByInstrument.get(inst.id) ?? ""}>
              <option value="">— not played —</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            <button type="submit" className="secondary">Save</button>
          </form>
        ))}
      </div>

      <h2>Your top tracks</h2>
      {!accessToken ? (
        <div className="panel">
          <p>Connect Spotify to pull your most-played tracks.</p>
          <a className="btn" href="/auth/spotify">Connect Spotify</a>
        </div>
      ) : (
        <div className="panel">
          {tracks.map((t) => {
            const liked = likedTrackIds.has(t.id);
            return (
              <div key={t.id} className="song">
                {t.album.images[0]?.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.album.images[0].url} alt="" />
                )}
                <div className="grow">
                  <div>{t.name}</div>
                  <div className="muted">{t.artists.map((a) => a.name).join(", ")}</div>
                </div>
                <form action={toggleLike}>
                  <input type="hidden" name="spotifyTrackId" value={t.id} />
                  <input type="hidden" name="title" value={t.name} />
                  <input type="hidden" name="artist" value={t.artists.map((a) => a.name).join(", ")} />
                  <input type="hidden" name="isrc" value={t.external_ids?.isrc ?? ""} />
                  <input type="hidden" name="albumArtUrl" value={t.album.images[0]?.url ?? ""} />
                  <input type="hidden" name="liked" value={String(liked)} />
                  <button type="submit" className={liked ? "" : "secondary"}>
                    {liked ? "♥ Liked" : "♡ Like"}
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
