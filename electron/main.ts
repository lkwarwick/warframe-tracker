import { app, BrowserWindow, ipcMain } from "electron";
import Items from "@wfcd/items";
import path from "path";

let warframesCache: any[] | null = null;

ipcMain.handle('get-warframes', async () => {
  if (!warframesCache) {
    const items = new Items({ category: ['Warframes'] });
    warframesCache = items.filter((w: any) => w.category === 'Warframes');
  }
  return warframesCache;
});

app.whenReady().then(() => {
  new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  }).loadURL("http://localhost:5173");
});