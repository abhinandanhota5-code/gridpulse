/* Load backend/.env first so module-level config (chat.js PRISM vars,
   CORS, MODBUS, ports, tokens) is set before anything reads it.
   dotenv is optional at runtime: packaged installers bundle a copy, and a
   missing .env (or missing package) must never prevent the backend boot. */
try {
  require("dotenv").config({ path: require("path").join(__dirname, ".env") });
} catch (_) { /* dotenv/.env absent — run with process env only */ }

const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const { live } = require("./live");
const { attach: attachOcpp } = require("./ocpp");
const { registerAnpr } = require("./anpr");
const { registerModbus } = require("./modbus");
const { registerOpenAdr } = require("./openadr");
const { buildDriverData, buildOwnerData } = require("./merge");
const fx = require("./fx");
const { fetchWeather } = require("./weather");
const { geocode } = require("./geocode");
const { fetchRoute } = require("./osrm");
const chat = require("./chat");
const ai = require("./ollama");

const app = express();
const PORT = process.env.PORT || 4000;

/* Comma-separated list of allowed origins, e.g.
   "https://gridpulse.vercel.app,http://localhost:5173"
   Falls back to "*" for local/dev convenience — lock this down in production. */
const allowedOrigins = (process.env.CORS_ORIGIN || "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.includes("*") ? true : allowedOrigins,
  })
);
app.use(express.json({ limit: "1mb" }));

/* ---- PRISMtap: backend request tracing (fire-and-forget, sampled) ----
   Traces the REST/API handlers as PrismTrace "spans" alongside the deeper
   assistant traces emitted in chat.js. Enabled only when
   PRISMTRACE_PROJECT_ID + PRISMTRACE_API_KEY are set; never blocks the
   request, and never touches streams or the already-traced chat route.
   ---------------------------------------------------------------- */
const { emitTrace: emitPrismSpan } = chat;
let prismRequestCount = 0;
app.use("/api", (req, res, next) => {
  if (req.path === "/stream" || req.path === "/chat" || req.path === "/chat/config") return next();
  const t0 = Date.now();
  const started = ++prismRequestCount;
  res.on("finish", () => {
    const code = res.statusCode;
    const traceable = req.method === "POST" || code >= 400 || started % 3 === 0;
    if (!traceable) return;
    emitPrismSpan({
      inputMessages: [{ role: "user", content: `${req.method} ${req.path}` }],
      outputMessage: `HTTP ${code}`,
      model: "gridpulse-api",
      latencyMs: Date.now() - t0,
      sessionId: undefined,
      metadata: {
        route: `${req.baseUrl}${req.path}`,
        method: req.method,
        status: code,
        source: "gridpulse-backend",
      },
    });
  });
  next();
});

/* Capture the raw XML/JSON body for the OpenADR endpoints. */
app.use("/openadr", (req, res, next) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    req.rawBody = Buffer.concat(chunks).toString("utf8") || req.rawBody;
    next();
  });
});

const INGEST_TOKEN = process.env.INGEST_TOKEN || null;

function requireIngestToken(req, res, next) {
  if (!INGEST_TOKEN) return next();
  if (req.headers["x-ingest-token"] === INGEST_TOKEN) return next();
  return res.status(401).json({ error: "unauthorized" });
}

/* ---- core API ---- */
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "gridpulse-backend",
    time: new Date().toISOString(),
    prism: chat.prismEnabled(),
  });
});

app.get("/api/live", (_req, res) => {
  res.json(live.snapshot());
});

/* Dynamic market FX rate (USD -> INR, cached, with fallback). */
app.get("/api/fx", async (_req, res) => {
  const fxState = await fx.get();
  res.json({ usdToInr: fxState.rate, source: fxState.source, fetchedAt: fxState.fetchedAt || null });
});

/* Real-time weather for a GPS coordinate (Open-Meteo proxy, cached, fallback). */
app.get("/api/weather", async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return res.status(400).json({ error: "lat and lon (numbers) are required" });
  }
  res.json(await fetchWeather(lat, lon));
});

/* Place-name search for the charger locator (Nominatim proxy, cached).
   Falls back to an empty result set when upstream is unreachable. */
app.get("/api/geocode", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "q (place query) is required" });
  res.json(await geocode(q));
});

/* Road route between two coordinates (OSRM proxy, cached). Returns
   distance, drive time and a polyline so the map can draw the route. */
