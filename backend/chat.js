/* ------------------------------------------------------------------ */
/*  GRIDPULSE assistant — Pulse.                                       */
/*                                                                     */
/*  Default provider is a LOCAL Ollama engine (llama3:latest) on       */
/*  http://127.0.0.1:11434/v1. ollama.js provisions, starts and        */
/*  verifies it automatically on first run — no terminal commands, no  */
/*  API keys, no .env edits. When local AI is active, browser/client-  */
/*  supplied keys are deliberately ignored (chat.js: the local         */
/*  configuration is the single source of truth).                      */
/*                                                                     */
/*  Cloud mode (legacy) still works for users who prefer an OpenAI-    */
/*  compatible provider: set GRIDPULSE_AI_PROVIDER=cloud and bring     */
/*  your own key per-request or via GRIDPULSE_AI_API_KEY.              */
/*                                                                     */
/*  Config (env vars):                                                 */
/*    GRIDPULSE_AI_PROVIDER  ollama (default, auto-local) | cloud | off */
/*    GRIDPULSE_AI_BASE_URL  cloud only (default https://api.openai.com/v1) */
/*    GRIDPULSE_AI_MODEL     default llama3:latest (ollama) / gpt-4o-mini (cloud) */
/*    GRIDPULSE_AI_API_KEY   cloud only                                   */
/*  PRISM tracing (optional, fire-and-forget):                         */
/*    PRISMTRACE_HOST       default https://prism.blockconvey.com      */
/*    PRISMTRACE_PROJECT_ID project UUID                                */
/*    PRISMTRACE_API_KEY    pt-sk-... key with ingest scope             */
/* ------------------------------------------------------------------ */
const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";
const EXTERNAL_FALLBACK_NOTE = "Assistant server unavailable — using offline knowledge mode.";
const ai = require("./ollama");

/* ---- PRISM observability (lazy reads so tests can swap env) ---- */
function prismEnv() {
  return {
    host: (process.env.PRISMTRACE_HOST || "https://prism.blockconvey.com").replace(/\/+$/, ""),
    projectId: process.env.PRISMTRACE_PROJECT_ID || "",
    apiKey: process.env.PRISMTRACE_API_KEY || "",
  };
}

function prismEnabled() {
  const e = prismEnv();
  return !!(e.projectId && e.apiKey);
}

