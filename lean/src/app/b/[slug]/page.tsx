import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/Nav";
import {
  requestToJoin,
  decideRequest,
  leaveBand,
  setThreshold,
} from "./actions";

export const dynamic = "force-dynamic";

type BandInstrument = {
  name: string;
  display_name: string;
  icon_emoji: string;
  player_count: number;
};

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
          Members only: the song pool, notes, and recordings. You can see the
          name, size, and instruments above.
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
}: {
  bandId: string;
  slug: string;
  threshold: number;
  isPrivileged: boolean;
}) {
  const supabase = await createClient();

  const [poolRes, pendingRes, membersRes] = await Promise.all([
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
      .select("role, joined_at, profiles(display_name)")
      .eq("band_id", bandId)
      .order("joined_at"),
  ]);

  type PoolRow = {
    song_id: string;
    title: string;
    artist: string;
    album_art_url: string | null;
    liker_count: number;
    member_count: number;
  };
  type MemberRow = { role: string; joined_at: string; profiles: { display_name: string } | null };
  type PendingRow = { id: string; user_id: string; profiles: { display_name: string } | null };

  const pool = (poolRes.data ?? []) as unknown as PoolRow[];
  const members = (membersRes.data ?? []) as unknown as MemberRow[];
  const pending = (pendingRes.data ?? []) as unknown as PendingRow[];

  return (
    <>
      <h2>Song pool</h2>
      <p className="muted">
        Songs liked by at least {threshold} of you. Recomputed live as members
        and likes change.
      </p>
      <div className="panel">
        {pool.map((s) => (
          <div key={s.song_id} className="song">
            {s.album_art_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.album_art_url} alt="" />
            )}
            <div className="grow">
              <div>{s.title}</div>
              <div className="muted">{s.artist}</div>
            </div>
            <span className="pill">
              liked by {s.liker_count} of {s.member_count}
            </span>
          </div>
        ))}
        {pool.length === 0 && (
          <p className="muted">
            Nothing in the pool yet — get more members to like the same songs.
          </p>
        )}
      </div>

      <h2>Members</h2>
      <div className="panel list">
        {members.map((m, i) => (
          <div key={i} className="row" style={{ justifyContent: "space-between" }}>
            <span>{m.profiles?.display_name ?? "Member"}</span>
            <span className="pill">{m.role}</span>
          </div>
        ))}
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
