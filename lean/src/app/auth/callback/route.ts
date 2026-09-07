import { NextResponse } from "next/server";
import { createClientForResponse } from "@/lib/supabase/server";

/** Supabase OAuth redirect target: exchanges the code for a session. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const response = NextResponse.redirect(`${origin}${next}`);
    const supabase = createClientForResponse(request, response);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return response;
  }
  return NextResponse.redirect(`${origin}/?error=auth`);
}
