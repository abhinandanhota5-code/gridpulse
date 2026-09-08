#!/usr/bin/env node
/* ------------------------------------------------------------------ */
/*  GRIDPULSE demo — MODBUS meter simulator.                          */
/*  Two options:                                                        */
/*    1. Run Open ModSim (https://github.com/sanny32/OpenModSim), a    */
/*       standalone MODBUS/TCP slave on port 1502. The backend master   */
/*       polls it automatically every MODBUS_POLL_MS.                   */
/*    2. This script drives the built-in /api/modbus/sim endpoint,      */
/*       which emulates the same register map without a TCP slave.      */
/*                                                                      */
/*  Usage: node scripts/modbus-sim.js [intervalMs] [baseUrl]            */
/* ------------------------------------------------------------------ */
const BASE = process.argv[3] || process.env.API_URL || "http://localhost:4000";
const INTERVAL_MS = Number(process.argv[2] || 5000);

function registers() {
  const t = Date.now() * 0.0001;
  return {
    grid_load_kw: 120 + Math.sin(t / 60) * 60 + (Math.sin(t / 900) * 40) + 24,
    solar_kw: Math.max(0, 78 + Math.sin(t / 120 - 1.6) * 60),
    battery_soc: 55 + Math.sin(t / 140) * 10,
    site_temp_c: 30 + Math.random() * 4,
    evse_load_kw: 18 + Math.random() * 14,
    building_load_kw: 60 + Math.sin(t / 300) * 18,
    bus_voltage_v: 415 + Math.random() * 6,
    mains_kwh: 1240 + t / 2000,
  };
}

async function tick() {
  try {
    const res = await fetch(`${BASE}/api/modbus/sim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registers: registers() }),
    });
    if (res.ok) {
      const { applied } = await res.json();
      console.log(`[modbus] applied ${applied.length} registers`);
    } else {
      console.log(`[modbus] HTTP ${res.status} ${await res.text()}`);
    }
  } catch (err) {
    console.error("[modbus] error:", err.message);
  }
}

console.log(`MODBUS meter simulator -> ${BASE}/api/modbus/sim every ${INTERVAL_MS}ms`);
console.log("For real MODBUS/TCP, run Open ModSim on :1502 and set the backend MODBUS_HOST/MODBUS_PORT.");
tick();
setInterval(tick, INTERVAL_MS);