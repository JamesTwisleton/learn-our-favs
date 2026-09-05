# How Learn My Favs Works

## Overview

Learn My Favs connects to your Spotify account, pulls your most-played songs, and tells you which ones are easiest to play on your chosen instrument. Each song gets a difficulty rating, links to tabs/chords, and can be favourited for later. The goal is to answer: "I want to learn an instrument - which songs I already love should I start with?"

## Authentication Flow

The app uses [NextAuth.js](https://next-auth.js.org/) with the Spotify OAuth provider. When you click "Login with Spotify", here's what happens:

1. NextAuth redirects you to Spotify's authorization page
2. You grant the app permission to read your top tracks, email, and create playlists
3. Spotify redirects back to `/api/auth/callback/spotify` with an authorization code
4. NextAuth exchanges the code for an access token and refresh token
5. The app upserts your user record in the database (creating it on first login)
6. The access token is stored in an encrypted JWT cookie

**Scopes requested:**
- `user-read-email` - your email for the user profile
- `user-top-read` - your most-played tracks across different time periods
- `playlist-modify-public` / `playlist-modify-private` - creating playlists from your easy songs (future feature)

**Token refresh:** Spotify access tokens expire after 1 hour. The app automatically detects expired tokens in the NextAuth JWT callback and uses the refresh token to get a new access token, so you stay logged in seamlessly.

## Fetching Your Top Tracks

Spotify's API provides your most-played tracks across three time windows:

| Time Range | Spotify Parameter | What It Covers |
|---|---|---|
| Last 4 Weeks | `short_term` | Very recent listening |
| Last 6 Months | `medium_term` | Medium-term habits |
| All Time | `long_term` | Your lifetime listening history |

The app calls `GET /v1/me/top/tracks` with your chosen time range and retrieves up to 50 tracks, including metadata like track name, artist, album, album art, and a Spotify link.

### Caching

To avoid hammering Spotify's rate limits and to make page loads instant, top tracks are cached in the database (`TopTracksCache` table) with different TTLs:

- **Last 4 Weeks:** cached for 24 hours (changes frequently)
- **Last 6 Months:** cached for 3 days
- **All Time:** cached for 7 days (rarely changes)

When you load the dashboard, the app checks if the cache is fresh. If so, it serves the cached data immediately. If stale, it fetches fresh data from Spotify and updates the cache.

## How Difficulty Is Derived

This is the core question the app answers: "How hard is this song to play on my instrument?" Here's how it works currently, and where it's headed.

### Current Implementation: Instrument-Based Heuristic

When a song's difficulty is first requested for a given instrument, the app assigns a baseline difficulty score on a 1-10 scale based on the instrument:

| Instrument | Default Difficulty | Rationale |
|---|---|---|
| Ukulele | 3 (Easy) | Fewer strings, simpler chord shapes, most pop songs are straightforward |
| Bass | 4 (Easy-Medium) | Single-note lines are generally more approachable than full chords |
| Guitar | 5 (Medium) | Wide range of difficulty depending on the song |
| Piano | 5 (Medium) | Wide range of difficulty depending on the song |
| Drums | 5 (Medium) | Rhythm complexity varies greatly |

This is a deliberate starting point. The heuristic gives every song a reasonable default, but the real value comes from the tab links (see below) where you can see the actual chords/tabs and judge for yourself.

### Why Not Per-Song Difficulty?

Accurate per-song difficulty is a hard problem. Here's what we explored and why:

1. **Songsterr API** - Songsterr used to provide a free API (`/a/ra/songs.json`) that returned difficulty ratings per instrument per song. This was the original plan for the app. However, their API now returns 404 for all requests - it's been shut down. The Songsterr website still works for searching tabs, so we link to it directly.

2. **Spotify Audio Features** - Spotify's `GET /v1/audio-features` endpoint provides tempo, key, energy, and other audio properties. In theory, you could use these (slower tempo = easier, key of C/G = easier for guitar). However, this endpoint is being deprecated and the correlation between audio features and playability is weak - a slow song can still have complex chord progressions.

3. **Web scraping** - Scraping Ultimate Guitar or Songsterr for difficulty ratings is possible but fragile, legally grey, and slow at scale (50 songs per user per time range).

### The Difficulty Scale

Regardless of source, all difficulty scores map to a 1-10 integer scale, displayed as three tiers:

| Score | Label | Badge Colour |
|---|---|---|
| 1-3 | Easy | Green |
| 4-6 | Medium | Yellow |
| 7-10 | Hard | Red |

### Caching and the SongDifficulty Table

Once difficulty is computed for a track+instrument pair, it's stored in the `SongDifficulty` table with a unique constraint on `(spotifyTrackId, instrumentId)`. This means:

- The same song only gets scored once per instrument, ever
- Different instruments get different scores for the same song
- The `source` column records how the difficulty was derived (currently `"heuristic"`, designed to also support `"songsterr_api"`, `"user_rating"`, etc.)
- The cache persists across all users - if one user looks up "Creep" on guitar, the next user gets the cached result instantly

### Future Difficulty Improvements

The schema and architecture are designed to support richer difficulty sources:

- **User-submitted ratings** - After learning a song, users could rate its actual difficulty, crowd-sourcing better data over time
- **Chord analysis** - If a tab provider API becomes available, counting unique chords, presence of barre chords, and tempo could produce per-song scores
- **Machine learning** - Given enough user ratings, a model could predict difficulty from audio features + metadata

## Tab and Chord Links

Every song gets two tab links, generated from the artist name and track title:

### Ultimate Guitar
The primary link. Searches Ultimate Guitar with the correct tab type for your instrument:

| Instrument | Search Type | What You Get |
|---|---|---|
| Guitar | `chords` | Chord charts with lyrics |
| Piano | `chords` | Chord charts (adaptable to piano) |
| Bass | `bass-tabs` | Bass tablature |
| Ukulele | `ukulele-chords` | Ukulele chord charts |
| Drums | `drum-tabs` | Drum notation/tabs |

### Songsterr
The secondary link. Songsterr provides interactive, playable tabs with audio playback - great for learning by ear alongside the tab. The search URL works for all instruments.

Both links open in a new tab. They're search URLs rather than direct links to specific tabs, so you can pick the highest-rated version from the search results.

## Favouriting Songs

You can favourite any song by clicking the heart icon. This:

1. Sends a POST to `/api/songs/favourites` with the track metadata
2. Toggles the favourite state - clicking again unfavourites
3. Stores the favourite in the `FavouriteSong` table linked to your user
4. The favourited state is included in the top tracks API response so hearts persist across page loads

## Instrument Selection and Onboarding

On first login, you're redirected to the onboarding page where you:

1. **Pick instruments** - select one or more from guitar, piano, bass, ukulele, drums
2. **Set skill level** - Beginner, Intermediate, or Advanced for each instrument
3. **Choose play style** (optional) - Chords, Fingerpicking, Strumming, Lead, Rhythm, Accompaniment, or Full Score

These selections are stored in the `UserInstrument` table. On the dashboard, you can filter your songs by instrument, and the difficulty scores and tab links adjust to match.

## Architecture

### Tech Stack
- **Next.js 16** (App Router) with React 19 and TypeScript
- **PostgreSQL** with Prisma ORM
- **Tailwind CSS v4** for styling
- **NextAuth.js v4** for Spotify OAuth
- **Fly.io** for hosting with auto-scaling (scales to zero when idle)

### Key Files
```
src/lib/auth.ts          - Spotify OAuth config with token refresh
src/lib/spotify.ts       - Spotify Web API client (top tracks, playlists)
src/lib/difficulty.ts    - Difficulty scoring engine
src/lib/tabs.ts          - Ultimate Guitar and Songsterr URL generation
src/lib/constants.ts     - Time ranges, skill levels, difficulty thresholds

src/app/api/spotify/top-tracks/route.ts  - Main data endpoint
src/app/api/songs/favourites/route.ts    - Favourite toggle
src/app/dashboard/page.tsx               - Core song discovery UI
src/app/onboarding/page.tsx              - Instrument selection
```

### Data Flow
```
User loads dashboard
    |
    v
GET /api/spotify/top-tracks?timeRange=medium_term&instrumentId=xxx
    |
    |-- Check TopTracksCache (is cache fresh?)
    |     |-- Yes: use cached tracks
    |     |-- No:  fetch from Spotify API, update cache
    |
    |-- For each track, check SongDifficulty cache
    |     |-- Cached: use cached difficulty
    |     |-- Not cached: compute heuristic, save to DB
    |
    |-- Generate Ultimate Guitar + Songsterr URLs per track
    |-- Check FavouriteSong table for favourited state
    |
    v
Return enriched track list to frontend
    |
    v
Frontend sorts by difficulty (easiest first by default)
and renders song cards with difficulty badges, tab links,
favourite buttons, and Spotify links
```
