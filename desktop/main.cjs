/* ------------------------------------------------------------------ */
/*  GRIDPULSE Desktop — main process.                                  */
/*  Bundles the backend (Express + OCPP CSMS + protocol simulators)     */
/*  and the built web UI, so a non-technical user just double-clicks    */
/*  the app. No Node.js install required — Electron ships its own.      */
/* ------------------------------------------------------------------ */
const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const os = require("os");
const net = require("net");
const { autoUpdater } = require("electron-updater");

/* ---- resolve bundled assets in dev vs packaged ---- */
const isPackaged = !!app.isPackaged;
const RES = isPackaged ? process.resourcesPath : path.join(__dirname, "..");
const WEB_DIR = isPackaged ? path.join(RES, "web") : path.join(__dirname, "..", "frontend", "dist");
const SCRIPTS_DIR = isPackaged ? path.join(RES, "scripts") : path.join(__dirname, "..", "scripts");

/* Help Node resolve the backend's deps when the backend lives under
   Resources (packaged) instead of alongside a node_modules folder. */
process.env.NODE_PATH =
  path.join(__dirname, "node_modules") + (process.env.NODE_PATH ? path.delimiter + process.env.NODE_PATH : "");
require("module").Module._initPaths();

async function findFreePort(start) {
  const used = new Set();
  try {
    const res = await fetch("http://127.0.0.1:4000/api/health", { signal: AbortSignal.timeout(900) });
    if (res.ok) used.add(4000);
  } catch (_) { /* not in use */ }
  for (let p = start; p < start + 12; p++) {
    if (used.has(p)) continue;
    const free = await new Promise((resolve) => {
      const srv = net.createServer();
      srv.once("error", () => resolve(false));
      srv.once("listening", () => srv.close(() => resolve(true)));
      srv.listen(p, "127.0.0.1");
    });
    if (free) return p;
  }
  return start;
}

/* ---- controllers for the child simulators ---- */
const simProcs = new Map();
function spawnSims(port) {
  const nodeBin = process.execPath;
  const baseArgs = ["--no-warnings"];
  const env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1",
    GRIDPULSE_EGRESS: `ws://127.0.0.1:${port}`,
    API_URL: `http://127.0.0.1:${port}`,
    NODE_PATH: process.env.NODE_PATH || "",
    ANPR_DEMO: process.env.ANPR_DEMO || "on",
  };
  const specs = [
    { key: "ocpp", script: "ocpp-sim.js", args: [`ws://127.0.0.1:${port}`] },
    { key: "modbus", script: "modbus-sim.js", args: ["5000"] },
    { key: "ven", script: "ven-node.js", args: [] },
    { key: "ingest", script: "ingest-bridges.js", args: [] },
  ];
  for (const spec of specs) {
    const scriptPath = path.join(SCRIPTS_DIR, spec.script);
    if (!fs.existsSync(scriptPath)) { console.log(`[desktop] sim missing: ${spec.script}`); continue; }
    const child = spawn(nodeBin, [...baseArgs, scriptPath, ...spec.args], {
      env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    child.stdout.on("data", (d) => console.log(`[sim:${spec.key}] ${String(d).trim()}`));
    child.stderr.on("data", (d) => console.error(`[sim:${spec.key}] ${String(d).trim()}`));
    child.on("exit", (code) => { console.log(`[sim:${spec.key}] exited (${code})`); simProcs.delete(spec.key); });
    simProcs.set(spec.key, child);
  }
}

/* ---- backend lifecycle ---- */
let port = 0;
let serverStarting = false;
async function ensureServer() {
  if (serverStarting) return port;
  serverStarting = true;
  port = Number(process.env.GRIDPULSE_PORT) || (await findFreePort(4100));
  process.env.PORT = String(port);
  process.env.GRIDPULSE_DIST = WEB_DIR;
  process.env.GRIDPULSE_EGRESS = `ws://127.0.0.1:${port}`;
  console.log(`[desktop] starting bundled GRIDPULSE backend on port ${port}...`);
  try {
    require(path.join(RES, "backend", "server.js"));
  } catch (err) {
    console.error("[desktop] backend failed to start:", err);
  }
  return port;
}

async function waitHealthy(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(800) });
      if (res.ok) return true;
    } catch (_) { /* keep waiting */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

/* ---- windows ---- */
let mainWindow = null;

function firstRun() {
  try {
    const f = path.join(app.getPath("userData"), "setup-done.json");
    if (fs.existsSync(f)) return false;
    fs.writeFileSync(f, JSON.stringify({ at: Date.now() }));
    return true;
  } catch (_) {
    return false;
  }
}

function openDashboard() {
  if (!mainWindow) return;
  mainWindow.loadURL(`http://127.0.0.1:${port}`);
}

function showSetup() {
  if (!mainWindow) return;
  mainWindow.loadFile(path.join(__dirname, "setup.html"));
}

/* ---------------------------------------------------------------- */
/*  Auto-update via electron-updater (GitHub Releases)               */
/*  Only runs in the packaged app — dev mode never checks.           */
/* ---------------------------------------------------------------- */
autoUpdater.autoDownload = true;
let updateChecking = false;
let updateEvent = null; // { state, version, percent, error }

function setUpdateEvent(partial) {
  updateEvent = { ...updateEvent, ...partial };
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update:event", updateEvent);
  }
}

