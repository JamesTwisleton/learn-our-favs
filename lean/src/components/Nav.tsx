import Link from "next/link";

export function Nav({ displayName }: { displayName: string }) {
  return (
    <div className="row" style={{ justifyContent: "space-between", marginBottom: 20 }}>
      <div className="row" style={{ gap: 16 }}>
        <Link href="/dashboard" style={{ fontWeight: 700, textDecoration: "none" }}>
          Learn My Faves
        </Link>
        <Link href="/bands" className="muted" style={{ textDecoration: "none" }}>
          Bands
        </Link>
      </div>
      <div className="row" style={{ gap: 10 }}>
        <span className="muted">{displayName}</span>
        <form action="/auth/signout" method="post">
          <button className="secondary" type="submit">Sign out</button>
        </form>
      </div>
    </div>
  );
}
