import { createAdminClient } from "@/lib/supabase/admin";
import { refreshAccessToken } from "@/lib/spotify";

/**
 * Returns a usable Spotify access token for a user, or null if they have not
 * connected Spotify. Reads the refresh token from the service-role-only table,
 * exchanges it, and persists a rotated refresh token if Spotify sends one.
 */
export async function getSpotifyAccessToken(
  userId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("spotify_connections")
    .select("refresh_token")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data?.refresh_token) return null;

  const refreshed = await refreshAccessToken(data.refresh_token);
  if (refreshed.refresh_token && refreshed.refresh_token !== data.refresh_token) {
    await admin
      .from("spotify_connections")
      .update({
        refresh_token: refreshed.refresh_token,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
  }
  return refreshed.access_token;
}