function configureUpdater() {
  // Point the updater at this project's GitHub Releases feed. This mirrors
  // the build.publish config in desktop/package.json.
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.setFeedURL({
    provider: "github",
    owner: "abhinandanhota5-code",
    repo: "gridpulse",
    releaseType: "release",
  });
}

function checkForUpdates(manual = false) {
  if (!isPackaged) {
    if (manual) { dialog.showMessageBox(mainWindow, { type: "info", message: "Auto-update is disabled in the dev build." }); }
    return;
  }
  if (updateChecking) return;
  updateChecking = true;
  configureUpdater();
  setUpdateEvent({ state: "checking" });
  autoUpdater.checkForUpdatesAndNotify()
    .catch((err) => {
      updateChecking = false;
      setUpdateEvent({ state: "error", error: String(err && err.message || err) });
      if (manual) dialog.showErrorBox("Update check failed", String(err && err.message || err));
    });
}

autoUpdater.on("checking-for-update", () => setUpdateEvent({ state: "checking" }));
autoUpdater.on("update-available", (info) => {
  setUpdateEvent({ state: "available", version: info.version });
  console.log(`[desktop] update available: ${info.version}`);
});
autoUpdater.on("update-not-available", (info) => {
  updateChecking = false;
  setUpdateEvent({ state: "up-to-date", version: info.version });
  if (mainWindow && !mainWindow.isDestroyed()) {
    dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "GRIDPULSE",
      message: `You’re on the latest version (${app.getVersion()}).`,
    }).catch(() => { /* ignore */ });
  }
});
autoUpdater.on("download-progress", (p) => setUpdateEvent({ state: "downloading", percent: Math.round(p.percent) }));
autoUpdater.on("update-downloaded", (info) => {
  updateChecking = false;
  setUpdateEvent({ state: "downloaded", version: info.version });
  mainWindow && !mainWindow.isDestroyed() &&
    dialog.showMessageBox(mainWindow, {
      type: "question",
      title: "GRIDPULSE update ready",
      message: `Version ${info.version} is ready to install.`,
      detail: "Restart GRIDPULSE now to apply the update?",
      buttons: ["Restart now", "Later"],
      defaultId: 0,
      cancelId: 1,
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    }).catch(() => { /* ignore */ });
});
autoUpdater.on("error", (err) => {
  updateChecking = false;
  setUpdateEvent({ state: "error", error: String(err && err.message || err) });
  console.error("[desktop] auto-update error:", err);
});

