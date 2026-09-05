# learn-our-favs Implementation Plan

## Context

Building a greenfield web app where users log in with Spotify, choose their instruments, and discover which of their most-played songs are easy to play. The repo is currently empty. Deployment mirrors the sibling `eurovision` project exactly (Next.js + Prisma + Fly.io + GitHub Actions).

Key user flows: login with Spotify -> pick instruments -> see easy songs from top tracks -> sort by time period & difficulty -> favourite songs -> get tab/chord links -> create Spotify playlists -> connect with friends for jam suggestions.

---

## Phase 1: Project Scaffolding & Core MVP

**Goal:** Login -> pick instrument -> see your easy songs. Deployed to Fly.io.

### 1a. Project Setup (copy eurovision patterns)

**Config files to create (mirror eurovision):**
- `package.json` - same structure, drop socket.io deps, keep next/react/prisma/next-auth/tailwind/framer-motion/zod/clsx/tailwind-merge. Add `next-auth` Spotify provider support (built into next-auth v4)
- `tsconfig.json`, `next.config.ts` (output: "standalone"), `postcss.config.mjs`, `eslint.config.mjs` - copy from eurovision
- `vitest.config.ts`, `playwright.config.ts` - copy from eurovision
- `.gitignore`, `.dockerignore` - copy from eurovision
- `.env.example` with: `DATABASE_URL`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- `docker-compose.yml` - postgres:16-alpine, user/db: `learnmyfavs`
- `src/test/setup.ts` - copy from eurovision

**Deployment files (mirror eurovision exactly):**
- `fly.toml` - app: `learn-our-favs`, region: `lhr`, port 3000, shared-cpu-1x 512mb, health check at `/api/health`
- `Dockerfile` - 3-stage (deps/builder/runner), CMD: `prisma migrate deploy && prisma db seed && node server.js`
- `server.js` - simplified, no socket.io (just Next.js custom server for future extensibility)
- `.github/workflows/fly-production.yml` - test then deploy on main push
- `.github/workflows/fly-review.yml` - PR preview apps with postgres
- `.github/workflows/pr-checks.yml` - lint + test on PR

### 1b. Database Schema

**File:** `prisma/schema.prisma`

Models (all created upfront, unused tables cost nothing):
- `User` - id, spotifyId (unique), displayName, email, imageUrl, timestamps
- `Instrument` - id, name (unique), displayName, iconEmoji
- `UserInstrument` - userId, instrumentId, skillLevel (BEGINNER/INTERMEDIATE/ADVANCED), playStyle (CHORDS/FINGERPICKING/STRUMMING/LEAD/RHYTHM/ACCOMPANIMENT), unique(userId, instrumentId)
- `FavouriteSong` - userId, spotifyTrackId, trackName, artistName, albumName, albumImageUrl, unique(userId, spotifyTrackId)
- `SongDifficulty` - spotifyTrackId, trackName, artistName, instrumentId, difficulty (1-10), tabUrl, tabProvider, tabRating, source, unique(spotifyTrackId, instrumentId)
- `TopTracksCache` - userId, timeRange, tracksJson, fetchedAt, unique(userId, timeRange)
- `Friendship` - requesterId, recipientId, status (PENDING/ACCEPTED/DECLINED), unique(requesterId, recipientId)

**File:** `prisma/seed.ts` - seed Instrument table with guitar, piano, bass, ukulele, drums

### 1c. Authentication

**File:** `src/lib/auth.ts` - NextAuth config with Spotify provider
- Scopes: `user-read-email user-top-read playlist-modify-public playlist-modify-private`
- JWT callback: store accessToken, refreshToken, expiresAt; auto-refresh expired tokens
- Session callback: expose accessToken and spotify user ID in session
- signIn callback: upsert User record in DB on login

**File:** `src/app/api/auth/[...nextauth]/route.ts` - standard NextAuth route handler

### 1d. Core Libraries

**File:** `src/lib/prisma.ts` - Prisma singleton (copy eurovision pattern)
**File:** `src/lib/cn.ts` - clsx + twMerge utility

**File:** `src/lib/spotify.ts` - Spotify Web API helpers:
- `getTopTracks(accessToken, timeRange, limit)` - GET /v1/me/top/tracks
- `getUserProfile(accessToken)` - GET /v1/me
- `createPlaylist(accessToken, userId, name, trackUris)` - POST /v1/users/{id}/playlists
- `refreshAccessToken(token)` - POST /api/token with refresh_token grant

**File:** `src/lib/songsterr.ts` - Songsterr API client:
- `searchSong(artist, title)` - GET `songsterr.com/a/ra/songs.json?pattern={query}`
- `getTabUrl(songId)` - construct tab URL
- Fuzzy match Spotify track metadata to Songsterr results

**File:** `src/lib/difficulty.ts` - Difficulty scoring:
- `scoreDifficulty(songsterrData, instrument)` - map to 1-10 scale
- `heuristicDifficulty(track, instrument)` - fallback using tempo/key
- `getDifficultyLabel(score)` - "Easy"/"Medium"/"Hard"

**File:** `src/lib/constants.ts` - instruments, skill levels, time ranges, difficulty thresholds

### 1e. API Routes (Phase 1)

