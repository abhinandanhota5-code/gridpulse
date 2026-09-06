# GRIDPULSE backend (Render)

Express API serving the mock data for both dashboards. Replace the arrays in
`data.js` with real DB/OCPP queries whenever you're ready — the route shapes
won't need to change.

## Endpoints

| Method | Path                | Returns                                          |
|--------|---------------------|---------------------------------------------------|
| GET    | `/api/health`       | `{ status: "ok" }` liveness check                  |
| GET    | `/api/driver`       | EV driver dashboard bundle (history, FASTag txns, nearby chargers, charge planner data) |
| GET    | `/api/owner`        | Fleet owner dashboard bundle (chargers, sessions, grid load, theft, weather, etc.) |
| POST   | `/api/auth/login`   | Mock login — `{ email, role }` → `{ name, role }`  |

## Local dev

```bash
npm install
cp .env.example .env
npm run dev        # nodemon-style reload via `node --watch`
```

Runs on `http://localhost:4000` by default.

## Deploying to Render

1. Push this `backend/` folder to a Git repo (or the repo root, if that's how
   you've structured things — Render lets you set a "Root Directory").
2. On Render: **New → Web Service** → connect the repo.
3. Settings:
   - **Root Directory:** `backend` (if backend/frontend share one repo)
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node
4. Add an environment variable `CORS_ORIGIN` set to your Vercel frontend URL
   (e.g. `https://gridpulse.vercel.app`). Add more, comma-separated, if you
   have preview deploys too.
5. Deploy. Render gives you a URL like `https://gridpulse-backend.onrender.com`
   — that's what the frontend's `VITE_API_URL` should point to.

Note: Render's free tier spins down on inactivity, so the first request after
a quiet period can take a few seconds to wake up.
