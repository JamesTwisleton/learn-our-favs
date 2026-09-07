import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignInButtons } from "@/components/SignInButtons";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  const emojis = [
    { char: "🎸", top: "12%", left: "8%", delay: "0s", duration: "22s" },
    { char: "🎹", top: "20%", left: "82%", delay: "3s", duration: "26s" },
    { char: "🥁", top: "70%", left: "12%", delay: "6s", duration: "24s" },
    { char: "🎺", top: "78%", left: "78%", delay: "2s", duration: "28s" },
    { char: "🎻", top: "40%", left: "5%", delay: "8s", duration: "30s" },
    { char: "🎤", top: "55%", left: "88%", delay: "5s", duration: "23s" },
    { char: "🎷", top: "8%", left: "45%", delay: "10s", duration: "27s" },
    { char: "🪕", top: "85%", left: "45%", delay: "4s", duration: "25s" },
  ];

  return (
    <div className="landing">
      <div className="floating-emojis" aria-hidden="true">
        {emojis.map((e, i) => (
          <span
            key={i}
            className="floating-emoji"
            style={{
              top: e.top,
              left: e.left,
              animationDelay: e.delay,
              animationDuration: e.duration,
            }}
          >
            {e.char}
          </span>
        ))}
      </div>
      <div className="landing-inner">
        <h1 className="landing-title">Learn Our Favs</h1>
        <p className="landing-tagline">
          Connect Spotify, tell us what you play, and form small bands around
          the songs more than one of you already loves.
        </p>
        <SignInButtons />
      </div>
    </div>
  );
}
