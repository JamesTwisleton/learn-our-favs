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

async function ensureSpotifyConnection(userId, refreshToken, scope) {
  await sb
    .from("spotify_connections")
    .upsert(
      { user_id: userId, refresh_token: refreshToken, scope, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    )
    .throwOnError();
}

async function ensureSongComment(bandId, songId, userId, body) {
  // Comments have no natural unique key; dedupe by matching the exact body.
  const existing = await sb
    .from("song_comments")
    .select("id")
    .eq("band_id", bandId)
    .eq("song_id", songId)
    .eq("user_id", userId)
    .eq("body", body)
    .maybeSingle();
  if (existing.data) return;
  await sb
    .from("song_comments")
    .insert({ band_id: bandId, song_id: songId, user_id: userId, body })
    .throwOnError();
}

async function ensureDifficultyRating(userId, songId, instrumentId, rating, note = null) {
  await sb
    .from("difficulty_ratings")
    .upsert(
      { user_id: userId, song_id: songId, instrument_id: instrumentId, rating, note, updated_at: new Date().toISOString() },
      { onConflict: "user_id,song_id,instrument_id" },
    )
    .throwOnError();
}

// Generate a short (~2s) 440Hz sine WAV, ~ 32 KB, as a Uint8Array. Real audio
// so the <audio> player has something to play in demos — no external files.
function makeToneWav({ frequency = 440, seconds = 2, sampleRate = 8000 } = {}) {
  const numSamples = Math.floor(sampleRate * seconds);
  const dataSize = numSamples * 2; // 16-bit mono
  const buf = new ArrayBuffer(44 + dataSize);
  const dv = new DataView(buf);
  const writeStr = (offset, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(offset + i, s.charCodeAt(i)); };
  writeStr(0, "RIFF");
  dv.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  dv.setUint32(16, 16, true);           // PCM chunk size
  dv.setUint16(20, 1, true);            // PCM format
  dv.setUint16(22, 1, true);            // channels
  dv.setUint32(24, sampleRate, true);
  dv.setUint32(28, sampleRate * 2, true); // byte rate
  dv.setUint16(32, 2, true);            // block align
  dv.setUint16(34, 16, true);           // bits per sample
  writeStr(36, "data");
  dv.setUint32(40, dataSize, true);
  const amplitude = 0.25 * 32767;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.sin((2 * Math.PI * frequency * i) / sampleRate);
    dv.setInt16(44 + i * 2, s * amplitude, true);
  }
  return new Uint8Array(buf);
}

