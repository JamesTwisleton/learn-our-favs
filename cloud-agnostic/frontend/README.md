# Frontend — Next.js (cloud-agnostic)

A thin client of the Spring Boot API. In the demonstration architecture this is
containerised and deployed to Kubernetes alongside the backend (PRD §6); it does
not talk to any database directly.

```bash
cd cloud-agnostic/frontend
npm install
BACKEND_URL=http://localhost:8080 npm run dev    # http://localhost:3001
```

The landing page calls the backend `/api/health` so you can see the two wired
together.

## Planned (not in the foundation)

- Storybook + a shared component library (PRD §6 — the thing that justifies
  Storybook).
- The real UI: sign-in, connect Spotify, top tracks, bands, pool, notes,
  recordings.
- Session handling against the app-minted token (PRD §3.2).
