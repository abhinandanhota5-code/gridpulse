#!/usr/bin/env node
/* ------------------------------------------------------------------ */
/*  GRIDPULSE demo — edge-agent ingest bridges (Josev V2G + VOLTTRON). */
/*  Pushes the lite payloads a real ISO 15118 / VOLTTRON bridge would   */
/*  forward to the protocol gateway. See backend/server.js for the      */
/*  /api/ingest/{josev,volttron} contract.                              */
/*                                                                      */
/*  Usage: node scripts/ingest-bridges.js [baseUrl]                     */
/* ------------------------------------------------------------------ */
const BASE = (process.argv[2] || process.env.API_URL || "http://localhost:4000").replace(/\/$/, "");

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  const v2gEvents = [
    { event: "SessionMatched", station: "Josev-V2G-01", connectorId: 1, energyKwh: 0.4, powerKw: 21.4, details: "ISO 15118 PnC token matched on plug-in" },
    { event: "ChargingStarted", station: "Josev-V2G-01", connectorId: 1, energyKwh: 0.9, powerKw: 22.0, details: "V2G session negotiated at 22 kW" },
    { event: "ChargingComplete", station: "Josev-V2G-01", connectorId: 1, energyKwh: 18.6, powerKw: 6.2, details: "Target SoC 85% reached, cable lock released" },
    { event: "CableCheckFailed", station: "Josev-V2G-02", connectorId: 2, energyKwh: 0, powerKw: 0, details: "EVSE CommCtrl timeout — cable check retried" },
    { event: "TLSHandshake", station: "Josev-V2G-03", connectorId: 3, energyKwh: 0, powerKw: 0, details: "TLS 1.3 handshake with cert chain ok" },
  ];
  for (const ev of v2gEvents) {
    const res = await fetch(`${BASE}/api/ingest/josev`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ev),
    });
    console.log(`[josev] ${res.ok ? "ok" : `HTTP ${res.status}`} -> ${ev.event} @ ${ev.station}`);
    await sleep(1800);
  }

  const volttron = [
    { site: "site-1", metrics: { pv_kw: 61.2, temp_c: 31.4, grid_kw: 188, evse_load_kw: 24.6 } },
    { site: "site-2", metrics: { pv_kw: 44.8, temp_c: 30.1, grid_kw: 152, evse_load_kw: 18.2 } },
    { site: "site-3", metrics: { pv_kw: 52.3, temp_c: 29.7, grid_kw: 171, evse_load_kw: 21.0 } },
  ];
  for (const v of volttron) {
    const res = await fetch(`${BASE}/api/ingest/volttron`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
    });
    console.log(`[volttron] ${res.ok ? "ok" : `HTTP ${res.status}`} -> ${v.site} ${Object.keys(v.metrics).length} metrics`);
    await sleep(1800);
  }
}

main().catch((err) => { console.error(err.message); process.exit(1); });