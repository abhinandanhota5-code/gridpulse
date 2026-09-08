/* ------------------------------------------------------------------ */
/*  GRIDPULSE OCPP CSMS — a real OCPP 1.6 / 2.0.1 Central System.      */
/*  Attaches to the same HTTP server as the Express API so chargers    */
/*  connect over ws(s)://<host>/ocpp/{stationId}.                       */
/* ------------------------------------------------------------------ */

const { OCPPServer } = require("ocpp-ws-io");
const { live } = require("./live");

let ocppServer = null;

function nowIso() {
  return new Date().toISOString();
}

function connectorIdOf(params, fallback) {
  return String(params.connectorId ?? params.evse?.connectorId ?? fallback ?? "1");
}

function firstKwh(meterValue) {
  for (const entry of meterValue || []) {
    for (const sv of entry.sampledValue || []) {
      if (sv.measurand === "Energy.Active.Import.Register") {
        const v = parseFloat(sv.value);
        if (!Number.isNaN(v)) return v;
      }
    }
  }
  return null;
}

function registerStationHandlers(client) {
  const identity = client.identity;
  const station = {
    identity,
    protocol: client.protocol,
    vendor: "", model: "", serial: "", firmware: "",
    status: "online",
    connectedAt: nowIso(),
    lastSeen: nowIso(),
    connectors: {},
    connectorSession: {},
    meterHistory: [],
  };
  const seen = live.stations.get(identity);
  if (seen) {
    station.vendor = seen.vendor;
    station.model = seen.model;
    station.serial = seen.serial;
    station.firmware = seen.firmware;
  }
  live.upsertStation(station);

  /* ---- version-aware handlers ---- */

  client.handle("ocpp1.6", "BootNotification", ({ params }) => {
    station.vendor = params.chargePointVendor || station.vendor;
    station.model = params.chargePointModel || station.model;
    station.serial = params.chargePointSerialNumber || params.chargeBoxSerialNumber || station.serial;
    station.firmware = params.firmwareVersion || station.firmware;
    station.lastSeen = nowIso();
    live.upsertStation(station);
    return { status: "Accepted", currentTime: nowIso(), interval: 300 };
  });

  client.handle("ocpp2.0.1", "BootNotification", ({ params }) => {
    station.vendor = params.chargingStation?.vendorName || station.vendor;
    station.model = params.chargingStation?.model || station.model;
    station.serial = params.chargingStation?.serialNumber || station.serial;
    station.firmware = params.chargingStation?.firmwareVersion || station.firmware;
    station.lastSeen = nowIso();
    live.upsertStation(station);
    return { status: "Accepted", currentTime: nowIso(), interval: 300 };
  });

  client.handle("Heartbeat", ({ params }) => {
    station.lastSeen = nowIso();
    return { currentTime: nowIso() };
  });

  /* Prefer a version-aware StatusNotification, fall back to generic. */
  client.handle("ocpp1.6", "StatusNotification", ({ params }) => {
    const id = connectorIdOf(params, 1);
    const fault = params.errorCode && params.errorCode !== "NoError"
      ? { detail: params.info || "Connector error reported", errorCode: params.errorCode }
      : null;
    live.noteConnector(station, id, { status: params.status }, fault);
    station.lastSeen = nowIso();
    return {};
  });

  client.handle("ocpp2.0.1", "StatusNotification", ({ params }) => {
    const id = connectorIdOf(params, params.evseId || 1);
    const fault = params.status === "Faulted"
      ? { detail: "Connector faulted", errorCode: "Faulted" }
      : null;
    live.noteConnector(station, id, { status: params.connectorStatus || params.status }, fault);
    station.lastSeen = nowIso();
    return {};
  });

  client.handle("ocpp1.6", "Authorize", ({ params }) => (
    { idTagInfo: { status: "Accepted" } }
  ));

  client.handle("ocpp2.0.1", "Authorize", ({ params }) => (
    { idTokenInfo: { status: "Accepted" } }
  ));

  client.handle("ocpp1.6", "StartTransaction", ({ params }) => {
    const id = connectorIdOf(params, 1);
    const txnId = `S-${Date.now().toString().slice(-6)}`;
    live.beginSession(station, id, {
      id: txnId,
      idTag: params.idTag || null,
      meterStart: params.meterStart,
      startTime: params.timestamp || nowIso(),
    });
    station.lastSeen = nowIso();
    return { transactionId: txnId, idTagInfo: { status: "Accepted" } };
  });

  client.handle("ocpp1.6", "StopTransaction", ({ params }) => {
    const id = connectorIdOf(params, 1);
    live.endSession(station, id, params.transactionId, params.meterStop, params.reason || "Local");
    station.lastSeen = nowIso();
    return { idTagInfo: { status: "Accepted" } };
  });

  client.handle("ocpp1.6", "MeterValues", ({ params }) => {
    live.applyMeterValues(station, connectorIdOf(params, 1), params.meterValue || []);
    station.lastSeen = nowIso();
    return {};
  });

  client.handle("ocpp2.0.1", "MeterValues", ({ params }) => {
    live.applyMeterValues(station, connectorIdOf(params, params.evseId || 1), params.meterValue || []);
    station.lastSeen = nowIso();
    return {};
  });

  client.handle("ocpp2.0.1", "TransactionEvent", ({ params }) => {
    const id = connectorIdOf(params, params.evseId || 1);
    const txnId = params.transactionInfo?.transactionId;
    const type = params.eventType;
    if (type === "Started") {
      live.beginSession(station, id, {
        id: String(txnId != null ? txnId : `S-${Date.now().toString().slice(-6)}`),
        idTag: params.idToken?.idToken || null,
        meterStart: firstKwh(params.meterValue),
        startTime: params.timestamp || nowIso(),
      });
    } else if (type === "Updated") {
      live.applyMeterValues(station, id, params.meterValue || []);
    } else if (type === "Ended") {
      live.endSession(station, id, txnId, firstKwh(params.meterValue), params.reason || "Local");
    }
    station.lastSeen = nowIso();
    return {};
  });

  client.handle("DataTransfer", () => ({ status: "Accepted", data: "pong" }));

  client.on("close", () => {
    live.stationOffline(identity);
  });
}

function attach(httpServer) {
  ocppServer = new OCPPServer({
    protocols: ["ocpp1.6", "ocpp2.0.1"],
    logging: { enabled: false },
  });

  ocppServer.on("client", (client) => {
    registerStationHandlers(client);
  });

  return ocppServer.listen(0, undefined, { server: httpServer }).then(() => {
    console.log("OCPP CSMS attached · ws://<host>/ocpp/{stationId} (OCPP 1.6 + 2.0.1)");
    return ocppServer;
  });
}

module.exports = { attach };