import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const DEMO_EMAIL = "demo@learn-our-favs.app";
const AJ_ID = "5bc8b78f-86c5-4e76-b930-b6d2a2728ee8";

/**
 * Resets the shared demo account back to its baseline seed so drop-in demo
 * visitors can't interfere with each other over time.
 *
 * Triggers:
 *   - Vercel Cron (daily @ 04:00 UTC — Hobby-plan cap).
 *   - /auth/demo calls this on every entry (best-effort, non-blocking) so a
 *     fresh visitor always starts from baseline.
 *   - Manual: POST with `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(request: Request) {
  return handle(request);
}
export async function POST(request: Request) {
  return handle(request);
}

async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  try {
    const result = await resetDemo();
    return NextResponse.json({ reset: true, at: new Date().toISOString(), ...result });
  } catch (err) {
    console.error("[demo-reset] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

/**
 * Idempotent reset. Exported so /auth/demo can call it directly (bypassing
 * the HTTP secret gate) without a self-fetch round-trip.
 */
export async function resetDemo() {
  const admin = createAdminClient();

  const list = await admin.auth.admin.listUsers({ perPage: 200 });
  if (list.error) throw list.error;
  const demo = list.data.users.find((u) => u.email === DEMO_EMAIL);
  if (!demo) throw new Error("demo user missing — run scripts/seed-demo.mjs");
  const demoId = demo.id;

  // Fake user ids (looked up by email so this route is decoupled from the
  // hard-coded UUIDs baked at seed time).
  const emailToId = new Map(list.data.users.map((u) => [u.email ?? "", u.id]));
  const MILO = emailToId.get("milo.demo@learn-our-favs.app");
  const SASHA = emailToId.get("sasha.demo@learn-our-favs.app");
  const JUNO = emailToId.get("juno.demo@learn-our-favs.app");
  const OTIS = emailToId.get("otis.demo@learn-our-favs.app");

  const [{ data: instruments }, { data: bands }, { data: songs }] = await Promise.all([
    admin.from("instruments").select("id, name"),
    admin
      .from("bands")
      .select("id, name")
      .in("name", [
        "Weekend Warriors",
        "Bedroom Studio Club",
        "Piano Bar Nights",
        "The Basement Session",
        "Living Room Jam",
        "Studio 6 Collective",
      ]),
    admin.from("songs").select("id").order("created_at").limit(25),
  ]);
  const byInstrument = Object.fromEntries((instruments ?? []).map((i) => [i.name, i.id]));
  const byBand = Object.fromEntries((bands ?? []).map((b) => [b.name, b.id]));

  // --- clean demo-user state ------------------------------------------------
  await admin.from("song_likes").delete().eq("user_id", demoId);
  await admin.from("difficulty_ratings").delete().eq("user_id", demoId);
  await admin.from("join_requests").delete().eq("user_id", demoId);
  await admin.from("instrument_proficiency").delete().eq("user_id", demoId);
  await admin.from("song_comments").delete().eq("user_id", demoId);
  // Delete recordings uploaded by demo; storage objects are cleaned separately.
  const { data: demoRecs } = await admin
    .from("recordings")
    .select("id, storage_path")
    .eq("user_id", demoId);
  if (demoRecs?.length) {
    await admin
      .storage
      .from("recordings")
      .remove(demoRecs.map((r) => r.storage_path));
    await admin
      .from("recordings")
      .delete()
      .in(
        "id",
        demoRecs.map((r) => r.id),
      );
  }

  // Remove demo from every band, then reinstate baseline memberships. This
  // also cleans up any band demo joined via the join-request flow during a
  // tour.
  await admin.from("band_memberships").delete().eq("user_id", demoId);

  // Delete any stray bands demo created during a tour (owner-only, name not
  // in the whitelist). We match by name being none of the seeded bands and
  // the only surviving membership belonging to demo.
  const { data: allBands } = await admin.from("bands").select("id, name");
  const seededNames = new Set(Object.keys(byBand));
  const strayCandidates = (allBands ?? []).filter((b) => !seededNames.has(b.name));
  if (strayCandidates.length) {
    // A band is "stray" if it has zero remaining members (we just deleted
    // demo's). Delete those bands.
    for (const b of strayCandidates) {
      const { count } = await admin
        .from("band_memberships")
        .select("*", { count: "exact", head: true })
        .eq("band_id", b.id);
      if ((count ?? 0) === 0) {
        await admin.from("bands").delete().eq("id", b.id);
      }
    }
  }

  // --- restore baseline demo state ------------------------------------------
  // Instruments.
  await admin.from("instrument_proficiency").insert([
    { user_id: demoId, instrument_id: byInstrument.guitar, skill_level: "intermediate" },
    { user_id: demoId, instrument_id: byInstrument.piano, skill_level: "beginner" },
  ]);
  // Likes.
  if (songs?.length) {
    await admin.from("song_likes").insert(
      songs.map((s) => ({ user_id: demoId, song_id: s.id, origin: "top_tracks" as const })),
    );
  }
  // Memberships.
  const memberships: { band_id: string; user_id: string; role: "owner" | "admin" | "member" }[] = [];
  if (byBand["Weekend Warriors"])
    memberships.push({ band_id: byBand["Weekend Warriors"], user_id: demoId, role: "member" });
  if (byBand["Bedroom Studio Club"])
    memberships.push({ band_id: byBand["Bedroom Studio Club"], user_id: demoId, role: "admin" });
  if (byBand["Piano Bar Nights"])
    memberships.push({ band_id: byBand["Piano Bar Nights"], user_id: demoId, role: "member" });
  if (byBand["Living Room Jam"])
    memberships.push({ band_id: byBand["Living Room Jam"], user_id: demoId, role: "owner" });
  if (memberships.length) await admin.from("band_memberships").insert(memberships);

  // Pending join request from demo → The Basement Session.
  if (byBand["The Basement Session"]) {
    await admin
      .from("join_requests")
      .insert({ band_id: byBand["The Basement Session"], user_id: demoId, status: "pending" });
  }

  // Pending join request from Milo → demo-owned Living Room Jam, so the
  // approve/refuse UI is populated when demo logs in.
  if (MILO && byBand["Living Room Jam"]) {
    // Clear any prior decided rows so the upsert-like insert doesn't collide.
    await admin
      .from("join_requests")
      .delete()
      .eq("band_id", byBand["Living Room Jam"])
      .eq("user_id", MILO)
      .eq("status", "pending");
    await admin
      .from("join_requests")
      .insert({ band_id: byBand["Living Room Jam"], user_id: MILO, status: "pending" });
  }

  // Ensure demo has Spotify — copy AJ's refresh token if we lost it.
  const { data: demoConn } = await admin
    .from("spotify_connections")
    .select("user_id")
    .eq("user_id", demoId)
    .maybeSingle();
  if (!demoConn) {
    const { data: ajConn } = await admin
      .from("spotify_connections")
      .select("refresh_token, scope")
      .eq("user_id", AJ_ID)
      .maybeSingle();
    if (ajConn) {
      await admin.from("spotify_connections").insert({
        user_id: demoId,
        refresh_token: ajConn.refresh_token,
        scope: ajConn.scope,
      });
    }
  }

  return { demo_user_id: demoId, bands_reinstated: memberships.length };
}
