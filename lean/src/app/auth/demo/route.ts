import { NextResponse } from "next/server";
import { resetDemo } from "@/app/api/demo/reset/route";

const DEMO_EMAIL = "demo@learn-our-favs.app";

/**
 * "Try the demo" — mints a magic-link for the shared demo account and 303s
 * the browser to it, so the visitor lands on /dashboard signed in as the
 * demo user without any interstitial UX.
 *
 * Uses the Supabase Auth admin REST endpoint directly because supabase-js's
 * `generateLink({ options: { redirectTo } })` was silently dropping the value
 * and falling back to the project's site_url (which is set to localhost for
 * local dev). The REST shape is `options.redirect_to` — snake_case — and it
 * lands on the action_link as `?redirect_to=...`.
 */
export async function POST(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const { origin } = new URL(request.url);
  const publicOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : origin;

  // Reset the demo account to its baseline on every entry so a new visitor
  // never inherits the previous visitor's mid-tour mutations. Best-effort —
  // if the reset fails we still let the sign-in proceed (worse UX than a
  // reset, but better than blocking the demo).
  try {
    await resetDemo();
  } catch (err) {
    console.error("[demo] pre-login reset failed (continuing):", err);
  }

  // Supabase's verify endpoint uses implicit-flow URL fragments for magic-link,
  // so we land on a client-side page that sets the session and then goes to
  // /dashboard. See src/app/auth/demo-complete/page.tsx.
  const redirectTo = `${publicOrigin}/auth/demo-complete`;

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/generate_link`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      },
      body: JSON.stringify({
        type: "magiclink",
        email: DEMO_EMAIL,
        // Top-level, NOT under `options`. The docs (and supabase-js) suggest
        // `options.redirect_to`, but the REST endpoint silently drops that
        // and falls back to the project's site_url.
        redirect_to: redirectTo,
      }),
    },
  );

  if (!res.ok) {
    console.error("[demo] generate_link failed:", res.status, await res.text());
    return NextResponse.redirect(`${publicOrigin}/?error=demo`);
  }
  const body = (await res.json()) as { action_link?: string };
  if (!body.action_link) {
    console.error("[demo] no action_link in response");
    return NextResponse.redirect(`${publicOrigin}/?error=demo`);
  }
  return NextResponse.redirect(body.action_link, { status: 303 });
}
