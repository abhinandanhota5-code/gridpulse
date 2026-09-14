const { test, before } = require("node:test");
const assert = require("node:assert/strict");
const os = require("node:os");
const fs = require("node:fs");
const path = require("node:path");

let ai = null;

before(() => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "gridpulse-ai-off-"));
  process.env.GRIDPULSE_AI_PROVIDER = "cloud";
  process.env.GRIDPULSE_AI_BOOTSTRAP = "0";
  process.env.GRIDPULSE_AI_STATE_DIR = stateDir;
  delete require.cache[require.resolve("../ollama.js")];
  ai = require("../ollama.js");
});

test("cloud/disabled provider disables local bootstrap without network calls", async () => {
  assert.equal(ai.localEnabled(), false);
  const s = ai.status();
  assert.equal(s.provider, "cloud");
  assert.equal(s.enabled, false);
  const out = await ai.ensure();
  assert.equal(out.phase, "off");
  assert.match(out.message, /cloud|disabled/i);
});