app.get("/api/route", async (req, res) => {
  const { from, to } = req.query;
  const parse = (v) => {
    const parts = String(v || "").split(",").map(Number);
    return parts.length === 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])
      ? parts
      : null;
  };
  const f = parse(from);
  const t = parse(to);
  if (!f || !t) {
    return res.status(400).json({ error: "from and to are required as lat,lng pairs" });
  }
  res.json(await fetchRoute(f[0], f[1], t[0], t[1]));
});

app.get("/api/stream", (req, res) => {
  live.addStream(res);
});

// EV driver dashboard: history, FASTag transactions, live OCPP sessions, charge planner data.
app.get("/api/driver", (_req, res) => {
  res.json(buildDriverData());
});

// Fleet owner dashboard: chargers, sessions, grid load, theft detection, demand response.
app.get("/api/owner", (_req, res) => {
  res.json(buildOwnerData());
});

// Mock login — swap for real auth (JWT/session/OAuth) when ready.
app.post("/api/auth/login", (req, res) => {
  const { email, role } = req.body || {};
  const safeRole = role === "owner" ? "owner" : "ev";
  const name = (email && String(email).trim()) || (safeRole === "ev" ? "Driver" : "Fleet Manager");
  res.json({ name, role: safeRole });
});

/* ---- assistant chat (local Ollama by default, cloud fallback) ---- */
app.get("/api/chat/config", (_req, res) => {
  const s = ai.status();
  const mode = chat.providerMode();
  const aiOn = mode === "ollama" ? s.ready : chat.configured() || s.ready;
  res.json({
    ai: aiOn,
    provider: mode,
    model: s.ready ? s.model : chat.effectiveModel(),
    aiReady: s.ready,
    aiPhase: s.phase,
    aiStage: s.stage,
    aiPercent: s.percent,
    aiMessage: s.message,
    aiError: s.error,
    prism: chat.prismEnabled(),
    prismHost: chat.prismHost(),
    note: aiOn
      ? `AI assistant online (${mode === "ollama" ? "local " + s.model : "cloud"}).`
      : mode === "ollama"
        ? "Pulse's local AI is setting up — everything else still works. Ask again in a moment."
        : "No AI provider key set — chat runs in offline knowledge mode. Add a key in the assistant settings or set GRIDPULSE_AI_API_KEY."
  });
});

/* ---- Pulse AI provisioning (local Ollama bootstrap) ---- */
app.get("/api/ai/status", (_req, res) => {
  res.json(ai.status());
});

app.post("/api/ai/setup", async (_req, res) => {
  res.json(await ai.ensure());
});

app.post("/api/ai/recover", async (_req, res) => {
  res.json(await ai.recover());
});

app.post("/api/chat", async (req, res) => {
  const { message, history, apiKey, baseURL, model, sessionId } = req.body || {};
  const text = String(message || "").trim();
  if (!text) return res.status(400).json({ error: "message required", mode: "local" });
  const session = String(sessionId || "").trim().slice(0, 128) || undefined;
  res.json(await chat.ask({ message: text, history, apiKey, baseURL, model, sessionId: session }));
});

/* ---- edge-agent ingest bridges (Josev V2G + VOLTTRON) ---- */
app.post("/api/ingest/josev", requireIngestToken, (req, res) => {
  const b = req.body || {};
  if (!b.event) return res.status(400).json({ error: "event required" });
  live.addV2G({
    station: b.station || "Josev-V2G-01",
    event: b.event,
    connectorId: b.connectorId || 1,
    energyKwh: Number(b.energyKwh) || 0,
    powerKw: Number(b.powerKw) || 0,
    details: b.details || null,
  });
  res.json({ ok: true });
});

app.post("/api/ingest/volttron", requireIngestToken, (req, res) => {
  const b = req.body || {};
  if (!b.metrics) return res.status(400).json({ error: "metrics required" });
  live.addVolttronMetric(b.site || "site-1", b.metrics);
  res.json({ ok: true });
});

/* ---- protocol services ---- */
registerAnpr(app);
registerOpenAdr(app);
registerModbus(app);

/* ---- single-service static host ----
   In production the backend serves the built SPA (frontend/dist) from the same
   origin, so the UI and API/WebSocket live behind one URL. If the build output
   is missing (e.g. local dev), API-only mode keeps working. */
