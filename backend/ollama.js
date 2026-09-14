/* ------------------------------------------------------------------ */
/*  GRIDPULSE Pulse AI — local Ollama bootstrap.                       */
/*                                                                     */
/*  A brand-new user should not need terminal commands, API keys or    */
/*  .env files to get an AI assistant. When the backend starts this    */
/*  module, in the background:                                         */
/*    1. detects which Mac we are on (Apple Silicon vs Intel);         */
/*    2. checks whether Ollama is installed, and installs the official */
/*       distribution (fetched per-arch, never vendored in-repo);      */
/*    3. starts the Ollama service if it is installed but stopped;     */
/*    4. ensures the Pulse model exists locally, pulling it once;      */
/*    5. verifies the OpenAI-compatible endpoint with a tiny test      */
/*       completion, then marks Pulse ready.                           */
/*                                                                     */
/*  Failures are never fatal — the rest of GRIDPULSE keeps working.    */
/*  State is persisted outside the repo (~/.gridpulse) so the model    */
/*  is not re-downloaded on every launch, and a recovery path re-      */
/*  starts Ollama if it later stops.                                   */
/* ------------------------------------------------------------------ */
const os = require("os");
const path = require("path");
const fs = require("fs");
const { spawn, spawnSync } = require("child_process");
const net = require("net");
const { Readable } = require("stream");

const OLLAMA_HOST = (process.env.OLLAMA_HOST || "http://127.0.0.1:11434").replace(/\/+$/, "");
const MODEL = (process.env.GRIDPULSE_AI_MODEL || "llama3:latest").trim();
const PROVIDER = (process.env.GRIDPULSE_AI_PROVIDER || "ollama").trim().toLowerCase();
const AUTO_PULL = process.env.GRIDPULSE_AI_AUTO_PULL !== "0";
const BOOTSTRAP_OFF = process.env.GRIDPULSE_AI_BOOTSTRAP === "0";
const STATE_DIR = process.env.GRIDPULSE_AI_STATE_DIR || path.join(os.homedir(), ".gridpulse");
const STATE_FILE = path.join(STATE_DIR, "ai-state.json");
const INSTALL_DIR = process.env.GRIDPULSE_AI_INSTALL_DIR || "/Applications";
const MODEL_APPROX_BYTES = 4.7 * 1024 ** 3;
const ENGINE_APPROX_BYTES = 300 * 1024 ** 2;
let BIN_PATH = process.env.OLLAMA_BIN || "";

const PERSISTED = loadPersisted();
const S = {
  enabled: PROVIDER === "ollama" && !BOOTSTRAP_OFF,
  provider: PROVIDER,
  model: MODEL,
  arch: effectiveArch(),
  ready: Boolean(PERSISTED.ready && PERSISTED.model === MODEL && PERSISTED.arch === effectiveArch()),
  phase: "idle",
  stage: null,
  percent: 0,
  message: "Pulse AI not initialised.",
  detail: "",
  ollamaInstalled: false,
  ollamaRunning: false,
  modelPresent: false,
  internet: null,
  downloadBytes: MODEL_APPROX_BYTES,
  error: null,
  lastError: null,
  verifiedAt: 0,
  lastCheck: null,
  setupAt: PERSISTED.setupAt || null,
  readyAt: PERSISTED.readyAt || null,
};

let busy = false;

function effectiveArch() {
  const a = (process.env.GRIDPULSE_AI_ARCH || os.arch()).toLowerCase();
  if (a === "arm64" || a === "aarch64") return "arm64";
  if (a === "x64" || a === "amd64") return "x64";
  return a;
}

function loadPersisted() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) || {};
  } catch (_) {
    return {};
  }
}

function savePersisted(extra) {
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(
      STATE_FILE,
      JSON.stringify({
        arch: S.arch,
        model: MODEL,
        setupAt: S.setupAt,
        readyAt: S.readyAt,
        ready: S.ready,
        version: "1",
        ...extra,
      })
    );
  } catch (_) { /* state is best-effort */ }
}

function setStage(stage, message, percent, detail) {
  S.stage = stage;
  S.message = message;
  S.percent = Math.max(0, Math.min(100, percent));
  S.detail = detail || "";
  S.phase = "working";
}

function fail(key, message, detail) {
  S.error = key;
  S.lastError = message;
  S.phase = "failed";
  S.stage = key;
  S.message = message;
  S.detail = detail || "";
  savePersisted({ ready: false });
}

function markReady() {
  S.ready = true;
  S.error = null;
  S.phase = "ready";
  S.stage = "ready";
  S.percent = 100;
  S.message = "Pulse is ready ✓";
  S.readyAt = new Date().toISOString();
  if (!S.setupAt) S.setupAt = S.readyAt;
  S.verifiedAt = Date.now();
  savePersisted({ ready: true });
}

