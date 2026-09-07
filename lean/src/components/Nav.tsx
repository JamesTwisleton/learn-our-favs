import Link from "next/link";

export function Nav({
  displayName,
  avatarUrl,
}: {
  displayName: string;
  avatarUrl?: string | null;
}) {
  const firstName = displayName.split(" ")[0];
  return (
    <nav className="app-nav">
      <div className="nav-left">
        <Link href="/dashboard" className="nav-brand">
          Learn Our Favs
        </Link>
        <Link href="/bands" className="nav-link">
          Bands
        </Link>
      </div>
      <div className="nav-right">
        {avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="nav-avatar" src={avatarUrl} alt={firstName} />
        )}
        <span className="nav-name">{firstName}</span>
        <form action="/auth/signout" method="post">
          <button className="nav-signout" type="submit">Sign out</button>
        </form>
      </div>
    </nav>
  );
}
