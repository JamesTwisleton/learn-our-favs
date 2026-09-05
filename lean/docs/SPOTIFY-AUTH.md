# Spotify: two separate OAuth flows

Do not confuse these. They use different providers, different callbacks, and
store different things.

## Flow 1 — Signing in (Supabase Auth)

- Provider: Google / GitHub / (any social provider configured in Supabase).
- Entry: `SignInButtons.tsx` → `supabase.auth.signInWithOAuth`.
- Callback: `/auth/callback` → `exchangeCodeForSession`.
- Result: a Supabase session (the cookie `middleware.ts` keeps fresh). A row in
  `auth.users` and `auth.identities`, and a `profiles` row created by the
  `on_auth_user_created` trigger.
- Spotify is **not** a sign-in provider here — it is a data source, connected
  separately once you already have an account.

## Flow 2 — Connecting Spotify as a data source

- Provider: Spotify, directly (not via Supabase Auth).
- Entry: `/auth/spotify` (a Route Handler). Requires an existing session.
  Builds the authorize URL with scopes
  `user-read-email user-top-read playlist-modify-public playlist-modify-private`
  and a random `state` stored in an httpOnly cookie.
- Callback: `/auth/spotify/callback` → verifies `state`, exchanges the code,
  and writes the **refresh token** to `public.spotify_connections` using the
  `service_role` client.
- Result: `getSpotifyAccessToken(userId)` can now mint a fresh access token
  on demand (server-side) for `GET /me/top/tracks` etc.

```mermaid
flowchart TD
    subgraph "Flow 1: sign in"
      A1[SignInButtons] --> A2[Supabase Auth + Google]
      A2 --> A3[/auth/callback]
      A3 --> A4[Supabase session cookie]
    end
    subgraph "Flow 2: connect Spotify"
      B1[/auth/spotify<br/>needs session] --> B2[accounts.spotify.com/authorize]
      B2 --> B3[/auth/spotify/callback]
      B3 --> B4[(spotify_connections<br/>refresh_token,<br/>service_role only)]
    end
    A4 -.-> B1
```

## Why the refresh token is handled the way it is

- It is a long-lived secret that can pull the user's listening history.
- It lives in a table with **no RLS policy for client roles** — only the
  `service_role` key (server route handlers) can read it.
- It never reaches the browser and never reaches a Client Component.
- On unlink (not yet built), the row is deleted and the token revoked — this is
  the "life of link" retention rule (PRD §10).
