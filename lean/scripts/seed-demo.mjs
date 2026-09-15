// One-off demo seeder for the deployed learn-our-favs Supabase project.
// Idempotent: safe to re-run.
//
// See docs/DEMO-MODE.md for the full seeded shape and why.
//
// Usage:
//   cd lean
//   vercel env pull .env.production
//   # regenerate the track list (needs ajtwisleton's Spotify refresh token
//   # already in the deployed spotify_connections table):
//   #   curl the token endpoint with the refresh_token, then
//   #   curl https://api.spotify.com/v1/me/top/tracks?time_range=long_term&limit=40
//   #   → save the response body to /tmp/songs.json in the shape
//   #     [{id, name, artist, isrc, album_art_url}, ...]
//   node scripts/seed-demo.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// Minimal .env loader — avoids adding dotenv as a dep.
for (const line of readFileSync(".env.production", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)="?([^"]*)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("missing supabase env");

const AJ_ID = "5bc8b78f-86c5-4e76-b930-b6d2a2728ee8"; // ajtwisleton@gmail.com
const REBECCA_ID = "562443da-df4f-41f9-80c9-628a0f07ac4c";

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---- fake users (stable emails so re-runs are idempotent) -----------------
const FAKE_USERS = [
  { email: "milo.demo@learn-our-favs.app", display_name: "Milo Kwan" },
  { email: "sasha.demo@learn-our-favs.app", display_name: "Sasha Ortega" },
  { email: "juno.demo@learn-our-favs.app", display_name: "Juno Fielding" },
  { email: "otis.demo@learn-our-favs.app", display_name: "Otis Grady" },
  { email: "demo@learn-our-favs.app", display_name: "Demo Guest" }, // for /demo login
];

async function ensureUser({ email, display_name }) {
  const list = await sb.auth.admin.listUsers({ perPage: 200 });
  if (list.error) throw list.error;
  const found = list.data.users.find((u) => u.email === email);
  let id;
  if (found) {
    id = found.id;
  } else {
    const { data, error } = await sb.auth.admin.createUser({
      email,
      email_confirm: true,
      password: "demo-account-" + crypto.randomUUID(),
      user_metadata: { full_name: display_name },
    });
    if (error) throw error;
    id = data.user.id;
    console.log(`created auth user ${email} = ${id}`);
  }
  // Ensure profile display_name matches (handle_new_user trigger runs on insert,
  // but re-runs shouldn't fight over the name).
  await sb.from("profiles").upsert({ id, display_name }).throwOnError();
  return id;
}

async function upsertSongs(tracks) {
  const rows = tracks.map((t) => ({
    title: t.name,
    artist: t.artist,
    isrc: t.isrc || null,
    spotify_track_id: t.id,
    album_art_url: t.album_art_url,
  }));
  // Upsert on spotify_track_id (unique).
  const { data, error } = await sb
    .from("songs")
    .upsert(rows, { onConflict: "spotify_track_id" })
    .select("id, spotify_track_id");
  if (error) throw error;
  const byTrackId = new Map(data.map((r) => [r.spotify_track_id, r.id]));
  return byTrackId;
}

async function getInstruments() {
  const { data, error } = await sb
    .from("instruments")
    .select("id, name");
  if (error) throw error;
  const byName = Object.fromEntries(data.map((r) => [r.name, r.id]));
  return byName;
}

async function ensureProficiency(userId, instrumentId, skill) {
  await sb
    .from("instrument_proficiency")
    .upsert(
      { user_id: userId, instrument_id: instrumentId, skill_level: skill },
      { onConflict: "user_id,instrument_id" },
    )
    .throwOnError();
}

async function ensureLike(userId, songId, origin = "top_tracks") {
  await sb
    .from("song_likes")
    .upsert(
      { user_id: userId, song_id: songId, origin },
      { onConflict: "user_id,song_id" },
    )
    .throwOnError();
}

async function ensureBand(name, overlapThreshold = 2) {
  const existing = await sb
    .from("bands")
    .select("id, slug, name, overlap_threshold")
    .eq("name", name)
    .maybeSingle();
  if (existing.data) return existing.data;
  // Generate slug server-side via the function.
  const { data: slugRes, error: slugErr } = await sb.rpc("generate_band_slug");
  if (slugErr) throw slugErr;
  const { data, error } = await sb
    .from("bands")
    .insert({ name, slug: slugRes, overlap_threshold: overlapThreshold })
    .select("id, slug, name, overlap_threshold")
    .single();
  if (error) throw error;
  console.log(`created band "${name}" at /b/${data.slug}`);
  return data;
}

async function ensureMembership(bandId, userId, role) {
  await sb
    .from("band_memberships")
    .upsert(
      { band_id: bandId, user_id: userId, role },
      { onConflict: "band_id,user_id" },
    )
    .throwOnError();
}

