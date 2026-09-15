import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Nav } from "@/components/Nav";
import {
  requestToJoin,
  decideRequest,
  leaveBand,
  setThreshold,
} from "./actions";
import {
  addSongComment,
  deleteSongComment,
  saveDifficultyRating,
  uploadRecording,
  deleteRecording,
} from "./song-actions";

export const dynamic = "force-dynamic";

type BandInstrument = {
  name: string;
  display_name: string;
  icon_emoji: string;
  player_count: number;
};

type Instrument = { id: string; name: string; display_name: string; icon_emoji: string };

export default async function BandPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: band } = await supabase
    .from("bands")
    .select("id, slug, name, overlap_threshold")
    .eq("slug", slug)
    .maybeSingle();
  if (!band) notFound();

  const [summaryRes, { data: bandInstruments }] = await Promise.all([
    supabase.rpc("band_public_summary", { band: band.id }).single(),
    supabase.rpc("band_instruments", { band: band.id }),
  ]);
  const summary = summaryRes.data as { member_count: number } | null;
  const memberCount = summary?.member_count ?? 0;

  // Public preview for anonymous users.
  if (!user) {
    return (
      <div className="stage">
        <div className="stage-inner narrow">
          <div className="band-header">
            <h1 className="band-name">{band.name}</h1>
            <p className="band-meta">
              /b/{band.slug} · {memberCount} member{memberCount === 1 ? "" : "s"}
            </p>
          </div>
          <BandInstrumentsPanel instruments={(bandInstruments ?? []) as BandInstrument[]} />
          <div className="cta-card">
            <p className="muted" style={{ marginTop: 0 }}>
              Sign in to request to join and see the shared song pool.
            </p>
            <Link href="/" className="btn">Sign in</Link>
          </div>
        </div>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();

  const { data: myMembership } = await supabase
    .from("band_memberships")
    .select("role")
    .eq("band_id", band.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const isMember = Boolean(myMembership);
  const isPrivileged =
    myMembership?.role === "owner" || myMembership?.role === "admin";

  return (
    <>
      <Nav
        displayName={profile?.display_name ?? "You"}
        avatarUrl={profile?.avatar_url}
      />

      <div className="band-header">
        <h1 className="band-name">{band.name}</h1>
        <p className="band-meta">
          /b/{band.slug} · {memberCount} member{memberCount === 1 ? "" : "s"}
        </p>
      </div>

      <BandInstrumentsPanel instruments={(bandInstruments ?? []) as BandInstrument[]} />

      {!isMember ? (
        <NonMemberView bandId={band.id} slug={band.slug} userId={user.id} />
      ) : (
        <MemberView
          bandId={band.id}
          slug={band.slug}
          threshold={band.overlap_threshold}
          isPrivileged={isPrivileged}
          userId={user.id}
        />
      )}
    </>
  );
}

function BandInstrumentsPanel({ instruments }: { instruments: BandInstrument[] }) {
  return (
    <section className="section">
      <h2 className="section-title">Instruments in this band</h2>
      <div className="band-instruments">
        {instruments.length === 0 ? (
          <span className="muted">None declared yet</span>
        ) : (
          instruments.map((i) => (
            <span key={i.name} className="instrument-pill">
              <span className="instrument-pill-emoji">{i.icon_emoji}</span>
              {i.display_name}
              <span className="instrument-pill-count">×{i.player_count}</span>
            </span>
          ))
        )}
      </div>
    </section>
  );
}

async function NonMemberView({
  bandId,
  slug,
  userId,
}: {
  bandId: string;
  slug: string;
  userId: string;
}) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("join_requests")
    .select("status")
    .eq("band_id", bandId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <>
      <h2>Join this band</h2>
      <div className="panel">
        <p className="muted">
          Members only: the song pool, notes, comments, and recordings. You can
          see the name, size, and instruments above.
        </p>
        {existing?.status === "pending" ? (
          <p>Your request is pending.</p>
        ) : (
          <form action={requestToJoin}>
            <input type="hidden" name="bandId" value={bandId} />
            <input type="hidden" name="slug" value={slug} />
            <button type="submit">Request to join</button>
          </form>
        )}
      </div>
    </>
  );
}

async function MemberView({
  bandId,
  slug,
  threshold,
  isPrivileged,
  userId,
}: {
  bandId: string;
  slug: string;
  threshold: number;
  isPrivileged: boolean;
  userId: string;
}) {
  const supabase = await createClient();

  const [poolRes, pendingRes, membersRes, instrumentsRes, profRes] = await Promise.all([
    supabase.rpc("band_pool", { band: bandId }),
    isPrivileged
      ? supabase
          .from("join_requests")
          .select("id, user_id, profiles(display_name)")
          .eq("band_id", bandId)
          .eq("status", "pending")
      : Promise.resolve({ data: [] as unknown[] }),
    supabase
      .from("band_memberships")
      .select("user_id, role, joined_at, profiles(display_name)")
      .eq("band_id", bandId)
      .order("joined_at"),
    supabase.from("instruments").select("id, name, display_name, icon_emoji").order("display_name"),
    supabase
      .from("instrument_proficiency")
      .select("user_id, instrument_id, skill_level, instruments(display_name, icon_emoji)"),
  ]);

  type PoolRow = {
    song_id: string;
    title: string;
    artist: string;
    album_art_url: string | null;
    liker_count: number;
    member_count: number;
  };
  type MemberRow = {
    user_id: string;
    role: string;
    joined_at: string;
    profiles: { display_name: string } | null;
  };
  type PendingRow = { id: string; user_id: string; profiles: { display_name: string } | null };
  type ProficiencyRow = {
    user_id: string;
    instrument_id: string;
    skill_level: string;
    instruments: { display_name: string; icon_emoji: string } | null;
  };

  const pool = (poolRes.data ?? []) as unknown as PoolRow[];
  const members = (membersRes.data ?? []) as unknown as MemberRow[];
  const pending = (pendingRes.data ?? []) as unknown as PendingRow[];
  const instruments = (instrumentsRes.data ?? []) as Instrument[];
  const proficiency = (profRes.data ?? []) as unknown as ProficiencyRow[];

  const songIds = pool.map((s) => s.song_id);

  // Comments + ratings + recordings for the pool songs, in bulk.
  const [commentsRes, ratingsRes, recordingsRes] = await Promise.all([
    songIds.length
      ? supabase
          .from("song_comments")
          .select("id, song_id, user_id, body, created_at, profiles(display_name)")
          .eq("band_id", bandId)
          .in("song_id", songIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as unknown[] }),
    songIds.length
      ? supabase
          .from("difficulty_ratings")
          .select(
            "id, user_id, song_id, instrument_id, rating, note, instruments(display_name, icon_emoji), profiles(display_name)",
          )
          .in("song_id", songIds)
      : Promise.resolve({ data: [] as unknown[] }),
    songIds.length
      ? supabase
          .from("recordings")
          .select("id, song_id, user_id, title, storage_path, mime_type, duration_seconds, created_at, profiles(display_name)")
          .eq("band_id", bandId)
          .in("song_id", songIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  type CommentRow = {
    id: string;
    song_id: string;
    user_id: string;
    body: string;
    created_at: string;
    profiles: { display_name: string } | null;
  };
  type RatingRow = {
    id: string;
    user_id: string;
    song_id: string;
    instrument_id: string;
    rating: number;
    note: string | null;
    instruments: { display_name: string; icon_emoji: string } | null;
    profiles: { display_name: string } | null;
  };
  type RecordingRow = {
    id: string;
    song_id: string;
    user_id: string;
    title: string;
    storage_path: string;
    mime_type: string;
    duration_seconds: number | null;
    created_at: string;
    profiles: { display_name: string } | null;
  };

  const comments = (commentsRes.data ?? []) as unknown as CommentRow[];
  const ratings = (ratingsRes.data ?? []) as unknown as RatingRow[];
  const recordings = (recordingsRes.data ?? []) as unknown as RecordingRow[];

  // Sign URLs for playback (uses service role; membership already checked).
  const admin = createAdminClient();
  const signedUrls = new Map<string, string>();
  if (recordings.length) {
    const { data: signed } = await admin.storage
      .from("recordings")
      .createSignedUrls(
        recordings.map((r) => r.storage_path),
        60 * 60,
      );
    (signed ?? []).forEach((s) => {
      if (s.path && s.signedUrl) signedUrls.set(s.path, s.signedUrl);
    });
  }

  // Group everything by song_id for easy per-song rendering.
  const commentsBySong = groupBy(comments, (c) => c.song_id);
  const ratingsBySong = groupBy(ratings, (r) => r.song_id);
  const recordingsBySong = groupBy(recordings, (r) => r.song_id);
  const profBy = new Map<string, ProficiencyRow[]>();
  proficiency.forEach((p) => {
    const list = profBy.get(p.user_id) ?? [];
    list.push(p);
    profBy.set(p.user_id, list);
  });

  return (
    <>
      <h2>Song pool</h2>
      <p className="muted">
        Songs liked by at least {threshold} of you. Recomputed live as members
        and likes change.
      </p>
      <div className="panel">
        {pool.length === 0 && (
          <p className="muted">
            Nothing in the pool yet — get more members to like the same songs.
          </p>
        )}
        {pool.map((s) => {
          const songRatings = ratingsBySong.get(s.song_id) ?? [];
          const songComments = commentsBySong.get(s.song_id) ?? [];
          const songRecordings = recordingsBySong.get(s.song_id) ?? [];
          const avg =
            songRatings.length > 0
              ? (
                  songRatings.reduce((a, r) => a + r.rating, 0) / songRatings.length
                ).toFixed(1)
              : null;
          return (
            <details key={s.song_id} className="song-details">
              <summary className="song">
                {s.album_art_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.album_art_url} alt="" />
                )}
                <div className="grow">
                  <div>{s.title}</div>
                  <div className="muted">{s.artist}</div>
                </div>
                <div className="song-meta">
                  <span className="pill">
                    liked by {s.liker_count} of {s.member_count}
                  </span>
                  {avg && (
                    <span className="pill" title={`${songRatings.length} rating${songRatings.length === 1 ? "" : "s"}`}>
                      difficulty {avg}★
                    </span>
                  )}
                  {songRecordings.length > 0 && (
                    <span className="pill">🎙 {songRecordings.length}</span>
                  )}
                  {songComments.length > 0 && (
                    <span className="pill">💬 {songComments.length}</span>
                  )}
                </div>
              </summary>

              <div className="song-expand">
                <SongCommentsBlock
                  bandId={bandId}
                  songId={s.song_id}
                  slug={slug}
                  comments={songComments}
                  userId={userId}
                />
                <SongRatingsBlock
                  songId={s.song_id}
                  slug={slug}
                  ratings={songRatings}
                  instruments={instruments}
                  userId={userId}
                />
                <SongRecordingsBlock
                  bandId={bandId}
                  songId={s.song_id}
                  slug={slug}
                  recordings={songRecordings}
                  signedUrls={signedUrls}
                  userId={userId}
                  isPrivileged={isPrivileged}
                />
              </div>
            </details>
          );
        })}
      </div>

      <h2>Members</h2>
      <div className="panel list">
        {members.map((m) => {
          const theirProf = profBy.get(m.user_id) ?? [];
          return (
            <div key={m.user_id} className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div className="row" style={{ gap: 8 }}>
                  <span>{m.profiles?.display_name ?? "Member"}</span>
                  <span className="pill">{m.role}</span>
                </div>
                {theirProf.length > 0 && (
                  <div className="row" style={{ gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                    {theirProf.map((p) => (
                      <span key={p.instrument_id} className="instrument-pill">
                        <span className="instrument-pill-emoji">
                          {p.instruments?.icon_emoji}
                        </span>
                        {p.instruments?.display_name}
                        <span className="instrument-pill-count">{p.skill_level}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isPrivileged && (
        <>
          <h2>Pending requests</h2>
          <div className="panel list">
            {pending.map((r) => (
              <div key={r.id} className="row" style={{ justifyContent: "space-between" }}>
                <span>{r.profiles?.display_name ?? "Someone"}</span>
                <div className="row">
                  <form action={decideRequest}>
                    <input type="hidden" name="requestId" value={r.id} />
                    <input type="hidden" name="bandId" value={bandId} />
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="requesterId" value={r.user_id} />
                    <input type="hidden" name="approve" value="true" />
                    <button type="submit">Approve</button>
                  </form>
                  <form action={decideRequest}>
                    <input type="hidden" name="requestId" value={r.id} />
                    <input type="hidden" name="bandId" value={bandId} />
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="requesterId" value={r.user_id} />
                    <input type="hidden" name="approve" value="false" />
                    <button type="submit" className="secondary">Refuse</button>
                  </form>
                </div>
              </div>
            ))}
            {pending.length === 0 && <span className="muted">None.</span>}
          </div>

          <h2>Overlap threshold</h2>
          <form action={setThreshold} className="panel row">
            <input type="hidden" name="bandId" value={bandId} />
            <input type="hidden" name="slug" value={slug} />
            <input type="text" name="threshold" defaultValue={threshold} className="grow" />
            <button type="submit" className="secondary">Update</button>
          </form>
        </>
      )}

      <h2 style={{ marginTop: 32 }}>Leave</h2>
      <form action={leaveBand} className="panel">
        <input type="hidden" name="bandId" value={bandId} />
        <button type="submit" className="secondary">Leave this band</button>
      </form>
    </>
  );
}

// ---------------------------------------------------------------------------
// Per-song helper blocks.
// ---------------------------------------------------------------------------

function SongCommentsBlock({
  bandId,
  songId,
  slug,
  comments,
  userId,
}: {
  bandId: string;
  songId: string;
  slug: string;
  comments: {
    id: string;
    user_id: string;
    body: string;
    created_at: string;
    profiles: { display_name: string } | null;
  }[];
  userId: string;
}) {
  return (
    <div className="song-block">
      <h4>Comments</h4>
      {comments.length === 0 && <p className="muted small">No comments yet.</p>}
      <div className="list">
        {comments.map((c) => (
          <div key={c.id} className="comment">
            <div className="comment-head">
              <strong>{c.profiles?.display_name ?? "Member"}</strong>
              <span className="muted small">
                {new Date(c.created_at).toLocaleDateString()}
              </span>
              {c.user_id === userId && (
                <form action={deleteSongComment} style={{ marginLeft: "auto" }}>
                  <input type="hidden" name="commentId" value={c.id} />
                  <input type="hidden" name="slug" value={slug} />
                  <button type="submit" className="link-btn">delete</button>
                </form>
              )}
            </div>
            <div>{c.body}</div>
          </div>
        ))}
      </div>
      <form action={addSongComment} className="row" style={{ marginTop: 8 }}>
        <input type="hidden" name="bandId" value={bandId} />
        <input type="hidden" name="songId" value={songId} />
        <input type="hidden" name="slug" value={slug} />
        <input type="text" name="body" placeholder="Leave a comment…" className="grow" required />
        <button type="submit" className="secondary">Post</button>
      </form>
    </div>
  );
}

function SongRatingsBlock({
  songId,
  slug,
  ratings,
  instruments,
  userId,
}: {
  songId: string;
  slug: string;
  ratings: {
    id: string;
    user_id: string;
    instrument_id: string;
    rating: number;
    note: string | null;
    instruments: { display_name: string; icon_emoji: string } | null;
    profiles: { display_name: string } | null;
  }[];
  instruments: Instrument[];
  userId: string;
}) {
  const myRatings = ratings.filter((r) => r.user_id === userId);
  const othersRatings = ratings.filter((r) => r.user_id !== userId);
  const myRatingFor = (instrumentId: string) =>
    myRatings.find((r) => r.instrument_id === instrumentId);

  return (
    <div className="song-block">
      <h4>Difficulty</h4>
      {othersRatings.length > 0 && (
        <div className="list" style={{ marginBottom: 8 }}>
          {othersRatings.map((r) => (
            <div key={r.id} className="rating-row">
              <span>
                {r.profiles?.display_name ?? "Member"} on{" "}
                {r.instruments?.icon_emoji} {r.instruments?.display_name}
              </span>
              <span className="stars">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
              {r.note && <div className="muted small">{r.note}</div>}
            </div>
          ))}
        </div>
      )}
      <details>
        <summary className="link-btn">
          {myRatings.length ? "Update your rating" : "Rate this song"}
        </summary>
        <div className="list" style={{ marginTop: 8 }}>
          {instruments.map((i) => {
            const current = myRatingFor(i.id);
            return (
              <form
                key={i.id}
                action={saveDifficultyRating}
                className="rating-form"
              >
                <input type="hidden" name="songId" value={songId} />
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="instrumentId" value={i.id} />
                <span>{i.icon_emoji} {i.display_name}</span>
                <select name="rating" defaultValue={current?.rating ?? ""} required>
                  <option value="" disabled>—</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{"★".repeat(n)}</option>
                  ))}
                </select>
                <input
                  type="text"
                  name="note"
                  defaultValue={current?.note ?? ""}
                  placeholder="Note (optional)"
                  className="grow"
                />
                <button type="submit" className="secondary">Save</button>
              </form>
            );
          })}
        </div>
      </details>
    </div>
  );
}

function SongRecordingsBlock({
  bandId,
  songId,
  slug,
  recordings,
  signedUrls,
  userId,
  isPrivileged,
}: {
  bandId: string;
  songId: string;
  slug: string;
  recordings: {
    id: string;
    user_id: string;
    title: string;
    storage_path: string;
    mime_type: string;
    duration_seconds: number | null;
    created_at: string;
    profiles: { display_name: string } | null;
  }[];
  signedUrls: Map<string, string>;
  userId: string;
  isPrivileged: boolean;
}) {
  return (
    <div className="song-block">
      <h4>Recordings</h4>
      {recordings.length === 0 && (
        <p className="muted small">No recordings yet.</p>
      )}
      <div className="list">
        {recordings.map((r) => {
          const url = signedUrls.get(r.storage_path);
          const canDelete = r.user_id === userId || isPrivileged;
          return (
            <div key={r.id} className="recording">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div>
                  <strong>{r.title}</strong>{" "}
                  <span className="muted small">
                    by {r.profiles?.display_name ?? "Member"} ·{" "}
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                {canDelete && (
                  <form action={deleteRecording}>
                    <input type="hidden" name="recordingId" value={r.id} />
                    <input type="hidden" name="storagePath" value={r.storage_path} />
                    <input type="hidden" name="slug" value={slug} />
                    <button type="submit" className="link-btn">delete</button>
                  </form>
                )}
              </div>
              {url ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <audio controls src={url} preload="none" style={{ width: "100%", marginTop: 6 }} />
              ) : (
                <p className="muted small">Playback unavailable.</p>
              )}
            </div>
          );
        })}
      </div>
      <form action={uploadRecording} className="row" style={{ marginTop: 8, flexWrap: "wrap" }}>
        <input type="hidden" name="bandId" value={bandId} />
        <input type="hidden" name="songId" value={songId} />
        <input type="hidden" name="slug" value={slug} />
        <input type="text" name="title" placeholder="Take title" style={{ minWidth: 120 }} />
        <input type="file" name="file" accept="audio/*" required />
        <button type="submit" className="secondary">Upload take</button>
      </form>
    </div>
  );
}

function groupBy<T, K>(items: T[], keyFn: (t: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const item of items) {
    const k = keyFn(item);
    const list = m.get(k) ?? [];
    list.push(item);
    m.set(k, list);
  }
  return m;
}
