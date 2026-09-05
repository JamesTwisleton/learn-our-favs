import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { SPOTIFY_SCOPES } from "@/lib/spotify";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";

/** Starts the Spotify "connect as a data source" flow. Requires a session. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${SITE_URL}/`);

  const state = randomBytes(16).toString("hex");
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    scope: SPOTIFY_SCOPES,
    redirect_uri: `${SITE_URL}/auth/spotify/callback`,
    state,
  });

  const res = NextResponse.redirect(
    `https://accounts.spotify.com/authorize?${params}`,
  );
  res.cookies.set("spotify_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    secure: SITE_URL.startsWith("https://"),
  });
  return res;
}
