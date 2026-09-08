/* ------------------------------------------------------------------ */
/*  GRIDPULSE live store — a single in-memory hub that every protocol  */
/*  source (OCPP, MODBUS, OpenADR, Josev/V2G, VOLTTRON) writes into,   */
/*  renders a unified snapshot, and fans it out to SSE subscribers.    */
/* ------------------------------------------------------------------ */

const { EventEmitter } = require("events");

const fx = require("./fx");

const RATE_PER_KWH = 0.16; // $/kWh used to estimate live session cost
const MAX_METER_POINTS = 60;

/* Charge-point identity → physical site, so frontends can join live
   OCPP telemetry to the "nearby charger" roster. */
const SITE_BY_IDENTITY = {
  "ANN-01": "Anna Nagar Hub",
  "VTP-01": "Vellore Tech Park",
  "CMC-01": "CMC Charging Bay",
  "KAT-01": "Katpadi Junction",
};

const SOURCE_META = {
  ocpp:     { name: "OCPP 1.6 / 2.0.1", project: "ocpp-ws-io", protocol: "WebSocket CSMS · boot / txn / meter values" },
  modbus:   { name: "MODBUS/TCP", project: "OpenModSim", protocol: "Master polls slave registers on :1502" },
  openadr:  { name: "OpenADR 2.0b", project: "GRIDPULSE VTN", protocol: "EiRegisterParty · EiEvent · EiOpt" },
  josev:    { name: "ISO 15118 · Plug & Charge", project: "Josev (EcoG)", protocol: "V2G charger bridge ingest" },
  volttron: { name: "Edge gateways", project: "Eclipse VOLTTRON", protocol: "Site metrics ingest" },
  anpr:     { name: "ANPR cameras", project: "Plate-events API", protocol: "REST ingest · plate↔session match" },
};

class LiveHub extends EventEmitter {
  constructor() {
    super();
    this.sources = {};
    this.stations = new Map();       // identity -> station record
    this.modbus = {
      connected: false, host: null, port: null,
      registers: {}, history: [], lastReadAt: null, error: null,
    };
    this.drEvents = [];              // OpenADR demand-response events
    this.v2g = [];                   // Josev / ISO 15118 bridge records
    this.volttron = { sites: {} };   // siteId -> { site, latest, history }
    this.transactions = [];          // completed OCPP transactions (driver feed)
    this.faults = [];                // live connector faults (owner feed)
    this.activeSessions = [];        // live charging sessions (owner feed)
    this.activeChargers = 0;
    this.energyTodayKwh = 0;
    this._sse = new Set();
    this._debounce = null;

    for (const key of Object.keys(SOURCE_META)) {
      this.sources[key] = {
        key, ...SOURCE_META[key],
        status: "standby", detail: "Waiting for connection", count: 0, updatedAt: null,
      };
    }
    this.anpr = { online: false, cameras: new Map(), events: [], detections: 0, matches: 0 };
  }

  _touchSource(key, patch) {
    const src = this.sources[key];
    if (!src) return;
    Object.assign(src, patch || {}, { updatedAt: new Date().toISOString() });
    this.changed();
  }

  /* ---- generic changed() with debounce -> broadcast snapshot ---- */
  changed() {
    if (this._debounce) return;
    this._debounce = setTimeout(() => {
      this._debounce = null;
      const snap = this.snapshot();
      for (const res of this._sse) {
        try { res.write(`data: ${JSON.stringify(snap)}\n\n`); } catch (_) {}
      }
    }, 250);
  }

