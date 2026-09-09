/* GRIDPULSE Desktop — preload bridge for the Setup guide screen. */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("gridpulse", {
  health: () => ipcRenderer.invoke("health"),
  openDashboard: () => ipcRenderer.invoke("open-dashboard"),
  openSetup: () => ipcRenderer.invoke("open-setup"),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  openAppFolder: () => ipcRenderer.invoke("open-app-folder"),
  getPort: () => ipcRenderer.invoke("get-port"),
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  getUpdateStatus: () => ipcRenderer.invoke("get-update-status"),
  onUpdateEvent: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on("update:event", listener);
    return () => ipcRenderer.removeListener("update:event", listener);
  },
});