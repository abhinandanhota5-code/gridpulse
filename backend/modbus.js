/* ------------------------------------------------------------------ */
/*  GRIDPULSE MODBUS master — polls site energy meters / sensors from  */
/*  Open ModSim (or any MODBUS/TCP server) and streams them live.      */
/*  Stays offline & quiet if no server is reachable.                   */
/* ------------------------------------------------------------------ */

const ModbusRTU = require("modbus-serial");
const { live } = require("./live");

const REGISTER_MAP = [
  { addr: 0, key: "grid_load_kw", label: "Grid load", unit: "kW", scale: 1 },
  { addr: 1, key: "solar_kw", label: "Solar PV", unit: "kW", scale: 1 },
  { addr: 2, key: "battery_soc", label: "Battery SoC", unit: "%", scale: 1 },
  { addr: 3, key: "site_temp_c", label: "Site temperature", unit: "°C", scale: 1 },
  { addr: 4, key: "evse_load_kw", label: "EVSE draw", unit: "kW", scale: 1 },
  { addr: 5, key: "building_load_kw", label: "Building load", unit: "kW", scale: 1 },
  { addr: 6, key: "bus_voltage_v", label: "Bus voltage", unit: "V", scale: 0.1 },
  { addr: 7, key: "mains_kwh", label: "Mains energy", unit: "kWh", scale: 1 },
];

function config() {
  return {
    host: process.env.MODBUS_HOST || "127.0.0.1",
    port: Number(process.env.MODBUS_PORT || 1502),
    unit: Number(process.env.MODBUS_UNIT || 1),
    pollMs: Number(process.env.MODBUS_POLL_MS || 5000),
  };
}

function applyReadings(registers) {
  const rec = { connected: true, host: config().host, port: config().port, error: null, registers: {} };
  for (const def of REGISTER_MAP) {
    const raw = registers[def.addr];
    if (raw !== undefined && raw !== null) {
      rec.registers[def.addr] = { ...def, value: Math.round(raw * def.scale * 10) / 10 };
    }
  }
  const lastReadAt = Date.now();
  live.setModbus({ ...rec, lastReadAt });
  live.modbus.lastSimMs = lastReadAt;
  const g = rec.registers;
  live.pushModbusPoint({
    at: lastReadAt,
    grid: g[0]?.value ?? null, solar: g[1]?.value ?? null,
    battery: g[2]?.value ?? null, evse: g[4]?.value ?? null,
  });
}

async function pollOnce() {
  const { host, port, unit } = config();
  const client = new ModbusRTU();
  try {
    await client.connectTCP(host, { port });
    client.setUnitID(unit);
    client.setTimeout(2500);
    const count = Math.max(...REGISTER_MAP.map((r) => r.addr)) + 1;
    const res = await client.readInputRegisters(0, count);
    applyReadings(res.data);
  } catch (err) {
    const recentSim = live.modbus.lastSimMs && Date.now() - live.modbus.lastSimMs < 60000;
    live.setModbus({
      connected: recentSim,
      host, port,
      error: recentSim ? null : `${err.code || err.message || "unreachable"}`,
      registers: recentSim ? live.modbus.registers : {},
    });
  } finally {
    try { client.close(); } catch (_) { /* ignore */ }
  }
}

function registerModbus(app) {
  app.get("/api/modbus", (_req, res) => {
    res.json({
      host: config().host,
      port: config().port,
      connected: live.modbus.connected,
      error: live.modbus.error,
      lastReadAt: live.modbus.lastReadAt,
      registers: Object.values(live.modbus.registers),
      history: live.modbus.history.slice(-60),
    });
  });

  /* Manual register write — handy for demoing without Open ModSim. */
  app.post("/api/modbus/sim", (req, res) => {
    const { registers } = req.body || {};
    const byAddr = {};
    for (const def of REGISTER_MAP) {
      const v = Number(registers?.[def.key] ?? registers?.[def.addr]);
      if (!Number.isNaN(v)) byAddr[def.addr] = v;
    }
    if (Object.keys(byAddr).length) applyReadings(byAddr);
    res.json({ ok: true, applied: Object.keys(byAddr).map(Number) });
  });

  if (process.env.MODBUS_DISABLE !== "1" && process.env.MODBUS_ACTIVE !== "0" && process.env.DISABLE_MODBUS !== "1") {
    setTimeout(async function loop() {
      await pollOnce();
      setTimeout(loop, config().pollMs);
    }, 1500);
  }
}

module.exports = { registerModbus, REGISTER_MAP, applyReadings };