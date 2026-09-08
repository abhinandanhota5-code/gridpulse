#!/usr/bin/env node
/* ------------------------------------------------------------------ */
/*  GRIDPULSE demo — OCPP 1.6 charge point simulator (multi-site).    */
/*  Spawns one charge point per site so each "nearby charger" carries  */
/*  its own live OCPP condition (status, power, SoC, temp).            */
/*                                                                     */
/*  Usage: node scripts/ocpp-sim.js [EGRESS]                           */
/*  EGRESS: ws base, default ws://localhost:4000                      */
/*  Env: SITES (comma list, default all), SLEEP_MS                    */
/* ------------------------------------------------------------------ */
const path = require("path");
const { OCPPClient } = require(path.join(__dirname, "..", "backend", "node_modules", "ocpp-ws-io"));

const BASE = process.argv[2] || "ws://localhost:4000";
const SLEEP_MS = Number(process.env.SLEEP_MS || 2500);

const SITES = [
  { id: "ANN-01", site: "Anna Nagar Hub", vendor: "Tata Power", model: "GX-60", mains: 0.3 },
  { id: "VTP-01", site: "Vellore Tech Park", vendor: "ABB", model: "Terra DC", mains: 0.2 },
  { id: "CMC-01", site: "CMC Charging Bay", vendor: "GRIDPULSE", model: "Bay-40", maintenance: true },
  { id: "KAT-01", site: "Katpadi Junction", vendor: "Delta", model: "DC Quick", mains: 0.18 },
].filter((s) => !process.env.SITES || process.env.SITES.split(",").includes(s.id));

const PLATES = ["TN 09 AB 4471", "TN 23 CJ 0092", "TN 09 BF 7765", "KA 05 MX 1987"];

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
const rnd = (a, b) => a + Math.random() * (b - a);

async function runStation(site) {
  const identity = site.id;
  const endpoint = `${BASE}/ocpp/${identity}`;
  const client = new OCPPClient({ endpoint, identity, protocols: ["ocpp1.6"] });
  await client.connect();
  console.log(`[${identity}] connected (${site.site})`);

  const boot = await client.call("ocpp1.6", "BootNotification", {
    chargePointVendor: site.vendor,
    chargePointModel: site.model,
    chargePointSerialNumber: `SN-${identity}`,
    firmwareVersion: "2.0.1",
  });
  console.log(`[${identity}] BootNotification -> ${boot.status}`);

  const heartbeat = setInterval(() => {
    client.call("ocpp1.6", "Heartbeat", {}).catch(() => {});
  }, 20000);
  heartbeat.unref?.();

  const statusNotif = async (status, errorCode = "NoError") => {
    await client.call("ocpp1.6", "StatusNotification", {
      connectorId: 1, status, errorCode, timestamp: new Date().toISOString(),
    }).catch(() => {});
  };

  if (site.maintenance) {
    await statusNotif("Unavailable", "HighTemperature");
    await sleep(rnd(6, 14) * 1000);
    await client.call("ocpp1.6", "StatusNotification", {
      connectorId: 1, status: "Unavailable", errorCode: "NoError", timestamp: new Date().toISOString(),
    }).catch(() => {});
  }

  while (true) {
    if (site.maintenance) {
      if (Math.random() < 0.12) {
        // briefly back online for realism
        await statusNotif("Available");
        await sleep(rnd(8, 16) * 1000);
      } else {
        await statusNotif("Unavailable");
      }
      await sleep(SLEEP_MS * 3);
      continue;
    }

    await statusNotif("Available");
    await sleep(SLEEP_MS * Math.round(rnd(2, 5)));
    if (Math.random() < 0.45) continue; // stay idle

    const idTag = PLATES[Math.floor(Math.random() * PLATES.length)];
    await statusNotif("Preparing");
    const start = await client.call("ocpp1.6", "StartTransaction", {
      connectorId: 1, idTag, meterStart: 0, timestamp: new Date().toISOString(),
    }).catch(() => ({ transactionId: 0 }));
    const txnId = start.transactionId || 1;
    await statusNotif("Charging");

    let soC = 34 + Math.floor(Math.random() * 20);
    const loops = 5 + Math.floor(Math.random() * 10);
    const powerBase = site.mains * 100;
    for (let i = 1; i <= loops; i++) {
      soC = Math.min(100, soC + Math.floor(Math.random() * 4 + 2));
      const powerKw = (powerBase * rnd(0.55, 1.05)).toFixed(1);
      await client.call("ocpp1.6", "MeterValues", {
        connectorId: 1,
        transactionId: txnId,
        meterValue: [{
          timestamp: new Date().toISOString(),
          sampledValue: [
            { measurand: "Energy.Active.Import.Register", value: String((i * 3.6).toFixed(1)) },
            { measurand: "Power.Active.Import", value: String(powerKw) },
            { measurand: "SoC", value: String(soC) },
            { measurand: "Temperature", value: String((29 + Math.random() * 8).toFixed(1)) },
          ],
        }],
      }).catch(() => {});
      console.log(`[${identity}] MeterValues #${i} (${powerKw} kW, SoC ${soC}%)`);
      await sleep(SLEEP_MS);
    }

    await statusNotif("Finishing");
    await client.call("ocpp1.6", "StopTransaction", {
      transactionId: txnId, meterStop: loops * 3.6, timestamp: new Date().toISOString(),
      reason: "Local", idTag,
    }).catch(() => {});
    console.log(`[${identity}] StopTransaction (${(loops * 3.6).toFixed(1)} kWh)`);
    await sleep(SLEEP_MS * Math.round(rnd(2, 5)));
  }
}

if (!SITES.length) {
  console.error("No sites matched SITES env: " + process.env.SITES);
  process.exit(1);
}

for (const site of SITES) {
  runStation(site).catch((err) => {
    console.error(`[${site.id}] FAILED:`, err.message);
    setTimeout(() => process.exit(1), 30000);
  });
}

process.on("SIGINT", () => { console.log("\nshutting down sim charge points"); process.exit(0); });