async function ensurePendingJoinRequest(bandId, userId) {
  const existing = await sb
    .from("join_requests")
    .select("id, status")
    .eq("band_id", bandId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .maybeSingle();
  if (existing.data) return;
  await sb
    .from("join_requests")
    .insert({ band_id: bandId, user_id: userId, status: "pending" })
    .throwOnError();
}

async function ensureBandNote(bandId, title, body, songId = null) {
  const existing = await sb
    .from("band_notes")
    .select("id")
    .eq("band_id", bandId)
    .eq("title", title)
    .maybeSingle();
  if (existing.data) return;
  await sb
    .from("band_notes")
    .insert({ band_id: bandId, title, body, song_id: songId })
    .throwOnError();
}

// ---- main -----------------------------------------------------------------
const songsRaw = JSON.parse(readFileSync("/tmp/songs.json", "utf8"));
console.log(`loaded ${songsRaw.length} tracks from /tmp/songs.json`);

const instruments = await getInstruments();
console.log("instruments:", Object.keys(instruments).join(", "));

// 1. Ensure fake auth users + profiles.
const userIds = {};
for (const u of FAKE_USERS) {
  userIds[u.email] = await ensureUser(u);
}
const MILO = userIds["milo.demo@learn-our-favs.app"];
const SASHA = userIds["sasha.demo@learn-our-favs.app"];
const JUNO = userIds["juno.demo@learn-our-favs.app"];
const OTIS = userIds["otis.demo@learn-our-favs.app"];
const DEMO = userIds["demo@learn-our-favs.app"];

// 2. Songs — upsert all of ajtwisleton's top tracks.
const songIdByTrackId = await upsertSongs(songsRaw);
console.log(`upserted ${songIdByTrackId.size} songs`);
const songIds = songsRaw.map((t) => songIdByTrackId.get(t.id));

// 3. Instrument proficiencies for the fake crew + demo user.
await ensureProficiency(MILO, instruments.drums, "advanced");
await ensureProficiency(MILO, instruments.guitar, "intermediate");
await ensureProficiency(SASHA, instruments.bass, "intermediate");
await ensureProficiency(SASHA, instruments.piano, "beginner");
await ensureProficiency(JUNO, instruments.piano, "advanced");
await ensureProficiency(JUNO, instruments.ukulele, "intermediate");
await ensureProficiency(OTIS, instruments.guitar, "advanced");
await ensureProficiency(OTIS, instruments.drums, "beginner");
await ensureProficiency(DEMO, instruments.guitar, "intermediate");
await ensureProficiency(DEMO, instruments.piano, "beginner");

// 4. Likes — deliberate overlap patterns so the pool is meaningful.
// ajtwisleton likes top 30. Each fake user likes a large overlapping subset.
const ajTop30 = songIds.slice(0, 30);
for (const id of ajTop30) await ensureLike(AJ_ID, id);

// Milo likes 0..24 (25 overlaps with AJ)
for (const id of songIds.slice(0, 25)) await ensureLike(MILO, id);
// Sasha likes 5..29 (25 overlaps)
for (const id of songIds.slice(5, 30)) await ensureLike(SASHA, id);
// Juno likes 10..34 (20 overlaps with AJ)
for (const id of songIds.slice(10, 35)) await ensureLike(JUNO, id);
// Otis likes 0..14 + 25..39 (heavy overlap on top + tail)
for (const id of [...songIds.slice(0, 15), ...songIds.slice(25, 40)])
  await ensureLike(OTIS, id);
// Demo user gets songs 0..24 to match AJ closely.
for (const id of songIds.slice(0, 25)) await ensureLike(DEMO, id);
// Rebecca — small handful so she shows overlap in her band.
for (const id of songIds.slice(0, 8)) await ensureLike(REBECCA_ID, id);

// 5. Bands.
const band1 = await ensureBand("Weekend Warriors", 3);      // AJ owner + full crew
const band2 = await ensureBand("Bedroom Studio Club", 2);   // Milo owner, AJ + Sasha
const band3 = await ensureBand("Piano Bar Nights", 2);      // Juno owner, AJ + Rebecca
const band4 = await ensureBand("The Basement Session", 2);  // Otis owner; AJ NOT a member — for demo of join-request flow

await ensureMembership(band1.id, AJ_ID, "owner");
await ensureMembership(band1.id, MILO, "member");
await ensureMembership(band1.id, SASHA, "member");
await ensureMembership(band1.id, JUNO, "admin");
await ensureMembership(band1.id, DEMO, "member");

await ensureMembership(band2.id, MILO, "owner");
await ensureMembership(band2.id, AJ_ID, "member");
await ensureMembership(band2.id, SASHA, "member");
await ensureMembership(band2.id, DEMO, "admin");

await ensureMembership(band3.id, JUNO, "owner");
await ensureMembership(band3.id, AJ_ID, "member");
await ensureMembership(band3.id, REBECCA_ID, "member");
await ensureMembership(band3.id, DEMO, "member");

await ensureMembership(band4.id, OTIS, "owner");
await ensureMembership(band4.id, SASHA, "member");
await ensureMembership(band4.id, JUNO, "member");

// 6. Pending join_request from Sasha into AJ's owned "Weekend Warriors" —
//    actually she's already a member. Use Otis, who isn't in band1.
await ensurePendingJoinRequest(band1.id, OTIS);
// And a request FROM ajtwisleton into "The Basement Session" (band4), so the
// user sees the "your request is pending" state.
await ensurePendingJoinRequest(band4.id, AJ_ID);
// And a request FROM the demo user into band4 too, for the demo tour.
await ensurePendingJoinRequest(band4.id, DEMO);

// 7. Band notes.
const firstSongIds = songIds.slice(0, 3);
await ensureBandNote(
  band1.id,
  "Setlist for Saturday",
  { plan: ["This Is The World", "Ya Hey", "Ice Cream Piano"], keys: { "Ya Hey": "C major" } },
  firstSongIds[0],
);
await ensureBandNote(
  band1.id,
  "Practice notes",
  { text: "Milo — try the half-time feel on the second chorus of Ya Hey. Sasha wants to try dropping the bridge." },
);
await ensureBandNote(
  band2.id,
  "Demo track ideas",
  { picks: ["Sky Queen", "Queen of Wands", "Immaterial Girl"] },
);
await ensureBandNote(
  band3.id,
  "Sunday night residency",
  { venue: "The Cellar", startTime: "8pm", requests: ["Waterfalls", "You Get What You Give"] },
);

console.log("\nseed complete.");
console.log("bands:");
for (const b of [band1, band2, band3, band4])
  console.log(`  ${b.name}: /b/${b.slug}`);
