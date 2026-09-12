const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
const fs = require("fs");

const { live } = require("./live");
const { attach: attachOcpp } = require("./ocpp");
const { registerAnpr } = require("./anpr");
const { registerModbus } = require("./modbus");
const { registerOpenAdr } = require("./openadr");
const { buildDriverData, buildOwnerData } = require("./merge");
const fx = require("./fx");
const { fetchWeather } = require("./weather");
const chat = require("./chat");

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

/* ---- assistant chat (LLM-backed, with local fallback) ---- */
app.get("/api/chat/config", (_req, res) => {
  res.json({
    ai: chat.configured(),
    model: chat.effectiveModel(),
    prism: chat.prismEnabled(),
    prismHost: chat.prismHost(),
    note: chat.configured()
      ? "AI assistant connected via server config."
      : "No AI provider key set — chat runs in offline knowledge mode. Add a key in the assistant settings or set GRIDPULSE_AI_API_KEY."
  });
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
  });
});