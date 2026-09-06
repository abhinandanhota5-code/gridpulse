# GRIDPULSE — split repo

The original single-file `GridPulseApp.jsx` is now two deployable pieces:

```
backend/    Express API (mock data + a mock login route) → deploy to Render
frontend/   Vite + React UI (fetches from the API)        → deploy to Vercel
```

## Why this split

- **`backend/`** owns all the data: charging history, FASTag transactions,
  fleet/charger status, grid load, theft detection, weather — everything that
  used to be hardcoded arrays at the top of the React file. Swap the arrays
  in `backend/data.js` for real DB/OCPP queries whenever you're ready; the
  route shapes (`/api/driver`, `/api/owner`) don't need to change.
- **`frontend/`** owns the UI only. It fetches those two bundles once (via
  `DataContext.jsx`) and every page component pulls what it needs through
  `useDriverData()` / `useOwnerData()` instead of reading module constants.

## Running both locally

```bash
# terminal 1
cd backend
npm install
npm run dev            # http://localhost:4000

# terminal 2
cd frontend
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:4000
npm run dev            # http://localhost:5173
```

## Deploying

1. **Backend → Render**: see `backend/README.md`. You'll end up with a URL
   like `https://gridpulse-backend.onrender.com`.
2. **Frontend → Vercel**: see `frontend/README.md`. Set `VITE_API_URL` to the
   Render URL from step 1.
3. Back on Render, set `CORS_ORIGIN` to your Vercel URL so the browser is
   allowed to call the API.

## What changed vs. the single-file version

- All mock data arrays moved from the top of `GridPulseApp.jsx` into
  `backend/data.js`, served via `GET /api/driver` and `GET /api/owner`.
- Design tokens (`C`, `STATUS_COLOR`, `CONFIDENCE_COLOR`) moved to
  `frontend/src/theme.js`.
- The three charge-planner profile icons (Zap/Gauge/Leaf) are attached
  client-side in `DataContext.jsx`, since icon components can't be sent as
  JSON — the backend just sends an `iconKey` string.
- Login (`LoginScreen`) still works the same locally; a `POST /api/auth/login`
  mock route exists in the backend if/when you want the frontend to call out
  for auth instead of setting session state directly.
- No visual or behavioral changes to the dashboards themselves.
