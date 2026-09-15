import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const DEMO_EMAIL = "demo@learn-our-favs.app";

/**
 * Resets the shared demo account back to its baseline seed so drop-in
 * demo visitors can't interfere with each other over time.
 *
 * Triggers:
 *   - Vercel Cron (see vercel.json). Vercel signs cron requests with
 *     the CRON_SECRET header, verified below.
 *   - Manual POST with `Authorization: Bearer <CRON_SECRET>` for on-demand reset.
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

  const admin = createAdminClient();
  const list = await admin.auth.admin.listUsers({ perPage: 200 });
  if (list.error) return NextResponse.json({ error: list.error.message }, { status: 500 });
  const demo = list.data.users.find((u) => u.email === DEMO_EMAIL);
  if (!demo) return NextResponse.json({ error: "demo user missing" }, { status: 500 });

  // Wipe demo user's mutable state.
  await admin.from("song_likes").delete().eq("user_id", demo.id);
  await admin.from("difficulty_ratings").delete().eq("user_id", demo.id);
  await admin.from("join_requests").delete().eq("user_id", demo.id);
  // Baseline instruments (guitar intermediate, piano beginner).
  const { data: instruments } = await admin.from("instruments").select("id, name");
  const byName = Object.fromEntries((instruments ?? []).map((i) => [i.name, i.id]));
  await admin.from("instrument_proficiency").delete().eq("user_id", demo.id);
  await admin.from("instrument_proficiency").insert([
    { user_id: demo.id, instrument_id: byName.guitar, skill_level: "intermediate" },
    { user_id: demo.id, instrument_id: byName.piano, skill_level: "beginner" },
  ]);
  // Re-like the top 25 songs (whatever the pool currently is).
  const { data: songs } = await admin
    .from("songs")
    .select("id")
    .order("created_at")
    .limit(25);
  if (songs?.length) {
    await admin.from("song_likes").insert(
      songs.map((s) => ({ user_id: demo.id, song_id: s.id, origin: "top_tracks" as const })),
    );
  }
  // Baseline pending join request into "The Basement Session" for the demo tour.
  const { data: basement } = await admin
    .from("bands")
    .select("id")
    .eq("name", "The Basement Session")
    .maybeSingle();
  if (basement) {
    await admin
      .from("join_requests")
      .insert({ band_id: basement.id, user_id: demo.id, status: "pending" });
  }
  return NextResponse.json({ reset: true, at: new Date().toISOString() });
}
