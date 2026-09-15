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
// Recordings. Upload uses the service-role client to bypass Storage RLS —
// we verify band membership in code before writing, since File uploads via
// Server Actions don't carry the user's Storage JWT the way a direct
// browser-side upload would.
// ---------------------------------------------------------------------------
export async function uploadRecording(formData: FormData) {
  const bandId = String(formData.get("bandId"));
  const songId = String(formData.get("songId"));
  const slug = String(formData.get("slug"));
  const title = String(formData.get("title") ?? "").trim() || "Untitled take";
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return;
  if (file.size > 20 * 1024 * 1024) throw new Error("file too large (max 20 MB)");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not authenticated");

  // Verify membership (Storage upload bypasses RLS via service role).
  const { data: membership } = await supabase
    .from("band_memberships")
    .select("role")
    .eq("band_id", bandId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) throw new Error("not a member of this band");

  const admin = createAdminClient();
  const extMatch = /\.(webm|mp3|wav|m4a|ogg|aac|flac)$/i.exec(file.name);
  const ext = extMatch ? extMatch[1].toLowerCase() : "webm";
  const objectName = `${bandId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadErr } = await admin.storage
    .from("recordings")
    .upload(objectName, file, {
      contentType: file.type || "audio/webm",
      upsert: false,
    });
  if (uploadErr) throw uploadErr;

  await supabase
    .from("recordings")
    .insert({
      band_id: bandId,
      song_id: songId,
      user_id: user.id,
      title,
      storage_path: objectName,
      mime_type: file.type || "audio/webm",
      size_bytes: file.size,
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