async function ensureRecording(bandId, songId, userId, title, freq) {
  // Idempotent by title+band+song+user.
  const existing = await sb
    .from("recordings")
    .select("id, storage_path")
    .eq("band_id", bandId)
    .eq("song_id", songId)
    .eq("user_id", userId)
    .eq("title", title)
    .maybeSingle();
  if (existing.data) return;
  const objectName = `${bandId}/${crypto.randomUUID()}.wav`;
  const bytes = makeToneWav({ frequency: freq, seconds: 2 });
  const { error: upErr } = await sb.storage
    .from("recordings")
    .upload(objectName, bytes, { contentType: "audio/wav", upsert: false });
  if (upErr) throw upErr;
  await sb
    .from("recordings")
    .insert({
      band_id: bandId,
      song_id: songId,
      user_id: userId,
      title,
      storage_path: objectName,
      mime_type: "audio/wav",
      size_bytes: bytes.byteLength,
      duration_seconds: 2,
    })
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

// 3b. Rebecca gets a couple of instruments so band 3's panel is fuller.
await ensureProficiency(REBECCA_ID, instruments.piano, "beginner");
await ensureProficiency(REBECCA_ID, instruments.ukulele, "beginner");

// 3c. Spotify connection for demo — copy AJ's refresh token so /dashboard
//     shows real top/recent/favourites for demo visitors.
const { data: ajConn } = await sb
  .from("spotify_connections")
  .select("refresh_token, scope")
  .eq("user_id", AJ_ID)
  .maybeSingle();
if (ajConn) {
  await ensureSpotifyConnection(DEMO, ajConn.refresh_token, ajConn.scope);
  console.log("copied AJ Spotify connection to demo user");
} else {
  console.log("no AJ Spotify connection yet — dashboard 'Your tracks' will be empty for demo");
}

// 5. Bands.
const band1 = await ensureBand("Weekend Warriors", 3);      // AJ owner + full crew
const band2 = await ensureBand("Bedroom Studio Club", 2);   // Milo owner, AJ + Sasha
const band3 = await ensureBand("Piano Bar Nights", 2);      // Juno owner, AJ + Rebecca
const band4 = await ensureBand("The Basement Session", 2);  // Otis owner; AJ NOT a member — for demo of join-request flow
const band5 = await ensureBand("Living Room Jam", 2);       // demo is OWNER — approve/refuse demo happens here
const band6 = await ensureBand("Studio 6 Collective", 2);   // demo is NOT a member and no pending — request-to-join demo

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

// Band 5 — demo is owner, so demo visitor sees owner-scoped UI + can
// approve/refuse the pending Milo request.
await ensureMembership(band5.id, DEMO, "owner");
await ensureMembership(band5.id, OTIS, "member");
await ensureMembership(band5.id, SASHA, "member");

// Band 6 — demo NOT a member, so demo visitor can click "Request to join".
await ensureMembership(band6.id, JUNO, "owner");
await ensureMembership(band6.id, OTIS, "admin");
await ensureMembership(band6.id, MILO, "member");

// 6. Pending join_request from Sasha into AJ's owned "Weekend Warriors" —
//    actually she's already a member. Use Otis, who isn't in band1.
await ensurePendingJoinRequest(band1.id, OTIS);
// And a request FROM ajtwisleton into "The Basement Session" (band4), so the
// user sees the "your request is pending" state.
await ensurePendingJoinRequest(band4.id, AJ_ID);
// And a request FROM the demo user into band4 too, for the demo tour.
await ensurePendingJoinRequest(band4.id, DEMO);
// Milo requests to join demo's Living Room Jam — populates demo's
// approve/refuse UI.
await ensurePendingJoinRequest(band5.id, MILO);

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

// 8. Sample per-song comments, ratings, and recordings on the top few pool
//    songs so the new expandable panels aren't empty on demo entry.
const commentTargets = songIds.slice(0, 5);
const commentSeeds = [
  [MILO, "Nailing the intro riff after the third listen. Bar 12 is tricky."],
  [SASHA, "The bass line drops out on the bridge — makes room for the vocal."],
  [JUNO, "Try transposing to F# for a warmer piano tone."],
  [OTIS, "Groove sits right at 92 BPM. Don't rush the pre-chorus."],
  [DEMO, "This one's a candidate for the Saturday setlist."],
];
for (const songId of commentTargets) {
  for (const [uid, body] of commentSeeds) {
    await ensureSongComment(band1.id, songId, uid, body);
  }
}
// A few in the demo-owned band too.
for (const songId of songIds.slice(0, 3)) {
  await ensureSongComment(band5.id, songId, DEMO, "Rehearsing this at Thursday's session.");
  await ensureSongComment(band5.id, songId, OTIS, "I'll bring the acoustic for this one.");
}

// Difficulty ratings — a handful per song on guitar/piano/bass, so the
// aggregate "difficulty" pill has data.
const ratingSeeds = [
  { user: MILO, inst: instruments.guitar, rating: 3, note: "Standard tuning, moves fast." },
  { user: SASHA, inst: instruments.bass, rating: 2, note: "Repetitive line." },
  { user: JUNO, inst: instruments.piano, rating: 4, note: "Left hand independence." },
  { user: OTIS, inst: instruments.guitar, rating: 4, note: null },
  { user: DEMO, inst: instruments.guitar, rating: 3, note: "Getting there." },
];
for (const songId of commentTargets) {
  for (const r of ratingSeeds) {
    await ensureDifficultyRating(r.user, songId, r.inst, r.rating, r.note);
  }
}

// Placeholder recordings — 2s sine-wave WAVs so the audio player has something
// to play. Different frequencies just so consecutive ones sound different.
console.log("seeding placeholder recordings…");
await ensureRecording(band1.id, songIds[0], MILO, "First run-through", 440);
await ensureRecording(band1.id, songIds[0], SASHA, "Take with the bridge fix", 523);
await ensureRecording(band1.id, songIds[1], JUNO, "Piano rehearsal loop", 349);
await ensureRecording(band5.id, songIds[0], DEMO, "Demo take", 494);
await ensureRecording(band5.id, songIds[2], OTIS, "Acoustic idea", 392);

console.log("\nseed complete.");
console.log("bands:");
for (const b of [band1, band2, band3, band4, band5, band6])
  console.log(`  ${b.name}: /b/${b.slug}`);
