#!/usr/bin/env node
/* ------------------------------------------------------------------ */
/*  GRIDPULSE demo — minimal OpenADR 2.0b VEN (Node).                 */
/*  Registers against the GRIDPULSE VTN, polls for demand-response     */
/*  events over EiEvent, and opts in to the active one. Walk the log   */
/*  in parallel with the dashboard's Demand-response events monitor.   */
/*                                                                      */
/*  Usage: node scripts/ven-node.js [baseUrl] [venID]                   */
/* ------------------------------------------------------------------ */
const BASE = (process.argv[2] || process.env.API_URL || "http://localhost:4000").replace(/\/$/, "");
const VEN_ID = process.argv[3] || "GRIDPULSE-VEN-1";
const POLL_MS = Number(process.env.POLL_MS || 8000);

function envelope(reqId, payload) {
  return `<?xml version="1.0"?>
<oadr:oadr${payload.type} xmlns:oadr="http://openadr.org/oadr-2.0b/2012/07" xmlns:ei="http://docs.oasis-open.org/ns/energyinterop/201110">
  <ei:requestID>${reqId}</ei:requestID>${payload.body}
</oadr:oadr${payload.type}>`;
}

async function post(rel, body, contentType = "application/xml") {
  const res = await fetch(`${BASE}${rel}`, {
    method: "POST",
    headers: { "Content-Type": contentType },
    body,
  });
  return res.text();
}

function extract(xml, tag) {
  const m = new RegExp(`<(?:ei|oadr):${tag}>([^<]+)<\\/(?:ei|oadr):${tag}>`).exec(xml);
  return m ? m[1] : null;
}

async function register() {
  const xml = envelope(`reg-${Date.now()}`, {
    type: "CreatePartyRegistration",
    body: `<oadr:venID>${VEN_ID}</oadr:venID><oadr:registrationID>dummy</oadr:registrationID><oadr:reportOnly>false</oadr:reportOnly>`,
  });
  const resp = await post("/openadr/ei/register", xml);
  const reg = extract(resp, "registrationID");
  console.log(`[ven] registered as ${VEN_ID} (registrationID=${reg || "n/a"})`);
  return reg;
}

async function poll(reg) {
  const xml = envelope(`poll-${Date.now().toString(36)}`, { type: "Poll", body: "" });
  const resp = await post("/openadr/ei/event", xml);
  const ids = [...resp.matchAll(/<ei:eventID>([^<]+)<\/ei:eventID>/g)].map((m) => m[1]);
  const status = [...resp.matchAll(/<ei:eventStatus>([^<]+)<\/ei:eventStatus>/g)].map((m) => m[1]);
  const signals = [...resp.matchAll(/<oadr:intervalValues>[\s\S]*?<ei:uid>\d+<\/ei:uid>[\s\S]*?<ei:value>([^<]+)<\/ei:value>/g)].map((m) => m[1]);
  console.log(`[ven] poll -> ${ids.length} event(s)`);
  ids.forEach((id, i) => console.log(`      ${id} · ${status[i] || "far"} · signal ${signals[i] || "?"}%`));

  const activeIndex = status.indexOf("active");
  if (activeIndex >= 0 && reg) {
    const optXml = envelope(`opt-${Date.now().toString(36)}`, {
      type: "CreateOpt",
      body: `<oadr:optType>optIn</oadr:optType><oadr:optReason>economic</oadr:optReason><oadr:venID>${VEN_ID}</oadr:venID>
  <oadr:optTarget><ei:eventID>${ids[activeIndex]}</ei:eventID></oadr:optTarget>`,
    });
    const optResp = await post("/openadr/ei/opt", optXml);
    const optType = extract(optResp, "optType");
    console.log(`[ven] opted ${optType} into ${ids[activeIndex]}`);
  }
}

async function main() {
  console.log(`OpenADR VEN ${VEN_ID} -> ${BASE}`);
  const reg = await register();
  await poll(reg);
  setInterval(() => poll(reg), POLL_MS);
}

main().catch((err) => { console.error("[ven] failed:", err.message); process.exit(1); });