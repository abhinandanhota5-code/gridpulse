#!/usr/bin/env node
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ai = require(path.join(path.dirname(fileURLToPath(import.meta.url)), "../backend/ollama.js"));

const name = process.argv[2] || "setup";

const fmt = (s, k) => {
  const v = s[k];
  if (v === undefined) return "–";
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (typeof v === "number") return Math.round(v * 10) / 10;
  return v;
};

(async () => {
  try {
    if (name === "status") {
      const s = ai.status();
      const rows = [
        ["provider", s.provider],
        ["phase", s.phase],
        ["stage", s.stage],
        ["ready", s.ready],
        ["progress", s.percent != null ? Math.round(s.percent) + "%" : "–"],
        ["model", s.model],
        ["base url", s.baseUrl],
        ["engine bin", s.engine],
        ["arch", s.arch],
        ["install dir", s.installDir],
        ["message", s.message],
        ["error", s.error],
      ];
      const w = Math.max(...rows.map(([k]) => k.length));
      for (const [k, v] of rows) console.log(`${k.padEnd(w)}  ${v}`);
      process.exit(s.phase === "failed" ? 1 : 0);
    }

    console.log("GRIDPULSE · provisioning local Pulse AI (Ollama). One-time download, then fully offline.");
    const s = await ai.ensure();
    if (s.ready) {
      console.log(`\nPulse AI ready: ${s.model} · ${s.baseUrl}`);
      console.log("Chat with the assistant (headphone icon) — no API key needed. It runs on this device.");
      process.exit(0);
    }
    if (s.phase === "failed") {
      console.error(`\nPulse AI setup failed: ${s.error || s.message}`);
      process.exit(1);
    }
    console.log(`\nPulse AI: ${s.message || `${s.stage}…`}`);
    console.log("Background provisioning continues; ask the assistant again in a moment.");
    process.exit(0);
  } catch (err) {
    console.error("Pulse AI setup error:", err && err.message ? err.message : err);
    process.exit(1);
  }
})();