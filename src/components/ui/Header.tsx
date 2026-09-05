"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="glass-strong sticky top-0 z-50 border-b border-[var(--glass-border)]" style={{ borderRadius: 0 }}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href={session ? "/dashboard" : "/"} className="flex items-center gap-2 text-xl font-bold">
          <span className="text-spotify-green">Learn</span>
          <span>My Favs</span>
        </Link>

        <div className="flex items-center gap-4">
          {session && (
            <>
              <Link
                href="/dashboard"
                className="text-sm text-muted-60 transition-colors hover:text-primary"
              >
                Songs
              </Link>
              <Link
                href="/onboarding"
                className="text-sm text-muted-60 transition-colors hover:text-primary"
              >
                Instruments
              </Link>
            </>
          )}
          <ThemeToggle />
          {session?.user && (
            <div className="flex items-center gap-3">
              {session.user.image && (
                <Image
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-sm text-muted-50 transition-colors hover:text-primary"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
