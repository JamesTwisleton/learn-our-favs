/**
 * Spotify Web API client. Endpoints, scopes and the refresh flow are carried
 * over from the removed prototype (see ../../cloud-agnostic/docs/SALVAGE.md).
 */
const API = "https://api.spotify.com/v1";
const TOKEN_URL = "https://accounts.spotify.com/api/token";

export const SPOTIFY_SCOPES =
  "user-read-email user-top-read user-read-recently-played playlist-modify-public playlist-modify-private";

export type SpotifyTimeRange = "short_term" | "medium_term" | "long_term";

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
  external_urls: { spotify: string };
  external_ids?: { isrc?: string };
}

function basicAuthHeader() {
  const raw = `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`;
  return `Basic ${Buffer.from(raw).toString("base64")}`;
}

export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`Spotify token exchange failed: ${res.status}`);
  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
  }>;
}

export async function refreshAccessToken(refreshToken: string) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Spotify token refresh failed: ${res.status}`);
  return res.json() as Promise<{
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  }>;
}

export async function getTopTracks(
  accessToken: string,
  timeRange: SpotifyTimeRange = "medium_term",
  limit = 50,
): Promise<SpotifyTrack[]> {
  const res = await fetch(
    `${API}/me/top/tracks?time_range=${timeRange}&limit=${limit}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error(`Spotify top tracks failed: ${res.status}`);
  const data = await res.json();
  return data.items as SpotifyTrack[];
}

export async function getRecentTracks(
  accessToken: string,
  limit = 50,
): Promise<SpotifyTrack[]> {
  const res = await fetch(
    `${API}/me/player/recently-played?limit=${limit}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error(`Spotify recent tracks failed: ${res.status}`);
  const data = await res.json();
  const seen = new Set<string>();
  return (data.items as { track: SpotifyTrack }[])
    .map((i) => i.track)
    .filter((t) => {
      if (!t?.id || seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
}
