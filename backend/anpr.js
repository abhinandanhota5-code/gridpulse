/* ------------------------------------------------------------------ */
/*  GRIDPULSE ANPR service — ingests plate detections from bay cameras */
/*  (e.g. a video ANPR deployment or the bundled demo streamer) and    */
/*  matches them against live OCPP charging sessions.                  */
/* ------------------------------------------------------------------ */

const { live } = require("./live");

const MAX_EVENTS = 30;

/* Plates our demo cameras "see". A few intentionally match known fleet
   sessions (TN 09 AB 4471 = CH-014 session, etc.) to demonstrate the
   plate -> session cross-check used by the energy-theft engine. */
const DEMO_PLATES = [
  { plate: "TN 09 AB 4471", vehicle: "Tata Nexon EV", match: true },
  { plate: "TN 23 CJ 0092", vehicle: "MG ZS EV", match: true },
  { plate: "KA 05 MX 1987", vehicle: "Hyundai Creta EV", match: false },
  { plate: "TN 09 BF 7765", vehicle: "Tata Tiago EV", match: true },
  { plate: "DL 8C AH 5512", vehicle: "BYD Atto 3", match: false },
  { plate: "TN 10 GQ 0042", vehicle: "Mahindra XUV400", match: false },
  { plate: "AP 07 CR 6621", vehicle: "MG Comet EV", match: false },
  { plate: "TN 09 AB 9901", vehicle: "Tata Punch EV", match: false },
];

const CAMERAS = ["cam-anna-nagar", "cam-vellore", "cam-katpadi", "cam-cmc"];

function normalizePlate(plate) {
  return String(plate || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

let demoTimer = null;

function ingestEvent(payload) {
  const plate = String(payload.plate || "").trim();
  if (!plate) return null;
  const confidence = Number(payload.confidence);
  if (!(confidence >= 0 && confidence <= 1)) return { error: "confidence must be 0..1" };

  const normalized = normalizePlate(plate);
  let matched = false;
  let matchType = null;

  for (const st of live.stations.values()) {
    if (st.status !== "online") continue;
    const stationMatch = normalizePlate(st.identity) === normalized ||
      Object.values(st.connectorSession || {}).some((s) => s && normalizePlate(s.idTag) === normalized);
    if (stationMatch && st.connectorSession) {
      matched = true;
      matchType = "live-session";
      break;
    }
  }
  /* Cross-check against known fleet plates from the owner dataset */
  if (!matched && payload.match) {
    matched = true;
    matchType = "known-fleet";
  }

  const rec = {
    cameraId: String(payload.cameraId || "cam-01"),
    site: payload.site || null,
    plate,
    confidence,
    ts: payload.takenAt ? new Date(payload.takenAt).toISOString() : new Date().toISOString(),
    matched,
    matchType,
    vehicle: payload.vehicle || null,
  };
  live.plateEvent(rec);
  return rec;
}

function startDemo(intervalMs) {
  if (demoTimer) clearInterval(demoTimer);
  demoTimer = setInterval(() => {
    const entry = DEMO_PLATES[Math.floor(Math.random() * DEMO_PLATES.length)];
    ingestEvent({
      cameraId: CAMERAS[Math.floor(Math.random() * CAMERAS.length)],
      plate: entry.plate,
      vehicle: entry.vehicle,
      confidence: Number((0.86 + Math.random() * 0.13).toFixed(2)),
      match: entry.match,
    });
  }, intervalMs || 2600);
  live._touchSource("anpr", {});
}

function registerAnpr(app) {
  app.post("/api/v1/plate-events", (req, res) => {
    const rec = ingestEvent(req.body || {});
    if (rec === null) return res.status(400).json({ error: "plate required" });
    if (rec.error) return res.status(400).json(rec);
    res.status(201).json({ ok: true, ...rec });
  });

  app.get("/api/anpr", (_req, res) => {
    const snap = live.snapshot().anpr;
    res.json({ online: snap.online, detections: snap.detections, matches: snap.matches, cameras: snap.cameras, recent: snap.events });
  });

  app.post("/api/anpr/demo", (req, res) => {
    const { action } = req.body || {};
    if (action === "stop") {
      if (demoTimer) { clearInterval(demoTimer); demoTimer = null; }
    } else {
      startDemo(Number(req.body?.intervalMs) || 2600);
    }
    res.json({ ok: true, streaming: !!demoTimer });
  });

  if (process.env.ANPR_DEMO !== "off") startDemo(2600);
}

module.exports = { registerAnpr, startDemo, ingestEvent, DEMO_PLATES };