import { NextAuthOptions } from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";
import { prisma } from "./prisma";
import { refreshAccessToken } from "./spotify";

const SPOTIFY_SCOPES = [
  "user-read-email",
  "user-top-read",
  "playlist-modify-public",
  "playlist-modify-private",
].join(" ");

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    spotifyId?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID || "",
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET || "",
      authorization: {
        params: { scope: SPOTIFY_SCOPES },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!account) return false;

      // Upsert user in our database
      await prisma.user.upsert({
        where: { spotifyId: account.providerAccountId },
        update: {
          displayName: user.name || "Unknown",
          email: user.email,
          imageUrl: user.image,
        },
        create: {
          spotifyId: account.providerAccountId,
          displayName: user.name || "Unknown",
          email: user.email,
          imageUrl: user.image,
        },
      });

      return true;
    },
    async jwt({ token, account }) {
      // Initial sign in
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.spotifyId = account.providerAccountId;
        return token;
      }

      // Return token if not expired
      if (token.expiresAt && Date.now() < token.expiresAt * 1000) {
        return token;
      }

      // Refresh expired token
      if (token.refreshToken) {
        try {
          const refreshed = await refreshAccessToken(token.refreshToken);
          token.accessToken = refreshed.access_token;
          token.expiresAt = Math.floor(Date.now() / 1000) + refreshed.expires_in;
          if (refreshed.refresh_token) {
            token.refreshToken = refreshed.refresh_token;
          }
        } catch {
          // If refresh fails, user will need to re-authenticate
          token.accessToken = undefined;
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      if (token.spotifyId) {
        session.user.id = token.spotifyId;
      }
      return session;
    },
  },
  cookies: {
    state: {
      name: "next-auth.state",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
      },
    },
    pkceCodeVerifier: {
      name: "next-auth.pkce.code_verifier",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
      },
    },
  },
  pages: {
    signIn: "/",
  },
};
