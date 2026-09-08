# GRIDPULSE — split repo

The original single-file `GridPulseApp.jsx` is now two deployable pieces
backed by a real-time **protocol gateway** (OCPP CSMS, MODBUS master,
OpenADR VTN, ANPR, and Josev/VOLTTRON ingest bridges):

```
backend/    Express + WebSocket API (mock data + live protocol feeds) → Render
frontend/   Vite + React UI (fetches from the API, SSE-live)           → Vercel
scripts/    Demo simulators for every protocol endpoint
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
npm run dev            # http://localhost:4000 (HTTP + OCPP WebSocket)

# terminal 2
cd frontend
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:4000
npm run dev            # http://localhost:5173
```

## Live protocol demo

Log in as **Fleet Manager** → **Overview** to see the *Live integrations*
panel, or **Settings** → *ANPR connection* for the live plate feed. Start
each protocol simulator in its own terminal:

```bash
# OCPP 1.6 charger       -> boot/transaction/meter-values on /ocpp
node scripts/ocpp-sim.js

# ANPR bay cameras      -> POST /api/v1/plate-events (built-in demo streamer
#                          also runs by default as ANPR_DEMO=on)
node scripts/anpr-sim.js

# MODBUS energy meters  -> drives /api/modbus/sim (the backend master also
#                          polls a real Open ModSim TCP slave on :1502)
node scripts/modbus-sim.js

# OpenADR 2.0b VEN      -> EiRegisterParty + EiEvent poll + EiOpt against /openadr
node scripts/ven-node.js

# Josev (ISO 15118) + VOLTTRON ingest bridges
node scripts/ingest-bridges.js
```

- The OCPP CSMS speaks real OCPP 1.6J / 2.0.1 over WebSocket. Point
  `ocpp-ws-simulator` or a real charger at `ws://<host>/ocpp/{stationId}`.
- Live snapshots stream to the UI over SSE (`GET /api/stream`), fallback to a
  10 s poll in `DataContext.jsx`.
- OpenADR XML endpoints: `POST /openadr/ei/register`,
  `POST /openadr/ei/event` (EiPoll → DistributeEvent), `POST /openadr/ei/opt`.
- Ingest bridges: `POST /api/ingest/josev`, `POST /api/ingest/volttron`,
  optionally protected by the `INGEST_TOKEN` env var (`x-ingest-token` header).
- Backend env knobs: `PORT`, `CORS_ORIGIN`, `MODBUS_HOST/PORT/POLL_MS`,
  `ANPR_DEMO=off`, `INGEST_TOKEN`.

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
- New real-time protocol gateway in `backend/`: `ocpp.js` (CSMS on the same
  HTTP server), `modbus.js` (TCP master), `openadr.js` (minimal 2.0b VTN),
  `anpr.js` (plate-events service + demo streamer), `live.js` (in-memory hub
  + SSE fan-out), and `merge.js` (overlays live feeds on `/api/driver` +
  `/api/owner`).
- The three charge-planner profile icons (Zap/Gauge/Leaf) are attached
  client-side in `DataContext.jsx`, since icon components can't be sent as
  JSON — the backend just sends an `iconKey` string.
- `DataContext.jsx` now also subscribes to the live stream and exposes
  `useLiveData()` (sources, stations, ANPR, DR events).
- Settings OCPP/ANPR tests are real now (WebSocket BootNotification handshake
  / live plate-event POST), endpoints default to `wsBaseUrl()/ocpp/{id}` and
  `${API_BASE_URL}/api/v1/plate-events`.
- Login (`LoginScreen`) still works the same locally; a `POST /api/auth/login`
  mock route exists in the backend if/when you want the frontend to call out
  for auth instead of setting session state directly.
