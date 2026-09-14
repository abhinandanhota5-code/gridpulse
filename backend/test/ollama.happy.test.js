const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const os = require("node:os");
const fs = require("node:fs");
const path = require("node:path");

function json(res, obj, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

let server, port, stateDir, ai = null;

function createServer() {
  return http.createServer((req, res) => {
    const u = new URL(req.url, "http://127.0.0.1");
    if (u.pathname === "/api/version") return json(res, { version: "stub-0.1.0" });
    if (u.pathname === "/api/tags") return json(res, { models: [{ name: "llama3:latest" }] });
    if (u.pathname === "/v1/models") return json(res, { object: "list", data: [{ id: "llama3:latest" }] });
    if (u.pathname === "/v1/chat/completions") {
      return json(res, { id: "x", choices: [{ message: { role: "assistant", content: "ready" } }] });
    }
    return json(res, { error: "not_found" }, 404);
  });
}

before(async () => {
  server = createServer();
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  port = server.address().port;
  stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "gridpulse-ai-ok-"));
  process.env.OLLAMA_HOST = `http://127.0.0.1:${port}`;
  process.env.GRIDPULSE_AI_PROVIDER = "ollama";
  process.env.GRIDPULSE_AI_MODEL = "llama3:latest";
  process.env.GRIDPULSE_AI_STATE_DIR = stateDir;
  delete require.cache[require.resolve("../ollama.js")];
  ai = require("../ollama.js");
});

after(async () => {
  await new Promise((r) => server.close(r));
  fs.rmSync(stateDir, { recursive: true, force: true });
});

test("status reports local provider before setup", () => {
  const s = ai.status();
  assert.equal(s.provider, "ollama");
  assert.equal(s.enabled, true);
  assert.equal(s.ready, false);
  assert.equal(typeof s.arch, "string");
});

test("localEnabled and baseUrl align with OLLAMA_HOST", () => {
  assert.equal(ai.localEnabled(), true);
  assert.equal(ai.baseUrl(), `http://127.0.0.1:${port}/v1`);
});

test("ensure() provisions and marks Pulse ready against the stub engine", async () => {
  const s = await ai.ensure();
  assert.equal(s.phase, "ready");
  assert.equal(s.ready, true);
  assert.equal(s.modelPresent, true);
  assert.equal(s.ollamaRunning, true);
  assert.equal(s.percent, 100);
  assert.equal(s.error, null);
});

test("ensure() is idempotent once ready", async () => {
  const s = await ai.ensure();
  assert.equal(s.ready, true);
  assert.equal(s.percent, 100);
});

test("recover() keeps a healthy engine ready", async () => {
  const s = await ai.recover();
  assert.equal(s.ready, true);
  assert.ok(s.lastCheck, "recover should refresh lastCheck");
});