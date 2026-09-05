import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/Nav";
import { createBand } from "./actions";

export const dynamic = "force-dynamic";

export default async function BandsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    supabase
      .from("band_memberships")
      .select("role, bands(id, slug, name)")
      .eq("user_id", user.id),
  ]);

  return (
    <>
      <Nav displayName={profile?.display_name ?? "You"} />
      <h1>Your bands</h1>

      <div className="list">
        {(memberships ?? []).map((m) => {
          const band = m.bands as unknown as { slug: string; name: string };
          return (
            <Link key={band.slug} href={`/b/${band.slug}`} className="panel row" style={{ justifyContent: "space-between", textDecoration: "none", color: "inherit" }}>
              <span>{band.name}</span>
              <span className="pill">{m.role}</span>
            </Link>
          );
        })}
        {(memberships ?? []).length === 0 && (
          <p className="muted">No bands yet. Create one, then share its link.</p>
        )}
      </div>

      <h2>Create a band</h2>
      <form action={createBand} className="panel row">
        <input type="text" name="name" placeholder="Band name" className="grow" required />
        <button type="submit">Create</button>
      </form>
      <p className="muted" style={{ fontSize: "0.85rem" }}>
        You&apos;ll get a three-word link like <code>/b/merry-swift-otter</code> to
        share. People request to join; you approve.
      </p>
    </>
  );
}
