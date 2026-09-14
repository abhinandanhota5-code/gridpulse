const { test, before } = require("node:test");
const assert = require("node:assert/strict");
const os = require("node:os");
const fs = require("node:fs");
const path = require("node:path");

before(() => {
  // Hermetic: never touch the host machine's real Ollama / persisted state.
  process.env.GRIDPULSE_AI_STATE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "gridpulse-ai-chat-"));
  process.env.GRIDPULSE_AI_BOOTSTRAP = "0";
  process.env.OLLAMA_HOST = "http://127.0.0.1:9"; // unroutable port
});

test("provider defaults to local ollama with llama3:latest", () => {
  delete process.env.GRIDPULSE_AI_PROVIDER;
  delete process.env.GRIDPULSE_AI_MODEL;
  delete process.env.GRIDPULSE_AI_API_KEY;
  const chat = require("../chat.js");
  assert.equal(chat.providerMode(), "ollama");
  assert.equal(chat.effectiveModel(), "llama3:latest");
  assert.equal(chat.configured(), false);
});

test("ask() degrades gracefully with a note while local AI is not ready", async () => {
  const chat = require("../chat.js");
  const out = await chat.ask({ message: "hello", history: [] });
  assert.equal(out.mode, "local");
  assert.ok(out.note && out.note.length > 0, "should return an explanatory note");
  assert.equal(out.model, "llama3:latest");
});

test("cloud mode surfaces configured/effectiveModel from env", () => {
  const chat = require("../chat.js");
  process.env.GRIDPULSE_AI_PROVIDER = "cloud";
  process.env.GRIDPULSE_AI_MODEL = "gpt-test";
  process.env.GRIDPULSE_AI_API_KEY = "sk-test";
  assert.equal(chat.providerMode(), "cloud");
  assert.equal(chat.effectiveModel(), "gpt-test");
  assert.equal(chat.configured(), true);
});