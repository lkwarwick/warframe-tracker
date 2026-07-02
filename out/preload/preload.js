"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("api", {
  getWarframes: () => electron.ipcRenderer.invoke("get-warframes")
});
