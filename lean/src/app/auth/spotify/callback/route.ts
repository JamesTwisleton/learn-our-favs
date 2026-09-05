import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeCodeForTokens } from "@/lib/spotify";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("spotify_oauth_state")?.value;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !code || !state || state !== expectedState) {
    return NextResponse.redirect(`${SITE_URL}/dashboard?spotify=error`);
  }

  const tokens = await exchangeCodeForTokens(
    code,
    `${SITE_URL}/auth/spotify/callback`,
  );

  // Refresh token is a secret: store it in the private schema via the service
  // role. RLS gives client roles zero rows there (lean PRD, ADR 0002 sibling).
  const admin = createAdminClient();
  await admin.from("spotify_connections").upsert(
    {
      user_id: user.id,
      refresh_token: tokens.refresh_token,
      scope: tokens.scope,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  const res = NextResponse.redirect(`${SITE_URL}/dashboard?spotify=connected`);
  res.cookies.delete("spotify_oauth_state");
  return res;
}
