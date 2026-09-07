"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Like a song. One unified thumbs-up (ADR 0007): upsert the canonical song row,
 * then record the like. Toggling off removes it.
 */
export async function toggleLike(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not authenticated");

  const spotifyTrackId = String(formData.get("spotifyTrackId"));
  const title = String(formData.get("title"));
  const artist = String(formData.get("artist"));
  const isrc = formData.get("isrc") ? String(formData.get("isrc")) : null;
  const albumArtUrl = formData.get("albumArtUrl")
    ? String(formData.get("albumArtUrl"))
    : null;
  const liked = formData.get("liked") === "true";

  // Find or create the song.
  const { data: existing } = await supabase
    .from("songs")
    .select("id")
    .eq("spotify_track_id", spotifyTrackId)
    .maybeSingle();

  let songId = existing?.id as string | undefined;
  if (!songId) {
    const { data: created, error } = await supabase
      .from("songs")
      .insert({ title, artist, isrc, spotify_track_id: spotifyTrackId, album_art_url: albumArtUrl })
      .select("id")
      .single();
    if (error) throw error;
    songId = created.id;
  }

  if (liked) {
    await supabase.from("song_likes").delete().eq("user_id", user.id).eq("song_id", songId);
  } else {
    await supabase
      .from("song_likes")
      .upsert(
        { user_id: user.id, song_id: songId, origin: "top_tracks" },
        { onConflict: "user_id,song_id" },
      );
  }

  revalidatePath("/dashboard");
}

/** Add or update the current user's proficiency on an instrument. */
export async function setProficiency(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not authenticated");

  const instrumentId = String(formData.get("instrumentId"));
  const skillLevel = String(formData.get("skillLevel"));

  if (!skillLevel) {
    await supabase
      .from("instrument_proficiency")
      .delete()
      .eq("user_id", user.id)
      .eq("instrument_id", instrumentId);
  } else {
    await supabase.from("instrument_proficiency").upsert(
      { user_id: user.id, instrument_id: instrumentId, skill_level: skillLevel },
      { onConflict: "user_id,instrument_id" },
    );
  }
  revalidatePath("/dashboard");
}