async function emitPrismTrace({ inputMessages, outputMessage, model, latencyMs, sessionId, userId, metadata }) {
  const e = prismEnv();
  if (!(e.projectId && e.apiKey)) return;
  const body = {
    project_id: e.projectId,
    model: model || "unknown",
    input_messages: inputMessages,
    output_message: outputMessage,
    latency_ms: latencyMs || 0,
    session_id: sessionId || undefined,
    agent_id: "gridpulse-pulse",
    agent_name: "Pulse Assistant",
    user_identifier: userId || undefined,
    metadata: { ...metadata, source: "gridpulse-backend" },
  };
  try {
    await fetch(`${e.host}/api/traces`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-PRISMtrace-Key": e.apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
  } catch (_) {
    /* fire-and-forget — never block the chat response */
  }
}

const SYSTEM_PROMPT = `You are Pulse, the friendly in-app assistant for GRIDPULSE, an EV-charging operations + driver platform made by GRIDPULSE contributors (repo: abhinandanhota5-code/gridpulse).

GRIDPULSE is TWO experiences, pick based on the user's role:

1) DRIVER (EV owner):
- Overview: monthly energy, spend, estimated range, CO2 avoided.
- My car / Garage: vehicle profile, market value, battery, insurance/PUC renewals, digital docs.
- Charge planner: picks cheapest/greenest/fastest charging window from live grid, solar and demand-response signals.
- Charging history: past sessions with cost, energy, duration, location.
- Battery health: capacity retention, charge cycles, projected degradation.
- Find chargers: live map of nearby stations with price/availability/reliability, GPS-sorted.
- Predictive insights, Roadmap, Settings.

2) OWNER (fleet operator):
- Owner Overview: fleet, grid, energy health + live protocol telemetry.
- Live gateway: real-time OCPP, MODBUS, OpenADR, ISO 15118, ANPR feeds.
- Charging operations: stations, connectors, sessions across the fleet.
- Grid & energy: load, solar, demand across sites.
- Battery insights, Predictive insights, Energy theft (ANPR + session correlation), Alerts, Products, Roadmap, Settings.

Product guidance:
- Help users understand the platform's value, identify operational pain points, and suggest practical improvements tied to cost, uptime, load balancing, range accuracy, and reliability.
- Good improvement stories explain a real weakness, the data source behind it, and the likely impact of fixing it.

Demo accounts: Owner demo = GRIDPULSE / owner123. Driver demo = TN84DR5021 / demo123.

Protocol/technical facts:
- OCPP 1.6J / 2.0.1 over WebSocket: point a charger at ws://<host>/ocpp/{stationId}.
- MODBUS energy meters via MODBUS master (default :1502).
- OpenADR 2.0b: gateway acts as a VTN; POST /openadr/ei/register, /event, /opt.
- ISO 15118 (Plug & Charge / V2G) via Josev: POST /api/ingest/josev.
- VOLTTRON site metrics: POST /api/ingest/volttron (optional x-ingest-token auth).
- ANPR: reads plates; POST /api/v1/plate-events, correlated with sessions on Energy theft page.
- Weather: live Open-Meteo at the user's GPS coordinate; folded into range/charge estimates.
- GPS: the app asks for location permission; granted once, chargers sort by distance and local weather loads.

Behaviour rules:
- Answer in plain text, concise and warm. Use the real features/facts above — do not invent features, prices, or support contacts.
- When the user asks about improving the system, give a realistic improvement plan tied to the data and product flow.
- If asked something unrelated to GRIDPULSE, politely steer back to GRIDPULSE topics.
- General questions (weather facts, math, definitions, how-to) can be answered directly and helpfully — don't force every answer into a GRIDPULSE framing.
- Keep answers under ~120 words. Don't use markdown tables or code blocks.
- The role is provided in the conversation; tailor page/feature references to it.`;

function providerMode() {
  return String(process.env.GRIDPULSE_AI_PROVIDER || "ollama").trim().toLowerCase();
}

function effectiveConfig(provided) {
  const mode = providerMode();
  const p = provided || {};
  if (mode === "ollama") {
    return {
      apiKey: "ollama",
      baseURL: ai.baseUrl(),
      model: String(process.env.GRIDPULSE_AI_MODEL || "llama3:latest").trim() || "llama3:latest",
      provider: "ollama",
    };
  }
  const baseURL = (p.baseURL || process.env.GRIDPULSE_AI_BASE_URL || DEFAULT_BASE_URL)
    .toString().trim().replace(/\/+$/, "");
  return {
    apiKey: (p.apiKey || process.env.GRIDPULSE_AI_API_KEY || "").toString().trim(),
    baseURL,
    model: (p.model || process.env.GRIDPULSE_AI_MODEL || DEFAULT_MODEL).toString().trim() || DEFAULT_MODEL,
    provider: "cloud",
  };
}

function providerName(baseURL) {
  try {
    return new URL(baseURL).hostname;
  } catch (_) {
    return "openai-compatible";
  }
}

function configured() {
  return !!String(process.env.GRIDPULSE_AI_API_KEY || "").trim();
}

function effectiveModel() {
  const env = String(process.env.GRIDPULSE_AI_MODEL || "").trim();
  if (env) return env;
  return providerMode() === "ollama" ? "llama3:latest" : DEFAULT_MODEL;
}

function buildInputMessages({ message, history }) {
  const inputMessages = [{ role: "system", content: SYSTEM_PROMPT }];
  const recent = (history || []).slice(-8);
  for (const h of recent) {
    const content = String(h.text || "").slice(0, 2000);
    if (!content) continue;
    if (h.from === "user") inputMessages.push({ role: "user", content });
    else if (h.from === "bot") inputMessages.push({ role: "assistant", content });
    if (inputMessages.length >= 20) break;
  }
  inputMessages.push({ role: "user", content: String(message || "").slice(0, 2000) });
  return inputMessages;
}

async function runCompletion(cfg, inputMessages) {
  const t0 = Date.now();
  let res;
  try {
    res = await fetch(`${cfg.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: inputMessages,
        temperature: 0.3,
        max_tokens: 512,
      }),
      signal: AbortSignal.timeout(25000),
    });
  } catch (err) {
    return { error: "fetch_error", status: 0, latencyMs: Date.now() - t0, reason: String((err && err.message) || err) };
  }
  const latencyMs = Date.now() - t0;
  if (!res.ok) return { error: "provider_error", status: res.status, latencyMs };
  const data = await res.json().catch(() => null);
  const reply = data?.choices?.[0]?.message?.content;
  if (!reply) return { error: "empty_reply", status: res.status, latencyMs };
  const trimmed = String(reply).trim();
  if (!trimmed) return { error: "empty_reply", status: res.status, latencyMs };
  return {
    reply: trimmed,
    latencyMs,
    tokenIn: data?.usage?.prompt_tokens || 0,
    tokenOut: data?.usage?.completion_tokens || 0,
  };
}

function aiNotReadyNote() {
  const s = ai.status();
  if (s.phase === "failed" && s.lastError) return `Pulse's local AI needs setup: ${s.lastError}`;
  if (s.phase === "model_required") return s.message;
  return `Pulse's local AI is preparing itself (${s.message.toLowerCase()}) — try again in a moment.`;
}

async function ask({ message, history, apiKey, baseURL, model, sessionId }) {
  const cfg = effectiveConfig({ apiKey, baseURL, model });

  if (cfg.provider === "ollama") {
    if (!ai.status().ready) {
      const note = aiNotReadyNote();
      emitPrismTrace({
        inputMessages: [{ role: "user", content: String(message).slice(0, 2000) }],
        outputMessage: note,
        model: cfg.model,
        latencyMs: 0,
        sessionId,
        metadata: { mode: "local", provider: "ollama", reason: "ai_not_ready" },
      });
      return { mode: "local", model: cfg.model, note };
    }
    const inputMessages = buildInputMessages({ message, history });
    const out = await runCompletion(cfg, inputMessages);
    if (out.error) {
      emitPrismTrace({
        inputMessages: inputMessages.filter((m) => m.role !== "system"),
        outputMessage: EXTERNAL_FALLBACK_NOTE,
        model: cfg.model,
        latencyMs: out.latencyMs || 0,
        sessionId,
        metadata: { mode: "local", provider: "ollama", reason: out.error, status: out.status },
      });
      return { mode: "local", model: cfg.model, note: EXTERNAL_FALLBACK_NOTE };
    }
    emitPrismTrace({
      inputMessages: inputMessages.filter((m) => m.role !== "system"),
      outputMessage: out.reply,
      model: cfg.model,
      latencyMs: out.latencyMs,
      sessionId,
      metadata: { mode: "ai", provider: "ollama", token_in: out.tokenIn, token_out: out.tokenOut },
    });
    return { mode: "ai", reply: out.reply, model: cfg.model, provider: "ollama" };
  }

  /* Cloud provider path (legacy behaviour preserved). */
  if (!cfg.apiKey) {
    const note = "Add an AI provider key to unlock smarter answers.";
    emitPrismTrace({
      inputMessages: [{ role: "user", content: String(message).slice(0, 2000) }],
      outputMessage: note,
      model: cfg.model,
      latencyMs: 0,
      sessionId,
      metadata: { mode: "local", reason: "no_ai_key" },
    });
    return { mode: "local", model: cfg.model, note };
  }

  const inputMessages = buildInputMessages({ message, history });
  const out = await runCompletion(cfg, inputMessages);
  if (out.error === "fetch_error") {
    emitPrismTrace({
      inputMessages: [{ role: "user", content: String(message).slice(0, 2000) }],
      outputMessage: EXTERNAL_FALLBACK_NOTE,
      model: cfg.model,
      latencyMs: out.latencyMs,
      sessionId,
      metadata: { mode: "local", reason: "fetch_error" },
    });
    return { mode: "local", model: cfg.model, note: EXTERNAL_FALLBACK_NOTE };
  }
  if (out.error === "provider_error") {
    const note = `Assistant provider error (${out.status}) — offline knowledge mode.`;
    emitPrismTrace({
      inputMessages: [{ role: "user", content: String(message).slice(0, 2000) }],
      outputMessage: note,
      model: cfg.model,
      latencyMs: out.latencyMs,
      sessionId,
      metadata: { mode: "local", reason: "provider_error", status: out.status },
    });
    return { mode: "local", model: cfg.model, note };
  }
  if (out.error === "empty_reply") {
    const note = "Assistant returned no reply — offline knowledge mode.";
    emitPrismTrace({
      inputMessages: [{ role: "user", content: String(message).slice(0, 2000) }],
      outputMessage: note,
      model: cfg.model,
      latencyMs: out.latencyMs,
      sessionId,
      metadata: { mode: "local", reason: "empty_reply" },
    });
    return { mode: "local", model: cfg.model, note };
  }

  emitPrismTrace({
    inputMessages: inputMessages.filter((m) => m.role !== "system"),
    outputMessage: out.reply,
    model: cfg.model,
    latencyMs: out.latencyMs,
    sessionId,
    metadata: { mode: "ai", provider: providerName(cfg.baseURL), token_in: out.tokenIn, token_out: out.tokenOut },
  });
  return { mode: "ai", reply: out.reply, model: cfg.model, provider: providerName(cfg.baseURL) };
}

function prismHost() {
  return prismEnv().host;
}

module.exports = {
  ask,
  configured,
  effectiveModel,
  providerMode,
  prismEnabled,
  prismHost,
  emitTrace: emitPrismTrace,
};