/* ---- process helpers ---- */
function candidateBins() {
  const seen = new Set();
  const push = (p) => { if (p && !seen.has(p)) { seen.add(p); } };
  const walk = (base) => {
    if (!base) return;
    for (const sub of ["ollama", "bin/ollama", "Contents/Resources/ollama", "Contents/Resources/bin/ollama"]) {
      push(path.join(base, sub));
    }
  };
  if (BIN_PATH) push(BIN_PATH);
  walk(path.dirname(process.cwd()));
  (process.env.PATH || "").split(path.delimiter).forEach((d) => push(path.join(d, "ollama")));
  push("/opt/homebrew/bin/ollama");
  push("/usr/local/bin/ollama");
  push(path.join(os.homedir(), ".local/bin/ollama"));
  walk(path.join(os.homedir(), "Applications/Ollama.app"));
  walk("/Applications/Ollama.app");
  return [...seen];
}

function findBin() {
  for (const c of candidateBins()) {
    if (fs.existsSync(c)) return c;
  }
  try {
    const r = spawnSync("which", ["ollama"], { encoding: "utf8", timeout: 5000 });
    const p = (r.stdout || "").trim();
    if (p && fs.existsSync(p)) BIN_PATH = p;
    return BIN_PATH || null;
  } catch (_) {
    return BIN_PATH || null;
  }
}

function appPresent() {
  return (
    fs.existsSync(path.join(INSTALL_DIR, "Ollama.app")) ||
    fs.existsSync(path.join(os.homedir(), "Applications/Ollama.app"))
  );
}

async function internetUp() {
  try {
    const r = await fetch("https://api.github.com/repos/ollama/ollama/releases/latest", {
      headers: { "User-Agent": "gridpulse" },
      signal: AbortSignal.timeout(6000),
    });
    S.internet = r.ok;
  } catch (_) {
    S.internet = false;
  }
  return S.internet;
}

function diskBytesNeeded(extra = 0) {
  return MODEL_APPROX_BYTES + ENGINE_APPROX_BYTES + extra;
}

async function freeDiskBytes(dir) {
  try {
    if (typeof fs.statfsSync === "function") {
      const s = fs.statfsSync(dir);
      return Number(s.bsize) * Number(s.bavail);
    }
  } catch (_) { /* fall through to df */ }
  try {
    const r = spawnSync("df", ["-k", dir], { encoding: "utf8", timeout: 5000 });
    const line = (r.stdout || "").split("\n")[1];
    const cols = line ? line.split(/\s+/) : [];
    return Number(cols[3]) * 1024 || Infinity;
  } catch (_) {
    return Infinity;
  }
}

async function diskOk() {
  const free = await freeDiskBytes(INSTALL_DIR);
  const need = diskBytesNeeded();
  return free >= need;
}

function connectToPort(timeoutMs) {
  return new Promise((resolve) => {
    const srv = net.connect({ host: "127.0.0.1", port: 11434 });
    srv.once("connect", () => { srv.destroy(); resolve(true); });
    srv.once("error", () => resolve(false));
    srv.setTimeout(timeoutMs, () => { srv.destroy(); resolve(false); });
  });
}

async function ping() {
  try {
    const r = await fetch(`${OLLAMA_HOST}/api/version`, { signal: AbortSignal.timeout(2000) });
    if (r.ok) {
      const j = await r.json().catch(() => ({}));
      S.ollamaRunning = true;
      S.ollamaInstalled = true;
      return { ok: true, version: j.version || "" };
    }
  } catch (_) { /* not running yet */ }
  S.ollamaRunning = await connectToPort(800);
  return { ok: false };
}

async function waitHealthy(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const p = await ping();
    if (p.ok) return p;
    await new Promise((r) => setTimeout(r, 750));
  }
  return null;
}

async function serviceTags() {
  try {
    const r = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!r.ok) return [];
    const j = await r.json();
    return (j.models || []).map((m) => m.name);
  } catch (_) {
    return [];
  }
}

function modelPresentSync(names) {
  return names.some((n) => n === MODEL || n.startsWith(MODEL.split(":")[0] + ":"));
}

async function startService() {
  setStage("start", "Starting local AI engine…", 28);
  const bin = findBin();
  if (bin) {
    try {
      const child = spawn(bin, ["serve"], { stdio: "ignore", detached: true });
      child.on("error", () => { /* try app path next */ });
      child.unref();
    } catch (_) { /* ignore */ }
    if (await waitHealthy(45000)) return true;
  }
  if (process.platform === "darwin" && appPresent()) {
    try {
      spawnSync("/usr/bin/open", ["-a", "Ollama"], { stdio: "ignore", timeout: 8000 });
    } catch (_) { /* ignore */ }
    if (await waitHealthy(60000)) return true;
  }
  return false;
}

