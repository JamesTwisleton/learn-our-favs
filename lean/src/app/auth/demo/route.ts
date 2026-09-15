import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const DEMO_EMAIL = "demo@learn-our-favs.app";

/**
 * "Try the demo" — mints a magic-link for the shared demo account and 302s
 * the browser to it, so the visitor lands on /dashboard signed in as the
 * demo user without any interstitial UX.
 */
export async function POST(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const { origin } = new URL(request.url);
  const publicOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : origin;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: DEMO_EMAIL,
    options: { redirectTo: `${publicOrigin}/auth/callback?next=/dashboard` },
  });

  if (error || !data.properties?.action_link) {
    console.error("[demo] generateLink failed:", error);
    return NextResponse.redirect(`${publicOrigin}/?error=demo`);
  }
  return NextResponse.redirect(data.properties.action_link, { status: 303 });
}
