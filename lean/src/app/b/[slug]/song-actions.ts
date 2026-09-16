"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Song comments (per song, per band).
// ---------------------------------------------------------------------------
export async function addSongComment(formData: FormData) {
  const bandId = String(formData.get("bandId"));
  const songId = String(formData.get("songId"));
  const slug = String(formData.get("slug"));
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  if (body.length > 2000) throw new Error("comment too long");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not authenticated");

  await supabase
    .from("song_comments")
    .insert({ band_id: bandId, song_id: songId, user_id: user.id, body })
    .throwOnError();
  revalidatePath(`/b/${slug}`);
}

export async function deleteSongComment(formData: FormData) {
  const commentId = String(formData.get("commentId"));
  const slug = String(formData.get("slug"));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not authenticated");

  await supabase
    .from("song_comments")
    .delete()
    .eq("id", commentId)
    .throwOnError();
  revalidatePath(`/b/${slug}`);
}

// ---------------------------------------------------------------------------
// Difficulty ratings. One row per (user, song, instrument), upserted.
// ---------------------------------------------------------------------------
export async function saveDifficultyRating(formData: FormData) {
  const songId = String(formData.get("songId"));
  const instrumentId = String(formData.get("instrumentId"));
  const slug = String(formData.get("slug"));
  const rating = Number(formData.get("rating"));
  const note = String(formData.get("note") ?? "").trim() || null;
  if (rating < 1 || rating > 5) throw new Error("rating must be 1..5");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not authenticated");

  await supabase
    .from("difficulty_ratings")
    .upsert(
      {
        user_id: user.id,
        song_id: songId,
        instrument_id: instrumentId,
        rating,
        note,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,song_id,instrument_id" },
    )
    .throwOnError();
  revalidatePath(`/b/${slug}`);
}

// ---------------------------------------------------------------------------
// Recordings.
//
// Upload flow is client → signed URL → Supabase Storage direct, then this
// action just inserts the DB row. The old "POST the File through a Server
// Action" path was capped by Next's default 1 MB bodySizeLimit AND Vercel's
// ~4.5 MB request-body cap — real audio takes exceed both. See
// /api/recordings/sign-upload for the URL-minting side.
// ---------------------------------------------------------------------------
export async function insertRecordingMetadata(formData: FormData) {
  const bandId = String(formData.get("bandId"));
  const songId = String(formData.get("songId"));
  const slug = String(formData.get("slug"));
  const title = String(formData.get("title") ?? "").trim() || "Untitled take";
  const storagePath = String(formData.get("storagePath"));
  const mimeType = String(formData.get("mimeType") ?? "audio/webm");
  const sizeBytes = Number(formData.get("sizeBytes")) || null;
  if (!bandId || !songId || !storagePath) throw new Error("missing fields");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not authenticated");

  await supabase
    .from("recordings")
    .insert({
      band_id: bandId,
      song_id: songId,
      user_id: user.id,
      title,
      storage_path: storagePath,
      mime_type: mimeType,
      size_bytes: sizeBytes,
    })
    .throwOnError();
  revalidatePath(`/b/${slug}`);
}

export async function deleteRecording(formData: FormData) {
  const recordingId = String(formData.get("recordingId"));
  const storagePath = String(formData.get("storagePath"));
  const slug = String(formData.get("slug"));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not authenticated");

  // RLS on `recordings` allows delete by owner OR band admin/owner.
  const { error } = await supabase.from("recordings").delete().eq("id", recordingId);
  if (error) throw error;
  // Best-effort remove of the object; if it fails the row is already gone.
  const admin = createAdminClient();
  await admin.storage.from("recordings").remove([storagePath]);
  revalidatePath(`/b/${slug}`);
}
