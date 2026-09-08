# GRIDPULSE

Live EV-charging dashboards for drivers and fleet owners, backed by a real-time
**protocol gateway** that speaks OCPP, MODBUS, OpenADR, ISO 15118 (Josev),
VOLTTRON and ANPR right out of the box.

- **Driver view** — live charger map, GPS + realtime weather trip planner,
  smart charge planner (grid/solar/demand-response aware), predictive insights.
- **Owner view** — fleet/grid/energy/battery/alerts/theft monitoring with live
  protocol telemetry and forecasting.
- **One deployable unit** — the backend serves the built frontend (single
  service for Render or any Node host).
- **Desktop app** — bundled, double-click install for macOS & Windows, with a
  built-in Setup guide; ships everything needed, no Node.js install required.

## Repo layout

```
backend/    Express + WebSocket API — HTTP, SSE live stream, OCPP CSMS,
            MODBUS master, OpenADR VTN (2.0b), ANPR, FX + weather proxies
frontend/   Vite + React UI (fetches from the API, SSE-live)
scripts/    Demo simulators for every protocol endpoint
desktop/    Electron shell that bundles the backend + UI into an installer
```

## Run from source (dev)

```bash
# terminal 1 — backend (HTTP + OCPP WebSocket)
cd backend && npm install && npm run dev        # http://localhost:4000

# terminal 2 — frontend (Vite dev server)
cd frontend && npm install && npm run dev        # http://localhost:5173
```

## Run as a single service (production shape)

```bash
npm install          # installs backend + frontend deps (root postinstall)
npm run build        # builds frontend/dist
npm start            # node backend/server.js  → serves UI + API on :4000
```

## Live protocol demo

Log in as **Fleet Manager** → **Overview** to see the *Live integrations* panel.
Start each simulator in its own terminal (they auto-point at `localhost:4000`):

```bash
node scripts/ocpp-sim.js         # OCPP 1.6/2.0.1 charge points (4 stations)
node scripts/modbus-sim.js       # energy meters → /api/modbus/sim
node scripts/ven-node.js         # OpenADR 2.0b VEN (register/poll/opt)
node scripts/ingest-bridges.js   # Josev (ISO 15118) + VOLTTRON ingest
```

- OCPP CSMS speaks real OCPP 1.6J / 2.0.1 over WebSocket; point a charger at
  `ws://<host>/ocpp/{stationId}`.
- Live snapshots stream to the UI over SSE (`GET /api/stream`), with a 10 s poll
  fallback in `DataContext.jsx`.
- OpenADR XML endpoints: `POST /openadr/ei/register`, `POST /openadr/ei/event`,
  `POST /openadr/ei/opt`. Ingest: `POST /api/ingest/josev`,
  `POST /api/ingest/volttron` (optional `x-ingest-token` auth).
- Realtime, keyless: USD→INR via `backend/fx.js`, weather via `backend/weather.js`
  (Open-Meteo proxy at `GET /api/weather?lat=&lon=`).
- Backend env knobs: `PORT`, `CORS_ORIGIN`, `INGEST_TOKEN`, `MODBUS_HOST/PORT`,
  `ANPR_DEMO=off`, `GRIDPULSE_DIST`.

## Desktop app (downloadable, zero-setup)

`desktop/` is an Electron shell. It boots the bundled backend on a local port,
auto-starts the protocol simulators so every dashboard is alive, and opens the
UI in a native window (the on-screen **Setup guide** explains core requirements
and what to download if a component is genuinely missing).

```bash
cd desktop && npm install
npm run start          # run from source
npm run dist:mac       # build macOS DMG + zip
npm run dist:win       # build Windows NSIS + zip
```

Windows and macOS (Intel + Apple Silicon) installers are also built
automatically by CI (`.github/workflows/build-desktop.yml`) and attached to a
GitHub **Release** when you push a `v*` tag.

## Deploying to Render (single service)

1. Push this repo (or connect it) to Render as a **Web Service**.
2. `render.yaml` is included — Render will read it automatically:
   build `npm install && npm run build`, start `node backend/server.js`,
   health check at `/api/health`.
3. Add-secret env vars as needed: `INGEST_TOKEN`, `CORS_ORIGIN`.

## Demos to try

| Account | Password | What it shows |
| --- | --- | --- |
| `TN84DR5021` | `demo123` | Driver: live chargers, GPS + weather planner, smart charging |
| `GRIDPULSE` | `owner123` | Owner: grid/energy/alerts/theft + predictive insights |

## License

Apache-2.0 — see [LICENSE](LICENSE) and [CONTRIBUTING.md](CONTRIBUTING.md).