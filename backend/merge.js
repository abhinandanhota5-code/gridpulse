/* ------------------------------------------------------------------ */
/*  Merge the live protocol feeds (OCPP / MODBUS / OpenADR / ANPR /    */
/*  V2G / VOLTTRON) into the static mock dashboard payloads so the     */
/*  driver and fleet-owner UIs show live activity when sources are up. */
/* ------------------------------------------------------------------ */

const { driverData, ownerData } = require("./data");
const { live } = require("./live");

function clone(x) {
  return JSON.parse(JSON.stringify(x));
}

function liveMeta(snap) {
  return {
    mode: "live",
    lastUpdated: snap.time,
    summary: snap.summary,
    sources: snap.sources,
    stations: snap.stations,
    anpr: snap.anpr,
  };
}

function fmtMoney(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

function buildDriverData() {
  const d = clone(driverData);
  const snap = live.snapshot();

  if (live.transactions.length > 0) {
    const liveTx = live.transactions.slice(0, 5).map((t) => ({
      id: `OCPP-${t.ocppTransactionId || t.id}`,
      date: new Date(t.endTime).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      location: `Live · ${t.station}`,
      kwh: t.kwh,
      duration: t.durationMin ? `${t.durationMin} min` : "…",
      amount: fmtMoney(t.cost),
      status: "paid",
      source: "live",
    }));
    d.fastagTransactions = [...liveTx, ...d.fastagTransactions];
  }

  if (snap.stations.length > 0) {
    const soC = snap.stations[0].connectors?.[0]?.soC;
    if (soC != null) d.currentSoc = Math.round(soC);
  }

  d.live = liveMeta(snap);
  return d;
}

function buildOwnerData() {
  const o = clone(ownerData);
  const snap = live.snapshot();
  const onlineStations = snap.stations.filter((s) => s.status === "online");

  if (onlineStations.length > 0) {
    const rows = onlineStations.map((st) => {
      const conns = st.connectors || [];
      const charging = conns.find((c) => c.status === "Charging" || c.status === "Occupied");
      const totalKw = conns.reduce((n, c) => n + (c.powerKw || 0), 0);
      const hasFault = conns.some((c) => c.status === "Faulted" || c.status === "Unavailable");
      const status = hasFault ? "critical" : charging ? "healthy" : "healthy";
      return {
        id: st.identity,
        location: `Live · ${st.identity}`,
        status,
        power: totalKw > 0 ? `${Math.round(totalKw)} kW active` : "Idle",
        lastService: `OCPP ${st.protocol} online`,
        source: "ocpp",
        live: true,
      };
    });
    o.fleetChargers = [...rows, ...o.fleetChargers.filter((c) => !c.live && !c.source)];

    o.activeSessions = [...snap.activeSessions, ...o.activeSessions.filter((s) => !s.source)];

    if (snap.faults.length > 0) {
      o.anomalies = [...snap.faults.slice(0, 4), ...o.anomalies];
    }

    if (snap.energyTodayKwh > 0) {
      o.ownerMetrics.energyToday = {
        value: `${snap.energyTodayKwh.toLocaleString("en-IN")} kWh`,
        sub: "Live OCPP meters",
        trend: "up",
      };
    }
    o.ownerMetrics.activeSessions = { value: String(o.activeSessions.length), sub: "Incl. live sessions" };
  }

  const dr = snap.drEvents.filter((e) => !e.cancelled && new Date(e.endAt) > Date.now());
  if (dr.length > 0) {
    const drRows = dr.slice(0, 3).map((e) => ({
      date: new Date(e.startAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
      detail: e.title,
      incentive: e.incentive || `${e.signalPercent}% signal`,
      source: "OpenADR",
    }));
    o.demandResponseEvents = [...drRows, ...o.demandResponseEvents.filter((e) => !e.source)];
  }

  o.live = liveMeta(snap);
  return o;
}

module.exports = { buildDriverData, buildOwnerData };