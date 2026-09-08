/* ------------------------------------------------------------------ */
/*  GRIDPULSE OpenADR 2.0b Virtual Top Node — a minimal, dependency-   */
/*  free VTN implementing EiRegisterParty / EiEvent / EiOpt so demand- */
/*  response signals can be pushed to a VEN (python-openleadr or the   */
/*  bundled Node VEN simulator).                                       */
/* ------------------------------------------------------------------ */

const { live } = require("./live");

const NS = {
  oadr: "http://openadr.org/oadr-2.0b/2012/07",
  ei: "http://docs.oasis-open.org/ns/energyinterop/201110",
};

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function reqId(body) {
  const m = /<ei:requestID>([^<]+)<\/ei:requestID>/.exec(body);
  return esc(m ? m[1] : `GRIDPULSE-${Date.now().toString().slice(-6)}`);
}

function getJson(body) {
  try { return JSON.parse(body); } catch (_) { return null; }
}

function distributeEvent(events) {
  if (!events.length) {
    return `<?xml version="1.0"?><oadr:oadrDistributeEvent xmlns:oadr="${NS.oadr}" xmlns:ei="${NS.ei}"><ei:responseCode>200</ei:responseCode><ei:responseDescription>OK</ei:responseDescription><ei:requestID>req-demo</ei:requestID></oadr:oadrDistributeEvent>`;
  }
  const items = events.map((e) => `
      <oadr:eiEvent>
        <ei:eventDescriptor>
          <ei:eventID>${esc(e.id)}</ei:eventID>
          <ei:eventStatus>${e.status === "active" ? "active" : "far"}</ei:eventStatus>
          <ei:modificationNumber>0</ei:modificationNumber>
          <ei:priority>1</ei:priority>
          <ei:createdDateTime>${esc(e.createdAt || new Date().toISOString())}</ei:createdDateTime>
          <ei:eventStart>${esc(e.startAt)}</ei:eventStart>
          <ei:eventDuration>PT${Date.parse(e.endAt) > Date.parse(e.startAt) ? Math.max(1, Math.round((Date.parse(e.endAt) - Date.parse(e.startAt)) / 60000)) : 60}M</ei:eventDuration>
        </ei:eventDescriptor>
        <oadr:eiEventSignals>
          <oadr:eiEventSignal>
            <ei:signalID>sig-${esc(e.id)}</ei:signalID>
            <ei:signalType>delta</ei:signalType>
            <ei:signalName>SIMPLE</ei:signalName>
            <oadr:interval>
              <ei:duration>PT${Math.max(1, Math.round((Date.parse(e.endAt) - Date.parse(e.startAt)) / 60000))}M</ei:duration>
              <oadr:intervalValues>
                <ei:uid>1</ei:uid>
                <ei:value>${esc(e.signalPercent)}</ei:value>
              </oadr:intervalValues>
            </oadr:interval>
          </oadr:eiEventSignal>
        </oadr:eiEventSignals>
      </oadr:eiEvent>`).join("");
  return `<?xml version="1.0"?><oadr:oadrDistributeEvent xmlns:oadr="${NS.oadr}" xmlns:ei="${NS.ei}">
    <ei:responseCode>200</ei:responseCode>
    <ei:responseDescription>OK</ei:responseDescription>
    <ei:requestID>req-demo</ei:requestID>
    <oadr:vtnID>GRIDPULSE-VTN</oadr:vtnID>
    ${items}
  </oadr:oadrDistributeEvent>`;
}

function seedEvents() {
  const now = Date.now();
  const h = (n) => new Date(now + n * 3600000).toISOString();
  const mk = (id, title, startHours, durHours, percent, incentive) => ({
    id, title, startAt: h(startHours), endAt: h(startHours + durHours),
    status: startHours <= 0 ? "active" : "far", signalPercent: percent,
    incentive, createdAt: new Date().toISOString(), source: "OpenADR",
    opts: { optIn: startHours <= 0 ? 1 : 0, optOut: 0 },
  });
  live.setDREvent(mk("DR-0904-EV", "Evening peak reduction — shift flexible sessions", -0.25, 2, 25, "$22.40"));
  live.setDREvent(mk("DR-0905-SOL", "Solar surplus soak — low-tariff soak-up", 20, 3, -15, "$14.80"));
  live.setDREvent(mk("DR-0906-STO", "Storage discharge — 30 min grid relief", 27, 1, 40, "$31.00"));
}

function registerOpenAdr(app) {
  seedEvents();

  const reply = (req, res, xml, status = 200) => {
    res.type("application/xml").status(status).send(xml);
  };

  app.post("/openadr/ei/register", (req, res) => {
    const body = typeof req.body === "string" ? req.body : req.rawBody;
    const venID = /<ei:venID>([^<]+)<\/ei:venID>/.exec(req.rawBody || "") || /<ei:venID>([^<]+)<\/ei:venID>/.exec(typeof req.body === "string" ? req.body : "");
    const json = typeof req.body === "object" && req.body !== null && !req.body.compress ? req.body : null;
    const rid = req.rawBody ? reqId(req.rawBody) : (json?.requestID || "req-" + Date.now().toString().slice(-6));
    const reg = `REG-${Date.now().toString().slice(-6)}`;
    const vid = esc(json?.venID || (venID ? venID[1] : "GRIDPULSE-VEN-1"));
    reply(req, res, `<?xml version="1.0"?><oadr:oadrCreatedPartyRegistration xmlns:oadr="${NS.oadr}" xmlns:ei="${NS.ei}">
  <ei:responseCode>200</ei:responseCode>
  <ei:responseDescription>OK</ei:responseDescription>
  <ei:requestID>${esc(rid)}</ei:requestID>
  <oadr:registrationID>${reg}</oadr:registrationID>
  <oadr:vtnID>GRIDPULSE-VTN</oadr:vtnID>
  <oadr:venID>${vid}</oadr:venID>
</oadr:oadrCreatedPartyRegistration>`);
  });

  app.post("/openadr/ei/event", (req, res) => {
    const active = live.drEvents.filter((e) => !e.cancelled && new Date(e.endAt) > Date.now());
    reply(req, res, distributeEvent(active));
  });

  app.post("/openadr/ei/opt", (req, res) => {
    const body = typeof req.body === "string" ? req.body : "";
    const opt = /<ei:optType>([^<]+)<\/ei:optType>/.exec(body);
    const event = /<ei:eventID>([^<]+)<\/ei:eventID>/.exec(body);
    const optType = opt ? opt[1] : "optIn";
    if (event) live.optDREvent(event[1], optType);
    reply(req, res, `<?xml version="1.0"?><oadr:oadrCreatedOpt xmlns:oadr="${NS.oadr}" xmlns:ei="${NS.ei}">
  <ei:responseCode>200</ei:responseCode>
  <ei:responseDescription>OK</ei:responseDescription>
  <ei:requestID>opt-req</ei:requestID>
  <oadr:optType>${esc(optType)}</oadr:optType>
</oadr:oadrCreatedOpt>`);
  });

  app.get("/api/dr", (_req, res) => {
    res.json({ vtnID: "GRIDPULSE-VTN", events: live.drEvents });
  });
}

module.exports = { registerOpenAdr };