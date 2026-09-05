# Learn My Favs

Discover which of your most-played Spotify songs are easy to play on your favourite instrument. Get tabs, sort by difficulty, and jam with friends.

## How It Works

See [docs/HOW_IT_WORKS.md](docs/HOW_IT_WORKS.md) for a detailed explanation of the app's architecture, how difficulty scoring works, the Spotify integration, tab link generation, and data flow.

## Local Development

### Prerequisites

- Node.js 20+
- Docker (for PostgreSQL)
- A [Spotify Developer](https://developer.spotify.com/dashboard) app with:
  - Redirect URI: `http://127.0.0.1:3000/api/auth/callback/spotify`
  - Web API enabled

### Setup

1. **Start the database:**

```bash
docker compose up -d
```

2. **Install dependencies:**

```bash
npm install
```

3. **Configure environment variables:**

```bash
cp .env.example .env
```

Edit `.env` with your values:

```
DATABASE_URL="postgresql://learnmyfavs:learnmyfavs@localhost:5432/learnmyfavs?schema=public"
SPOTIFY_CLIENT_ID="your-spotify-client-id"
SPOTIFY_CLIENT_SECRET="your-spotify-client-secret"
NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"
NEXTAUTH_URL="http://127.0.0.1:3000"
```

4. **Run database migrations and seed:**

```bash
npx prisma migrate dev
npx prisma db seed
```

5. **Start the dev server:**

```bash
npm run dev
```

The app will be running at [http://127.0.0.1:3000](http://127.0.0.1:3000).

### Running Tests

```bash
npm test                                    # unit tests
npm run test:e2e -- --project=chromium      # e2e tests (requires npx playwright install)
npm run lint                                # linting
```

## Deployment

Deployed to [Fly.io](https://fly.io) via GitHub Actions. Pushes to `main` trigger production deploys. Pull requests get ephemeral preview environments.
