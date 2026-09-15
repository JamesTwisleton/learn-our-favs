"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Client-side landing target for the demo magic-link.
 *
 * Supabase's /auth/v1/verify uses implicit-flow URL fragments
 * (`#access_token=...&refresh_token=...`), which are inaccessible server-side
 * — so we can't reuse the OAuth PKCE `?code=` callback. Instead:
 *   /auth/demo → 303 to Supabase's verify endpoint
 *   Supabase verify → 302 to /auth/demo-complete#access_token=…
 *   this page → parse fragment, setSession, replace-navigate to /dashboard
 *
 * The setSession call persists cookies via the ssr client, so subsequent
 * requests hit the app as a signed-in user without a page refresh.
 */
export default function DemoCompletePage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : "";
    const params = new URLSearchParams(hash);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (!access_token || !refresh_token) {
      setError("Missing tokens from magic-link. Try again from the landing page.");
      return;
    }
    const supabase = createClient();
    supabase.auth
      .setSession({ access_token, refresh_token })
      .then(({ error }) => {
        if (error) {
          setError(error.message);
          return;
        }
        window.location.replace("/dashboard");
      });
  }, []);

  return (
    <div className="stage" style={{ padding: 40 }}>
      <p className="muted">
        {error ? `Demo sign-in failed: ${error}` : "Signing you into the demo…"}
      </p>
    </div>
  );
}
