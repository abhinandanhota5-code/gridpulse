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
    if (u.pathname === "/api/tags") return json(res, { models: [{ name: "some-other:model" }] });
    if (u.pathname === "/api/pull") {
      res.writeHead(200, { "Content-Type": "application/x-ndjson" });
      const total = 52 * 1024 * 1024;
      res.write(JSON.stringify({ status: "processing", completed: 0, total }) + "\n");
      res.write(JSON.stringify({ status: "processing", completed: Math.round(total * 0.5), total }) + "\n");
      res.write(JSON.stringify({ status: "success", completed: total, total }) + "\n");
      res.end();
      return;
    }
    if (u.pathname === "/v1/models") return json(res, { object: "list", data: [{ id: "pulse-test:latest" }] });
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
  stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "gridpulse-ai-pull-"));
  process.env.OLLAMA_HOST = `http://127.0.0.1:${port}`;
  process.env.GRIDPULSE_AI_PROVIDER = "ollama";
  process.env.GRIDPULSE_AI_MODEL = "pulse-test:latest";
  process.env.GRIDPULSE_AI_STATE_DIR = stateDir;
  delete require.cache[require.resolve("../ollama.js")];
  ai = require("../ollama.js");
});

after(async () => {
  await new Promise((r) => server.close(r));
  fs.rmSync(stateDir, { recursive: true, force: true });
});

test("pull path: missing model is downloaded then Pulse becomes ready", async () => {
  const s = await ai.ensure();
  assert.equal(s.modelPresent, true, "model should be reported present after pull");
  assert.equal(s.ready, true);
  assert.equal(s.phase, "ready");
  assert.equal(s.percent, 100);
});

test("status() end-to-end state after pull", () => {
  const s = ai.status();
  assert.equal(s.model, "pulse-test:latest");
  assert.equal(s.ready, true);
});