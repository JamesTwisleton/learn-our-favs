"use client";

import { createClient } from "@/lib/supabase/client";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";

export function SignInButtons() {
  const supabase = createClient();

  async function signIn(provider: "google" | "github") {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${SITE_URL}/auth/callback?next=/dashboard` },
    });
  }

  return (
    <div className="row" style={{ margin: "12px 0 16px" }}>
      <button onClick={() => signIn("google")}>Continue with Google</button>
      <button className="secondary" onClick={() => signIn("github")}>
        Continue with GitHub
      </button>
    </div>
  );
}
