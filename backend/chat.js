/* ------------------------------------------------------------------ */
/*  GRIDPULSE assistant — optional LLM-backed chat.                    */
/*  The desktop/macOS build stays fully self-contained: if no API key  */
/*  is configured the client falls back to its local knowledge base.   */
/*                                                                      */
/*  Config (env vars, or passed per-request from the UI so users can   */
/*  bring their own key without a restart):                            */
/*    GRIDPULSE_AI_API_KEY   OpenAI-compatible API key                  */
/*    GRIDPULSE_AI_BASE_URL  default https://api.openai.com/v1          */
/*    GRIDPULSE_AI_MODEL     default gpt-4o-mini                        */
/*  Any OpenAI-compatible provider works (OpenAI, Groq, OpenRouter,     */
/*  Together, Ollama at a custom base URL, …).                          */
/*                                                                      */
/*  PRISM tracing (optional, fire-and-forget):                         */
/*    PRISMTRACE_HOST       default https://prism.blockconvey.com       */
/*    PRISMTRACE_PROJECT_ID project UUID                                */
/*    PRISMTRACE_API_KEY    pt-sk-... key with ingest scope             */
/* ------------------------------------------------------------------ */
const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";
const EXTERNAL_FALLBACK_NOTE = "Assistant server unavailable — using offline knowledge mode.";

/* ---- PRISM observability ---- */
const PRISM_HOST = (process.env.PRISMTRACE_HOST || "https://prism.blockconvey.com").replace(/\/+$/, "");
const PRISM_PROJECT_ID = process.env.PRISMTRACE_PROJECT_ID || "";
const PRISM_API_KEY = process.env.PRISMTRACE_API_KEY || "";

function prismEnabled() {
  return !!(PRISM_PROJECT_ID && PRISM_API_KEY);
}

async function emitPrismTrace({ inputMessages, outputMessage, model, latencyMs, sessionId, userId, metadata }) {
  if (!prismEnabled()) return;
  const body = {
    project_id: PRISM_PROJECT_ID,
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
    await fetch(`${PRISM_HOST}/api/traces`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-PRISMtrace-Key": PRISM_API_KEY,
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
- Keep answers under ~120 words. Don't use markdown tables or code blocks.
- The role is provided in the conversation; tailor page/feature references to it.`;

function effectiveConfig(provided) {
  const p = provided || {};
  const baseURL = (p.baseURL || process.env.GRIDPULSE_AI_BASE_URL || DEFAULT_BASE_URL)
    .toString().trim().replace(/\/+$/, "");
  return {
    apiKey: (p.apiKey || process.env.GRIDPULSE_AI_API_KEY || "").toString().trim(),
    baseURL,
    model: (p.model || process.env.GRIDPULSE_AI_MODEL || DEFAULT_MODEL).toString().trim() || DEFAULT_MODEL,
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
  return String(process.env.GRIDPULSE_AI_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
}

async function ask({ message, history, apiKey, baseURL, model, sessionId }) {
  const cfg = effectiveConfig({ apiKey, baseURL, model });

  /* No LLM key → local knowledge fallback (still traced so PRISM sees
     real chat volume and can score the fallback even without an AI key). */
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

  const inputMessages = [{ role: "system", content: SYSTEM_PROMPT }];
  const recent = (history || []).slice(-8);
  for (const h of recent) {
    const content = String(h.text || "").slice(0, 2000);
    if (!content) continue;
    if (h.from === "user") inputMessages.push({ role: "user", content });
    else if (h.from === "bot") inputMessages.push({ role: "assistant", content });
    if (inputMessages.length >= 20) break;
  }
  inputMessages.push({ role: "user", content: String(message).slice(0, 2000) });

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
    const latencyMs = Date.now() - t0;
    emitPrismTrace({
      inputMessages: [{ role: "user", content: String(message).slice(0, 2000) }],
      outputMessage: EXTERNAL_FALLBACK_NOTE,
      model: cfg.model,
      latencyMs,
      sessionId,
      metadata: { mode: "local", reason: "fetch_error" },
    });
    return { mode: "local", model: cfg.model, note: EXTERNAL_FALLBACK_NOTE };
  }

  if (!res.ok) {
    const latencyMs = Date.now() - t0;
    const note = `Assistant provider error (${res.status}) — offline knowledge mode.`;
    emitPrismTrace({
      inputMessages: [{ role: "user", content: String(message).slice(0, 2000) }],
      outputMessage: note,
      model: cfg.model,
      latencyMs,
      sessionId,
      metadata: { mode: "local", reason: "provider_error", status: res.status },
    });
    return { mode: "local", model: cfg.model, note };
  }

  const data = await res.json().catch(() => null);
  const reply = data?.choices?.[0]?.message?.content;
  const latencyMs = Date.now() - t0;

  if (!reply) {
    emitPrismTrace({
      inputMessages: [{ role: "user", content: String(message).slice(0, 2000) }],
      outputMessage: "Assistant returned no reply — offline knowledge mode.",
      model: cfg.model,
      latencyMs,
      sessionId,
      metadata: { mode: "local", reason: "empty_reply" },
    });
    return { mode: "local", model: cfg.model, note: "Assistant returned no reply — offline knowledge mode." };
  }

  const trimmed = String(reply).trim();
  const tokenIn = data?.usage?.prompt_tokens || 0;
  const tokenOut = data?.usage?.completion_tokens || 0;

  emitPrismTrace({
    inputMessages: inputMessages.filter((m) => m.role !== "system"),
    outputMessage: trimmed,
    model: cfg.model,
    latencyMs,
    sessionId,
    metadata: { mode: "ai", provider: providerName(cfg.baseURL), token_in: tokenIn, token_out: tokenOut },
  });

  return { mode: "ai", reply: trimmed, model: cfg.model, provider: providerName(cfg.baseURL) };
}

function prismHost() {
  return PRISM_HOST;
}

module.exports = { ask, configured, effectiveModel, prismEnabled, prismHost };