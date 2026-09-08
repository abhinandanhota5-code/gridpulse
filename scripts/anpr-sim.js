#!/usr/bin/env node
/* ------------------------------------------------------------------ */
/*  GRIDPULSE demo — ANPR camera simulator.                           */
/*  POSTs plate detections at the /api/v1/plate-events endpoint so     */
/*  the settings "Live plate feed" and energy-theft cross-check get    */
/*  fresh events.                                                      */
/*                                                                     */
/*  Usage: node scripts/anpr-sim.js [intervalMs] [baseUrl]             */
/* ------------------------------------------------------------------ */
const BASE = process.argv[3] || process.env.API_URL || "http://localhost:4000";
const INTERVAL_MS = Number(process.argv[2] || 2600);

const CAMERAS = ["cam-anna-nagar", "cam-vellore", "cam-katpadi", "cam-cmc"];
const PLATES = [
  { plate: "TN 09 AB 4471", vehicle: "Tata Nexon EV" },
  { plate: "TN 23 CJ 0092", vehicle: "MG ZS EV" },
  { plate: "KA 05 MX 1987", vehicle: "Hyundai Creta EV" },
  { plate: "TN 09 BF 7765", vehicle: "Tata Tiago EV" },
  { plate: "DL 8C AH 5512", vehicle: "BYD Atto 3" },
  { plate: "AP 07 CR 6621", vehicle: "Mahindra XUV400" },
];

async function tick() {
  const entry = PLATES[Math.floor(Math.random() * PLATES.length)];
  const body = {
    cameraId: CAMERAS[Math.floor(Math.random() * CAMERAS.length)],
    plate: entry.plate,
    vehicle: entry.vehicle,
    confidence: Number((0.86 + Math.random() * 0.13).toFixed(2)),
    takenAt: new Date().toISOString(),
  };
  try {
    const res = await fetch(`${BASE}/api/v1/plate-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 201) {
      console.log(`[anpr] ${body.plate} @ ${body.cameraId} (${body.confidence})`);
    } else {
      console.log(`[anpr] rejected: HTTP ${res.status} ${await res.text()}`);
    }
  } catch (err) {
    console.error("[anpr] error:", err.message);
  }
}

console.log(`ANPR simulator -> ${BASE}/api/v1/plate-events every ${INTERVAL_MS}ms`);
tick();
setInterval(tick, INTERVAL_MS);