async function pullModel() {
  setStage("pull", `Downloading Pulse model… (0%)`, 36, `${MODEL} ≈ 4.7 GB — one-time download.`);
  const resp = await fetch(`${OLLAMA_HOST}/api/pull`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, stream: true }),
    signal: AbortSignal.timeout(3600000),
  });
  if (!resp.ok || !resp.body) {
    throw new Error(resp.status ? `pull http ${resp.status}` : "pull failed");
  }
  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (!line) continue;
      try {
        const j = JSON.parse(line);
        if (typeof j.completed === "number" && j.total) {
          const pct = Math.round((j.completed / j.total) * 100);
          S.percent = 36 + Math.round((pct / 100) * 49);
          S.message = `Downloading Pulse model… (${pct}%)`;
        }
        if (j.status === "success") {
          S.percent = 85;
          S.message = "Downloading Pulse model… ✓";
        }
      } catch (_) { /* partial line */ }
    }
  }
}

async function verify() {
  if (S.ready && Date.now() - S.verifiedAt < 5 * 60 * 1000) return true;
  setStage("verify", "Testing local AI…", 90);
  const v1 = `${OLLAMA_HOST}/v1`;
  const models = await fetch(`${v1}/models`, { signal: AbortSignal.timeout(4000) });
  if (!models.ok) throw new Error("openai-models");
  const test = await fetch(`${v1}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer ollama" },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: "Reply with the single word: ready" }],
      max_tokens: 8,
      stream: false,
    }),
    signal: AbortSignal.timeout(120000),
  });
  const j = await test.json().catch(() => null);
  if (!test.ok || !j || !j.choices || !j.choices[0] || !j.choices[0].message || !j.choices[0].message.content) {
    throw new Error(`chat ${test.status}`);
  }
  return true;
}

/* ---- official engine install (macOS) ---- */
async function ollamaAssetUrl(arch) {
  try {
    const r = await fetch("https://api.github.com/repos/ollama/ollama/releases/latest", {
      headers: { "User-Agent": "gridpulse", Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(10000),
    });
    if (r.ok) {
      const j = await r.json();
      const want = arch === "arm64" ? "Ollama-darwin.zip" : "Ollama-darwin-amd64.zip";
      const asset = (j.assets || []).find((a) => a.name === want);
      if (asset && asset.browser_download_url) return asset.browser_download_url;
    }
  } catch (_) { /* fall back below */ }
  return arch === "arm64"
    ? "https://ollama.com/download/Ollama-darwin.zip"
    : "https://ollama.com/download/Ollama-darwin-amd64.zip";
}

async function downloadTo(url, dest) {
  const r = await fetch(url, { signal: AbortSignal.timeout(600000) });
  if (!r.ok || !r.body) throw new Error(`download ${r.status}`);
  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    Readable.fromWeb(r.body).pipe(file);
    file.on("finish", resolve);
    file.on("error", reject);
  });
}

function unzipTo(zipPath, destDir) {
  const r = spawnSync("ditto", ["-x", "-k", zipPath, destDir], { encoding: "utf8", timeout: 300000 });
  if (r.status !== 0) throw new Error(`unzip ${r.status}`);
}

async function installEngine() {
  if (BOOTSTRAP_OFF) throw new Error("bootstrapping disabled");
  if (process.platform !== "darwin") {
    throw new Error(
      "Automatic Ollama install is supported on macOS. Install Ollama from https://ollama.com and re-run."
    );
  }
  setStage("install", "Installing local AI engine…", 12, `Fetching the official Ollama build for ${S.arch}.`);
  if (!(await internetUp())) {
    fail("offline", "No internet connection — can't install the local AI engine yet.", "Connect and press Retry.");
    throw new Error("offline");
  }
  if (!(await diskOk())) {
    fail("disk_space", "Not enough free disk space.", `Need ≈ ${Math.round(diskBytesNeeded() / 1024 ** 3)} GB free (engine + ${MODEL} model).`);
    throw new Error("disk_space");
  }
  const url = await ollamaAssetUrl(S.arch);
  const zipPath = path.join(os.tmpdir(), `ollama-${Date.now()}.zip`);
  setStage("install", "Installing local AI engine…", 20, "Downloading engine…");
  await downloadTo(url, zipPath);
  let dest = INSTALL_DIR;
  try {
    unzipTo(zipPath, dest);
  } catch (_) {
    dest = path.join(os.homedir(), "Applications");
    try {
      unzipTo(zipPath, dest);
    } catch (e) {
      try { fs.unlinkSync(zipPath); } catch (_2) { /* ignore */ }
      throw e;
    }
  }
  try { fs.unlinkSync(zipPath); } catch (_) { /* ignore */ }
  setStage("install", "Installing local AI engine…", 25, "Engine installed.");
  S.ollamaInstalled = true;
}

/* ---- top-level flows ---- */
async function ensure() {
  S.enabled = PROVIDER === "ollama" && !BOOTSTRAP_OFF;
  if (!S.enabled) {
    S.phase = "off";
    S.message = "Pulse AI uses the cloud/disabled provider — local auto-setup not active.";
    return S;
  }
  if (process.platform !== "darwin" && !findBin() && !appPresent()) {
    S.phase = "unsupported";
    S.message = "Local Pulse AI connects on macOS or via an installed Ollama. Install Ollama (https://ollama.com) and GRIDPULSE reconnects automatically.";
    return S;
  }
  if (busy) return S;
  busy = true;
  S.error = null;
  S.lastCheck = Date.now();
  try {
    setStage("detect", "Setting up Pulse AI…", 5);
    const up = await ping();
    if (!up.ok && (findBin() || appPresent())) {
      S.ollamaInstalled = true;
      if (!(await startService())) {
        const busyPort = await connectToPort(800);
        fail(
          busyPort ? "port_busy" : "start_failed",
          busyPort ? "Port 11434 is occupied by something else." : "Ollama is installed but won't start.",
          busyPort ? "Close the app using port 11434, or set OLLAMA_HOST, then press Retry." : "Check Activity Monitor for a stuck Ollama process, then press Retry."
        );
        return S;
      }
    } else if (!up.ok) {
      try {
        await installEngine();
        if (!(await startService())) {
          fail("start_failed", "Ollama installed but couldn't be started.", "Open the Ollama app once, then press Retry.");
          return S;
        }
      } catch (e) {
        if (S.error) return S;
        fail("install_failed", "Ollama installation failed.", String((e && e.message) || e));
        return S;
      }
    } else {
      S.ollamaInstalled = true;
      S.ollamaRunning = true;
    }

    const names = await serviceTags();
    S.modelPresent = modelPresentSync(names);
    if (!S.modelPresent) {
      if (!AUTO_PULL) {
        S.phase = "model_required";
        S.message = "Pulse model not downloaded yet.";
        S.detail = "Run npm run ai:setup, or open Ollama and pull llama3:latest.";
        return S;
      }
      try {
        await pullModel();
        S.modelPresent = true;
      } catch (e) {
        fail("model_failed", "Could not download the Pulse model.", `Check your connection, then press Retry (${String((e && e.message) || e)}).`);
        return S;
      }
    }

    try {
      await verify();
    } catch (e) {
      fail("model_failed", "The local AI engine didn't pass the test.", "Open Ollama and confirm llama3:latest is healthy, then press Retry.");
      return S;
    }
    markReady();
    return S;
  } catch (e) {
    if (!S.error) fail("setup_error", "Unexpected error during AI setup.", String((e && e.message) || e));
    return S;
  } finally {
    busy = false;
  }
}

async function recover() {
  if (PROVIDER !== "ollama" || BOOTSTRAP_OFF) return S;
  if (busy) return S;
  if (S.ready) {
    const p = await ping();
    if (p.ok) { S.lastCheck = Date.now(); return S; }
    S.ready = false;
    S.phase = "recovering";
    S.message = "Local AI engine stopped — reconnecting…";
    return ensure();
  }
  return ensure();
}

function status() {
  return {
    enabled: S.enabled,
    provider: PROVIDER,
    model: MODEL,
    ready: S.ready,
    phase: S.phase,
    stage: S.stage,
    percent: S.percent,
    message: S.message,
    detail: S.detail,
    ollamaInstalled: S.ollamaInstalled,
    ollamaRunning: S.ollamaRunning,
    modelPresent: S.modelPresent,
    internet: S.internet,
    arch: S.arch,
    downloadBytes: S.downloadBytes,
    error: S.error,
    lastError: S.lastError,
    lastCheck: S.lastCheck,
    setupAt: S.setupAt,
    readyAt: S.readyAt,
  };
}

function localEnabled() {
  return PROVIDER === "ollama" && !BOOTSTRAP_OFF;
}

function baseUrl() {
  return `${OLLAMA_HOST}/v1`;
}

module.exports = {
  status,
  ensure,
  recover,
  localEnabled,
  baseUrl,
  MODEL,
};