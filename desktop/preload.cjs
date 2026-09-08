/* GRIDPULSE Desktop — preload bridge for the Setup guide screen. */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("gridpulse", {
  health: () => ipcRenderer.invoke("health"),
  openDashboard: () => ipcRenderer.invoke("open-dashboard"),
  openSetup: () => ipcRenderer.invoke("open-setup"),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  openAppFolder: () => ipcRenderer.invoke("open-app-folder"),
  getPort: () => ipcRenderer.invoke("get-port"),
});