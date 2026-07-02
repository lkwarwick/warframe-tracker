"use strict";
const electron = require("electron");
const Items = require("@wfcd/items");
const path = require("path");
let warframesCache = null;
electron.ipcMain.handle("get-warframes", async () => {
  if (!warframesCache) {
    const items = new Items({ category: ["Warframes"] });
    warframesCache = items.filter((w) => w.category === "Warframes");
  }
  return warframesCache;
});
electron.app.whenReady().then(() => {
  new electron.BrowserWindow({
    width: 1e3,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  }).loadURL("http://localhost:5173");
});