  /* ---- SSE subscription ---- */
  addStream(res) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.write(`data: ${JSON.stringify(this.snapshot())}\n\n`);
    this._sse.add(res);
    const ping = setInterval(() => {
      try { res.write(": ping\n\n"); } catch (_) {}
    }, 15000);
    res.on("close", () => {
      clearInterval(ping);
      this._sse.delete(res);
    });
  }

  /* ---- OCPP stations ---- */
  upsertStation(station) {
    const prev = this.stations.get(station.identity);
    this.stations.set(station.identity, station);
    this.refreshStationTotals();
    if (prev && prev.status !== station.status) this._touchSource("ocpp", {});
  }

  stationOffline(identity) {
    const st = this.stations.get(identity);
    if (st) {
      st.status = "offline";
      st.lastSeen = new Date().toISOString();
      this.refreshStationTotals();
      this.changed();
    }
  }

  refreshStationTotals() {
    let active = 0;
    let energy = 0;
    for (const st of this.stations.values()) {
      if (st.status !== "online") continue;
      for (const [id, conn] of Object.entries(st.connectors || {})) {
        if (conn.status === "Charging" || conn.status === "Occupied") active += 1;
        energy += conn.meterKwh || 0;
      }
    }
    this.activeChargers = active;
    this.energyTodayKwh = Number(energy.toFixed(1));
    const online = [...this.stations.values()].filter((s) => s.status === "online").length;
    this._touchSource("ocpp", {
      status: online > 0 ? "connected" : "waiting",
      count: online,
      detail: online > 0 ? `${online} charge point(s) online` : "No charge points connected",
    });
  }

  noteConnector(station, connectorId, patch, faultMeta) {
    const id = String(connectorId);
    const conn = station.connectors[id] || {
      status: "Available", powerKw: 0, meterKwh: 0, soC: null, tempC: null, updatedAt: null,
    };
    station.connectors[id] = { ...conn, ...patch, updatedAt: new Date().toISOString() };
    if (faultMeta && (patch.status === "Faulted" || patch.status === "Unavailable")) {
      this.faults.unshift({
        id: `FLT-${Date.now()}`,
        charger: `${station.identity} · connector ${id}`,
        site: `Live · ${station.identity}`,
        severity: patch.status === "Faulted" ? "high" : "medium",
        detail: faultMeta.errorCode ? `${faultMeta.detail} (${faultMeta.errorCode})` : faultMeta.detail,
        time: "Just now",
        source: "ocpp",
      });
      if (this.faults.length > 8) this.faults.pop();
    }
    this.changed();
  }

  beginSession(station, connectorId, record) {
    const id = String(connectorId);
    const conn = station.connectors[id] || { status: "Available", powerKw: 0, meterKwh: 0, soC: null, tempC: null, updatedAt: new Date().toISOString() };
    conn.status = "Charging";
    station.connectors[id] = conn;
    station.connectorSession[id] = record;
    this.activeSessions.unshift({
      id: record.id,
      vehicle: "Live EV session",
      plate: record.idTag || station.identity,
      plateConf: "high",
      charger: `${station.identity} · connector ${id}`,
      soc: conn.soC ? `${Math.round(conn.soC)}%` : "…",
      power: `${conn.powerKw.toFixed(1)} kW`,
      cost: "$…",
      source: "ocpp",
    });
    if (this.activeSessions.length > 12) this.activeSessions.pop();
    this.changed();
  }

  endSession(station, connectorId, transactionId, meterStop, reason) {
    const id = String(connectorId);
    const rec = station.connectorSession[id];
    const conn = station.connectors[id] || {};
    if (rec) {
      const kwh = Math.max(0, (meterStop || conn.meterKwh || 0) - (rec.meterStart || 0));
      const cost = kwh * RATE_PER_KWH;
      const durationMin = rec.startTime
        ? Math.max(1, Math.round((Date.now() - new Date(rec.startTime).getTime()) / 60000))
        : null;
      this.transactions.unshift({
        id: rec.id,
        ocppTransactionId: transactionId,
        station: station.identity,
        connectorId: id,
        kwh: Number(kwh.toFixed(2)),
        cost: Number(cost.toFixed(2)),
        durationMin,
        idTag: rec.idTag || null,
        startTime: rec.startTime,
        endTime: new Date().toISOString(),
        reason,
      });
      if (this.transactions.length > 20) this.transactions.pop();
    }
    delete station.connectorSession[id];
    if (conn) {
      conn.status = reason === "DeAuthorized" || reason === "Remote" ? "Available" : "Available";
    }
    if (conn && conn.powerKw) conn.powerKw = 0;
    this.activeSessions = this.activeSessions.filter((s) => s.id !== rec?.id);
    this.changed();
  }

  applyMeterValues(station, connectorId, meterValue) {
    const id = String(connectorId);
    const conn = station.connectors[id] || {
      status: station.connectorSession?.[id] ? "Charging" : "Available",
      powerKw: 0, meterKwh: 0, soC: null, tempC: null, updatedAt: null,
    };
    let touched = false;
    for (const entry of meterValue || []) {
      const ts = entry.timestamp;
      for (const sv of entry.sampledValue || []) {
        const v = parseFloat(sv.value);
        if (Number.isNaN(v)) continue;
        const m = sv.measurand || "";
        if (m === "Energy.Active.Import.Register") { conn.meterKwh = v; touched = true; }
        else if (m === "Power.Active.Import" || m === "Power.Active") { conn.powerKw = v; touched = true; }
        else if (m === "SoC" || m === "State.of.Charge" || m === "State.Of.Charge") { conn.soC = v; touched = true; }
        else if (m === "Temperature") { conn.tempC = v; touched = true; }
      }
      if (touched) conn.updatedAt = ts || new Date().toISOString();
    }
    if (touched && station.meterHistory.length < MAX_METER_POINTS) {
      station.meterHistory.push({ t: Date.now(), powerKw: conn.powerKw, soC: conn.soC, kwh: conn.meterKwh });
    }
    station.connectors[id] = conn;
    const sess = this.activeSessions.find((s) => s.id === station.connectorSession?.[id]?.id);
    if (sess) {
      if (conn.powerKw) sess.power = `${conn.powerKw.toFixed(1)} kW`;
      if (conn.soC != null) sess.soc = `${Math.round(conn.soC)}%`;
    }
    this.refreshStationTotals();
  }

  completeTransaction(name, record) {
    this.transactions.unshift({ id: `OCPP-${Date.now()}`, ...record, source: "ocpp", timestamp: new Date().toISOString() });
    if (this.transactions.length > 20) this.transactions.pop();
    this.changed();
  }

  /* ---- MODBUS ---- */
  setModbus(rec) {
    Object.assign(this.modbus, rec, { lastReadAt: Date.now() });
    this._touchSource("modbus", {
      status: rec.connected ? "connected" : "offline",
      count: rec.connected ? 1 : 0,
      detail: rec.connected
        ? `${rec.host}:${rec.port} · ${Object.keys(rec.registers).length} registers`
        : rec.error || "OpenModSim not reachable",
    });
  }

  pushModbusPoint(pt) {
    this.modbus.history.push(pt);
    if (this.modbus.history.length > 240) this.modbus.history.shift();
    this.changed();
  }

  /* ---- OpenADR demand response ---- */
  setDREvent(ev) {
    const i = this.drEvents.findIndex((e) => e.id === ev.id);
    if (i >= 0) this.drEvents[i] = ev; else this.drEvents.unshift(ev);
    this.drEvents.sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
    if (this.drEvents.length > 12) this.drEvents.pop();
    this._touchSource("openadr", {
      status: "active",
      count: this.drEvents.filter((e) => e.status !== "cancelled").length,
      detail: `${this._drPending()} active/scheduled · ${this._drOpts()} opt registrations`,
    });
  }

  optDREvent(eventId, optType) {
    const ev = this.drEvents.find((e) => e.id === eventId);
    if (ev) {
      ev.opts = ev.opts || { optIn: 0, optOut: 0 };
      if (optType === "optIn") ev.opts.optIn += 1; else ev.opts.optOut += 1;
      this.changed();
    }
  }

  _drPending() { return this.drEvents.filter((e) => !e.cancelled && new Date(e.endAt) > Date.now()).length; }
  _drOpts() { return this.drEvents.reduce((n, e) => n + ((e.opts?.optIn || 0) + (e.opts?.optOut || 0)), 0); }

  /* ---- Josev / ISO 15118 V2G bridge ---- */
  addV2G(record) {
    this.v2g.unshift({ ...record, at: new Date().toISOString() });
    if (this.v2g.length > 20) this.v2g.pop();
    this._touchSource("josev", {
      status: record.status || "connected",
      count: this.v2g.length,
      detail: this.v2g[0] ? `Last: ${this.v2g[0].event}` : "No V2G activity yet",
    });
  }

  /* ---- VOLTTRON edge gateway ---- */
  addVolttronMetric(site, metrics) {
    const key = site || "site-1";
    const rec = this.volttron.sites[key] || { site: key, latest: {}, history: [] };
    rec.latest = { ...metrics, at: new Date().toISOString() };
    rec.history.push({ at: Date.now(), ...metrics });
    if (rec.history.length > 240) rec.history.shift();
    this.volttron.sites[key] = rec;
    const sites = Object.keys(this.volttron.sites).length;
    this._touchSource("volttron", {
      status: "connected",
      count: sites,
      detail: `${sites} site gateway(s) streaming`,
    });
  }

  /* ---- ANPR plate detections ---- */
  plateEvent(rec) {
    this.anpr.online = true;
    const cam = this.anpr.cameras.get(rec.cameraId) || {
      cameraId: rec.cameraId, detections: 0, lastAt: null, site: rec.site || "Bay camera",
    };
    cam.detections += 1;
    cam.lastAt = rec.ts || new Date().toISOString();
    this.anpr.cameras.set(rec.cameraId, cam);
    this.anpr.events.unshift({
      id: `ANT-${Date.now().toString().slice(-6)}`,
      cameraId: rec.cameraId, plate: rec.plate, confidence: rec.confidence,
      ts: rec.ts || new Date().toISOString(), matched: !!rec.matched, matchType: rec.matchType || null,
    });
    if (this.anpr.events.length > 30) this.anpr.events.pop();
    this.anpr.detections += 1;
    if (rec.matched) this.anpr.matches += 1;
    const n = this.anpr.cameras.size;
    this._touchSource("anpr", {
      status: "connected",
      count: n,
      detail: `${n} camera(s) · ${this.anpr.detections} detections · ${this.anpr.matches} session matches`,
    });
  }

  /* ---- unified snapshot ---- */
  snapshot() {
    const d = (v) => (v == null ? null : Math.round(v * 10) / 10);
    return {
      mode: "live",
      time: new Date().toISOString(),
      fx: { usdToInr: fx.fromUsdToInr() },
      sources: this.sources,
      summary: {
        stationsOnline: [...this.stations.values()].filter((s) => s.status === "online").length,
        activeChargers: this.activeChargers,
        energyTodayKwh: this.energyTodayKwh,
        activeDrEvents: this.drEvents.filter((e) => !e.cancelled).length,
        v2gEvents: this.v2g.length,
        volttronSites: Object.keys(this.volttron.sites).length,
        modbusConnected: this.modbus.connected,
      },
      stations: [...this.stations.values()].map((s) => ({
        identity: s.identity, protocol: s.protocol, vendor: s.vendor, model: s.model,
        serial: s.serial, firmware: s.firmware, status: s.status, lastSeen: s.lastSeen,
        site: SITE_BY_IDENTITY[s.identity] || null,
        connectors: Object.entries(s.connectors || {}).map(([id, c]) => ({
          connectorId: id, status: c.status, powerKw: d(c.powerKw), soC: d(c.soC),
          tempC: d(c.tempC), meterKwh: d(c.meterKwh),
        })),
        meterHistory: s.meterHistory.map((h) => ({ t: h.t, powerKw: d(h.powerKw), soC: d(h.soC) })),
      })),
      modbus: {
        connected: this.modbus.connected,
        host: this.modbus.host, port: this.modbus.port,
        error: this.modbus.error, lastReadAt: this.modbus.lastReadAt,
        registers: Object.values(this.modbus.registers),
        history: this.modbus.history.slice(-120),
      },
      drEvents: this.drEvents,
      v2g: this.v2g.slice(0, 8),
      volttron: Object.values(this.volttron.sites).map((s) => ({
        site: s.site, latest: s.latest, history: s.history.slice(-60),
      })),
      anpr: {
        online: this.anpr.online,
        sourcesSummary: this.sources.anpr,
        detections: this.anpr.detections,
        matches: this.anpr.matches,
        cameras: [...this.anpr.cameras.values()],
        events: this.anpr.events.slice(0, 10),
      },
      transactions: this.transactions.slice(0, 10),
      activeSessions: this.activeSessions.slice(0, 12),
      faults: this.faults.slice(0, 8),
    };
  }
}

module.exports = { live: new LiveHub(), RATE_PER_KWH, SITE_BY_IDENTITY };