// Preload bridge for safe access to local app data.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("easySearch", {
  readJson(relativePath) {
    return ipcRenderer.invoke("easy-search:read-json", relativePath);
  }
});