const DIST_DIR = process.env.GRIDPULSE_DIST || path.join(__dirname, "..", "frontend", "dist");
if (fs.existsSync(path.join(DIST_DIR, "index.html"))) {
  app.use(express.static(DIST_DIR, { index: false, setHeaders: (res, filePath) => {
    res.setHeader("Cache-Control", filePath.endsWith("index.html") ? "no-cache" : "public, max-age=3600");
  }}));
  app.get(/^\/(?!api\/|openadr\/).*/, (req, res, next) => {
    if (req.method !== "GET" || !req.accepts("html")) return next();
    res.sendFile(path.join(DIST_DIR, "index.html"));
  });
}

app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.path });
});

const httpServer = http.createServer(app);
attachOcpp(httpServer).then(() => {
  httpServer.listen(PORT, () => {
    console.log(`GRIDPULSE backend listening on port ${PORT}`);
    startDemoSims(PORT);
  });
});

/* ---- Pulse AI: provision local Ollama in the background on boot,
   never blocking the rest of the app. A recovery loop re-starts the
   engine if it stops later. Set GRIDPULSE_AI_PROVIDER=cloud to opt
   out and keep the legacy remote-provider path. ---- */
if (ai.localEnabled()) {
  ai.ensure().then((s) => {
    console.log(`[ai] Pulse AI provider=ollama arch=${s.arch} ready=${s.ready} phase=${s.phase}`);
    if (!s.ready && s.message) console.log(`[ai] ${s.message}`);
  });
  const AI_RECOVER_MS = Number(process.env.GRIDPULSE_AI_RECOVER_MS || 30000);
  setInterval(() => { ai.recover().catch(() => {}); }, AI_RECOVER_MS).unref();
} else {
  console.log(`[ai] Pulse AI local bootstrap disabled (provider=${chat.providerMode()}).`);
}

/* ------------------------------------------------------------------ */
/*  Demo protocol simulators — spawned so the Gateway page shows live  */
/*  OCPP / MODBUS / OpenADR / ISO 15118 / VOLTTRON traffic out of the  */
/*  box instead of waiting/standby/offline. Set DEMO_SIMS=0 to skip.   */
/* ------------------------------------------------------------------ */
function resolveScript(name) {
  const candidates = [
    path.join(__dirname, "..", "scripts", name),
    path.join(__dirname, "scripts", name),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

function spawnSim(scriptPath, args, env, label) {
  const bin = process.env.GRIDPULSE_SIM_BIN || process.execPath;
  const cwd = path.dirname(scriptPath);
  const child = spawn(bin, [scriptPath, ...args], { cwd, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  const tag = `[sim:${label}]`;
  child.stdout.on("data", (d) => process.stdout.write(`${tag} ${d}`));
  child.stderr.on("data", (d) => process.stderr.write(`${tag} ${d}`));
  child.on("exit", (code, sig) => {
    if (code === 0) return;
    console.log(`[sim:${label}] exited (code=${code} sig=${sig || "none"}) — protocol will show untilting until it restarts on next boot.`);
  });
  return child;
}

function startDemoSims(port) {
  if (process.env.DEMO_SIMS === "0") {
    console.log("DEMO_SIMS=0 — leaving protocol sources quiet (waiting/standby/offline).");
    return;
  }
  const base = `http://localhost:${port}`;
  const wsBase = `ws://localhost:${port}`;
  const wanted = (process.env.DEMO_SIMS || "ocpp,modbus,openadr,josev,volttron").split(",").map((s) => s.trim());

  if (wanted.includes("ocpp")) {
    const p = resolveScript("ocpp-sim.js");
    if (p) spawnSim(p, [wsBase], {}, "ocpp");
    else console.log("[sim:ocpp] script not found — skipped");
  }
  if (wanted.includes("modbus")) {
    const p = resolveScript("modbus-sim.js");
    if (p) spawnSim(p, ["5000", base], {}, "modbus");
    else console.log("[sim:modbus] script not found — skipped");
  }
  if (wanted.includes("openadr")) {
    const p = resolveScript("ven-node.js");
    if (p) spawnSim(p, [base, "GRIDPULSE-VEN-1"], {}, "openadr");
    else console.log("[sim:openadr] script not found — skipped");
  }
  if (wanted.includes("josev") || wanted.includes("volttron")) {
    const p = resolveScript("ingest-bridges.js");
    if (p) {
      const interval = Number(process.env.SIM_BRIDGE_INTERVAL_MS || 60000);
      const run = (n) => spawnSim(p, [base], {}, `ingest#${n}`);
      run(0);
      setInterval(() => run(new Date().getTime()), interval); // re-roll V2G/volttron events
    } else {
      console.log("[sim:bridges] script not found — skipped");
    }
  }
}