- `src/app/api/health/route.ts` - GET returns `{ status: "ok" }`
- `src/app/api/instruments/route.ts` - GET returns all instruments
- `src/app/api/user/instruments/route.ts` - GET/PUT user's instrument selections
- `src/app/api/user/profile/route.ts` - GET/PATCH user profile
- `src/app/api/spotify/top-tracks/route.ts` - GET: check cache TTL, fetch from Spotify if stale, enrich with difficulty from SongDifficulty table (fetch from Songsterr on miss), return sorted results

### 1f. UI Pages & Components

**Layout & Theme:**
- `src/app/layout.tsx` - root layout with AuthProvider, ThemeProvider, nav
- `src/app/globals.css` - Spotify-green (#1DB954) primary, dark bg (#121212)
- `src/components/auth/AuthProvider.tsx` - SessionProvider wrapper
- `src/components/ui/Header.tsx` - app header with nav and user avatar
- `src/components/ui/GlassCard.tsx` - glass morphism card
- `src/components/ui/ThemeProvider.tsx` + `ThemeToggle.tsx`

**Pages:**
- `src/app/page.tsx` - landing page with "Login with Spotify" CTA
- `src/app/onboarding/page.tsx` - post-first-login instrument & skill selection
- `src/app/dashboard/page.tsx` - **core feature**: top tracks with difficulty, sorted/filtered

**Song Components:**
- `src/components/songs/SongCard.tsx` - album art, track name, artist, difficulty badge, tab link
- `src/components/songs/SongList.tsx` - list with sort controls
- `src/components/songs/DifficultyBadge.tsx` - green/yellow/red
- `src/components/songs/TimePeriodSelector.tsx` - short_term/medium_term/long_term
- `src/components/songs/InstrumentFilter.tsx`
- `src/components/auth/LoginButton.tsx` - Spotify-branded green button

**Hooks:**
- `src/hooks/useTopTracks.ts` - fetch top tracks with time range

### 1g. Tests

- `src/lib/difficulty.test.ts` - unit tests for scoring logic
- `e2e/home.spec.ts` - landing page loads, login button visible

---

## Phase 2: Favouriting & Sorting

- `src/app/api/songs/[id]/route.ts` - PATCH toggle favourite
- `src/app/api/songs/favourites/route.ts` - GET user's favourites
- `src/app/favourites/page.tsx` - favourites page
- `src/components/songs/FavouriteButton.tsx` - heart toggle on SongCard
- `src/components/songs/SortControls.tsx` - sort by difficulty, name, recently played
- `src/hooks/useFavourites.ts`
- `e2e/favourites.spec.ts`

---

## Phase 3: Playlist Creation

- `src/app/api/spotify/create-playlist/route.ts` - POST: create Spotify playlist from selected songs
- `src/components/playlist/PlaylistCreator.tsx` - select songs, name playlist, create
- `src/components/playlist/PlaylistSuccessModal.tsx` - confirmation with Spotify link
- `e2e/playlist.spec.ts`

---

## Phase 4: Social / Friends & Jam Matching

- `src/app/api/friends/route.ts` - GET list friends; POST send request
- `src/app/api/friends/[id]/route.ts` - PATCH accept/decline; DELETE remove
- `src/app/api/friends/[id]/jam/route.ts` - GET jam song matches
- `src/app/friends/page.tsx` - friend list, requests, search
- `src/app/friends/[id]/page.tsx` - friend profile + jam view
- `src/lib/jam.ts` - jam matching algorithm: intersect top tracks, filter by both users' instrument difficulties within skill thresholds, sort by combined easiness
- `src/components/friends/FriendCard.tsx`, `FriendRequestButton.tsx`, `JamSongList.tsx`
- `src/hooks/useFriends.ts`
- `e2e/friends.spec.ts`

---

## Phase 5: Enhanced Difficulty Sources

- `src/lib/ultimate-guitar.ts` - additional tab source (if feasible)
- User-submitted difficulty ratings (new `UserDifficultyRating` model)
- Aggregate crowd-sourced ratings into SongDifficulty scores

---

## Phase 6: Polish

- Error boundaries, loading skeletons
- Rate limiting on Spotify/Songsterr API calls
- Mobile responsive polish
- README.md

---

## Key Design Decisions

1. **Difficulty data**: Songsterr API (free, covers guitar/bass/drums/keyboard) as primary source, with heuristic fallback. Cache results in SongDifficulty table.
2. **Top tracks caching**: Cache in DB with TTL (24h for short_term, 3d for medium_term, 7d for long_term) to avoid Spotify rate limits.
3. **No WebSockets**: Social features are async (no real-time needed unlike eurovision).
4. **NextAuth v4**: Match eurovision's version for consistency. Spotify provider built-in.
5. **server.js**: Simplified (no socket.io) but kept for future extensibility.

## Verification

After Phase 1:
1. `npm run dev` - app starts locally on port 3000
2. Click "Login with Spotify" - OAuth flow works, redirects back
3. Onboarding page lets you pick instruments
4. Dashboard shows top tracks with difficulty badges and tab links
5. Time period selector changes displayed tracks
6. `npm test` passes, `npm run lint` passes
7. `npm run test:e2e` passes
8. Docker build succeeds: `docker build -t learn-our-favs .`
9. GitHub Actions deploy to Fly.io on main push
