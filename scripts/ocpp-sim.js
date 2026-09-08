#!/usr/bin/env node
/* ------------------------------------------------------------------ */
/*  GRIDPULSE demo — OCPP 1.6 charge point simulator.                 */
/*  Speaks real OCPP over WebSocket to the GRIDPULSE CSMS endpoint.    */
/*                                                                     */
/*  Usage: node scripts/ocpp-sim.js [stationId] [endpoint]             */
/*  Defaults: GRID-SIM-01, ws://localhost:4000/ocpp                    */
/* ------------------------------------------------------------------ */
const path = require("path");
const { OCPPClient } = require(path.join(__dirname, "..", "backend", "node_modules", "ocpp-ws-io"));

const stationId = process.argv[2] || "GRID-SIM-01";
const endpoint = process.argv[3] || `ws://localhost:4000/ocpp/${stationId}`;
const SLEEP_MS = Number(process.env.SLEEP_MS || 2500);
const LOOPS = Number(process.env.LOOPS || 8);

const PLATES = ["TN 09 AB 4471", "TN 23 CJ 0092", "TN 09 BF 7765", "KA 05 MX 1987"];

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  const client = new OCPPClient({ endpoint, identity: stationId, protocols: ["ocpp1.6"] });
  await client.connect();
  console.log(`[${stationId}] connected to ${endpoint}`);

  const boot = await client.call("ocpp1.6", "BootNotification", {
    chargePointVendor: "GRIDPULSE SimCharger",
    chargePointModel: "GX-42",
    chargePointSerialNumber: `SN-${stationId}`,
    firmwareVersion: "1.2.0",
  });
  console.log(`[${stationId}] BootNotification -> ${boot.status}`);

  const idTag = PLATES[Math.floor(Math.random() * PLATES.length)];
  const start = await client.call("ocpp1.6", "StartTransaction", {
    connectorId: 1, idTag, meterStart: 0, timestamp: new Date().toISOString(),
  });
  const txnId = start.transactionId;
  console.log(`[${stationId}] StartTransaction (${idTag}) -> ${txnId} ${start.idTagInfo.status}`);

  let soC = 42;
  for (let i = 1; i <= LOOPS; i++) {
    soC = Math.min(100, soC + Math.floor(Math.random() * 4 + 2));
    await client.call("ocpp1.6", "MeterValues", {
      connectorId: 1,
      transactionId: txnId,
      meterValue: [{
        timestamp: new Date().toISOString(),
        sampledValue: [
          { measurand: "Energy.Active.Import.Register", value: String((i * 4.2).toFixed(1)) },
          { measurand: "Power.Active.Import", value: String((15 + (i % 8)).toFixed(1)) },
          { measurand: "SoC", value: String(soC) },
          { measurand: "Temperature", value: String((30 + Math.random() * 6).toFixed(1)) },
        ],
      }],
    });
    await client.call("ocpp1.6", "StatusNotification", {
      connectorId: 1, status: "Charging", errorCode: "NoError", timestamp: new Date().toISOString(),
    });
    console.log(`[${stationId}] MeterValues #${i} (SoC ${soC}%)`);
    await sleep(SLEEP_MS);
  }

  await client.call("ocpp1.6", "StopTransaction", {
    transactionId: txnId, meterStop: LOOPS * 4.2, timestamp: new Date().toISOString(),
    reason: "Local", idTag,
  });
  console.log(`[${stationId}] StopTransaction (${(LOOPS * 4.2).toFixed(1)} kWh)`);
  await client.close({ force: true });
  process.exit(0);
}

main().catch((err) => { console.error(`[${stationId}] FAILED:`, err.message); process.exit(1); });