import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignInButtons } from "@/components/SignInButtons";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <>
      <h1>Learn My Faves</h1>
      <p className="muted">
        Connect Spotify, tell us what you play, and form small bands around the
        songs more than one of you already loves.
      </p>
      <div className="panel" style={{ marginTop: 24 }}>
        <h2 style={{ marginTop: 0 }}>Sign in</h2>
        <SignInButtons />
        <p className="muted" style={{ fontSize: "0.85rem", marginBottom: 0 }}>
          A second provider can be linked later, only from your account settings
          — never automatically by email (ADR&nbsp;0003).
        </p>
      </div>
    </>
  );
}