function buildMenu() {
  const isMac = process.platform === "darwin";
  const template = [
    ...(isMac ? [{ role: "appMenu" }] : []),
    {
      label: "GRIDPULSE",
      submenu: [
        { label: "Open dashboard", click: openDashboard },
        { label: "Setup guide", click: showSetup },
        { label: "Check for updates…", click: () => checkForUpdates(true) },
        { type: "separator" },
        { label: "Open in browser", click: () => shell.openExternal(`http://127.0.0.1:${port}`) },
        { label: "Open app folder", click: () => shell.openPath(path.dirname(app.getAppPath())) },
        { type: "separator" },
        { role: isMac ? "close" : "quit" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "togglefullscreen" },
        { role: "toggleDevTools" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function createWindows() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1040,
    minHeight: 700,
    title: "GRIDPULSE",
    backgroundColor: "#0b1017",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.on("closed", () => { mainWindow = null; });

  await ensureServer();
  const healthy = await waitHealthy(15000);
  console.log(`[desktop] backend healthy: ${healthy}`);

  if (healthy) spawnSims(port);
  if (process.env.GRIDPULSE_SMOKE === "1") {
    await new Promise((r) => setTimeout(r, 4000));
    const h = await collectHealth();
    console.log("[smoke] " + JSON.stringify(h));
    app.exit(h.ok ? 0 : 1);
    return;
  }
  if (healthy && !firstRun()) openDashboard();
  else if (healthy) showSetup();
  else mainWindow.loadURL(`data:text/html,<html><body style="background:#0b1017;color:#fff;font-family:sans-serif;padding:40px"><h2>GRIDPULSE failed to start</h2><p>The bundled gateway did not become healthy. Open the Setup guide for next steps (port ${port}).</p></body></html>`);
}

/* ---- IPC for the setup guide ---- */
async function collectHealth() {
  const report = { port, os: `${process.platform} ${os.release()}`, arch: process.arch, ok: false };
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(2000) });
    const body = await res.json();
    report.ok = res.ok;
    report.health = body.status;
  } catch (_) { report.ok = false; report.health = "unreachable"; }

  let live = null;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/live`, { signal: AbortSignal.timeout(2000) });
    live = await res.json();
  } catch (_) { /* offline */ }
  report.feeds = live
    ? Object.keys(live.sources || {}).map((k) => ({
        key: k,
        name: live.sources[k].name,
        status: live.sources[k].status,
        count: live.sources[k].count,
      }))
    : [];

  // Internet reachability: the live-weather proxy is the cheapest, most real check.
  report.online = null;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/weather?lat=12.9165&lon=79.1325`, { signal: AbortSignal.timeout(3000) });
    const wx = await res.json();
    report.online = wx.source === "open-meteo";
  } catch (_) { report.online = false; }

  report.runtime = {
    bundled: true,
    node: process.versions.node,
    electron: process.versions.electron,
  };
  return report;
}
ipcMain.handle("health", () => collectHealth());
ipcMain.handle("open-dashboard", () => openDashboard());
ipcMain.handle("open-setup", () => showSetup());
ipcMain.handle("open-external", (_e, url) => shell.openExternal(url));
ipcMain.handle("open-app-folder", () => shell.openPath(path.dirname(app.getAppPath())));
ipcMain.handle("get-port", () => port);
ipcMain.handle("check-for-updates", () => checkForUpdates(true));
ipcMain.handle("get-update-status", () => updateEvent);

app.whenReady().then(async () => { buildMenu(); await createWindows(); });

// Kick off a background auto-update check once the backend is healthy.
setTimeout(() => {
  try { checkForUpdates(false); } catch (err) { console.error("[desktop] auto-update init failed:", err); }
}, 8000);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindows();
});

app.on("will-quit", () => {
  for (const child of simProcs.values()) { try { child.kill(); } catch (_) { /* ignore */ } }
});

app.on("before-quit", async (e) => {
  // Tidy up child simulators so no orphaned processes keep ports busy.
  if (simProcs.size) {
    e.preventDefault();
    for (const child of simProcs.values()) { try { child.kill("SIGTERM"); } catch (_) { /* ignore */ } }
    setTimeout(() => { simProcs.clear(); app.quit(); }, 400);
  }
});