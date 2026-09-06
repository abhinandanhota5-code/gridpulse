# GRIDPULSE frontend (Vercel)

Vite + React UI. All mock data used to live at the top of `GridPulseApp.jsx`;
it's now fetched from the backend through `DataContext.jsx` / `api.js`.

## Structure

```
src/
  main.jsx          — mounts <App> inside <AppDataProvider>
  DataContext.jsx    — fetches /api/driver and /api/owner once, exposes
                        useDriverData() / useOwnerData() / useAppData()
  api.js             — fetch helper, reads VITE_API_URL
  theme.js           — design tokens (colors, status → color maps)
  GridPulseApp.jsx    — the dashboard UI itself (unchanged visually)
```

Each page component (e.g. `DriverHistoryPage`, `OwnerGridPage`) calls
`useDriverData()` / `useOwnerData()` to pull just the fields it needs, instead
of reading module-level constants. `DriverDashboard` and `OwnerDashboard` show
a loading/error state until the backend responds, so child pages can assume
their data has already arrived.

## Local dev

```bash
npm install
cp .env.example .env      # point VITE_API_URL at your local backend
npm run dev
```

Runs on `http://localhost:5173` by default. Make sure the backend (see
`../backend`) is running on the URL you set in `.env`.

## Deploying to Vercel

1. Push this `frontend/` folder to a Git repo (or set Vercel's "Root
   Directory" to `frontend` if backend/frontend share one repo).
2. On Vercel: **New Project** → import the repo. Framework preset: **Vite**.
3. Add an environment variable:
   - `VITE_API_URL` = your Render backend URL, e.g.
     `https://gridpulse-backend.onrender.com`
4. Deploy. Vercel builds with `npm run build` and serves the `dist/` output.

Remember to add this Vercel URL to the backend's `CORS_ORIGIN` env var, or
API requests will be blocked by the browser.
