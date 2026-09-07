import { NextResponse } from "next/server";
import { createClientForResponse } from "@/lib/supabase/server";

/** Supabase OAuth redirect target: exchanges the code for a session. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // On Vercel, `origin` from request.url is the internal URL. Use the
  // forwarded host header so the redirect lands on the public domain
  // (which is where the browser has its cookies for).
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const publicOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : origin;

  if (code) {
    const response = NextResponse.redirect(`${publicOrigin}${next}`);
    const supabase = createClientForResponse(request, response);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return response;
  }
  return NextResponse.redirect(`${publicOrigin}/?error=auth`);
}
