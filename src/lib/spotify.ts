import type { TimeRange } from "./constants";

const SPOTIFY_API = "https://api.spotify.com/v1";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: {
    id: string;
    name: string;
    images: { url: string; height: number; width: number }[];
  };
  external_urls: { spotify: string };
  preview_url: string | null;
  popularity: number;
  duration_ms: number;
}

export interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: { url: string }[];
}

export async function getTopTracks(
  accessToken: string,
  timeRange: TimeRange = "medium_term",
  limit: number = 50
): Promise<SpotifyTrack[]> {
  const res = await fetch(
    `${SPOTIFY_API}/me/top/tracks?time_range=${timeRange}&limit=${limit}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    throw new Error(`Spotify API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.items;
}

export async function getUserProfile(
  accessToken: string
): Promise<SpotifyUser> {
  const res = await fetch(`${SPOTIFY_API}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Spotify API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function createPlaylist(
  accessToken: string,
  userId: string,
  name: string,
  trackUris: string[],
  description?: string
): Promise<{ id: string; external_urls: { spotify: string } }> {
  // Create playlist
  const createRes = await fetch(`${SPOTIFY_API}/users/${userId}/playlists`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      description: description || "Created with Learn My Favs",
      public: false,
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create playlist: ${createRes.status}`);
  }

  const playlist = await createRes.json();

  // Add tracks (max 100 per request)
  for (let i = 0; i < trackUris.length; i += 100) {
    const batch = trackUris.slice(i, i + 100);
    const addRes = await fetch(
      `${SPOTIFY_API}/playlists/${playlist.id}/tracks`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uris: batch }),
      }
    );

    if (!addRes.ok) {
      throw new Error(`Failed to add tracks to playlist: ${addRes.status}`);
    }
  }

  return playlist;
}

export async function refreshAccessToken(refreshToken: string) {
  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to refresh token: ${res.status}`);
  }

  return res.json();
}
