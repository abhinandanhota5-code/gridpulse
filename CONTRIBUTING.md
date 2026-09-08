# Contributing to GRIDPULSE

Thanks for helping out! This project federates real EV-charging protocols
(OCPP, MODBUS, OpenADR, ISO 15118, VOLTTRON, ANPR) into driver + fleet-owner
dashboards. Below is everything you need to build, test and open a PR.

## Getting started (local)

```bash
# one-time
cd backend && npm install
cd ../frontend && npm install && cp .env.example .env   # VITE_API_URL=http://localhost:4000

# terminal 1
cd backend && npm run dev        # http://localhost:4000 (HTTP + OCPP WebSocket)

# terminal 2
cd frontend && npm run dev       # http://localhost:5173
```

Single-service mode (backend serves the built UI):

```bash
npm run build && npm start       # from the repo root -> http://localhost:4000
```

### Start the protocol simulators (optional)

```bash
node scripts/ocpp-sim.js         # OCPP 1.6 chargers -> /ocpp
node scripts/anpr-sim.js         # ANPR plate events -> /api/v1/plate-events
node scripts/modbus-sim.js       # MODBUS meters -> /api/modbus/sim
node scripts/ven-node.js         # OpenADR 2.0b VEN -> /openadr
node scripts/ingest-bridges.js   # Josev (ISO 15118) + VOLTTRON
```

## Project layout

```
backend/    Express + WebSocket API (live protocol feeds)   -> served in prod
frontend/   Vite + React UI (fetches API, SSE-live)
scripts/    Demo simulators for every protocol endpoint
render.yaml One-click Render blueprint for the single-service deploy
```

## Making changes

- **Frontend**: edit `frontend/src/*.jsx` and `*.js`. Build before pushing:

  ```bash
  cd frontend && npm run build
  ```

  Confirm any `VITE_API_URL` behavior stays correct — the default (empty) means
  same-origin for the single-service deploy.

- **Backend**: edit `backend/*.js`. Verify with:

  ```bash
  cd backend && npm start
  curl -s localhost:4000/api/health
  curl -s localhost:4000/api/live | head -c 200
  ```

- **Never commit** `node_modules/`, `dist/` or `.env` — the repo `.gitignore`
  already excludes them.

## Code style

- No comments unless they clarify a non-obvious integration decision.
- Match surrounding style (JSX/components, CommonJS backend, inline CSS in
  `GridPulseApp.jsx` for dashboard styling).
- Keep API route shapes stable — `DataContext.jsx` maps `/api/driver` and
  `/api/owner` into hooks like `useDriverData()`. Add new live fields to the
  unified snapshot in `backend/live.js` and overlay them in `backend/merge.js`.

## Testing

There is no automated test suite yet. Verification steps before a PR:

1. `npm run build` in `frontend/` passes.
2. The three dashboards load at `http://localhost:4173` (or the deployed URL).
3. Live panels show connected OCPP/MODBUS sources (or a graceful "offline"
   state) — not crashes.
4. A fresh `npm install && npm run build` (root) reproduces the single-service
   build with no errors.

## Opening a PR

1. Fork or branch off `main`.
2. Make your change with a focused commit.
3. Open a PR against `main`. Summarize the *what* and the *why*; screenshots or
   a short loom for UI changes help reviewers.
4. Keep the change reviewable — split large features into multiple PRs.

Questions? Open an issue first so the intent is on the record.