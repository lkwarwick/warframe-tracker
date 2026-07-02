import { app, BrowserWindow, ipcMain } from "electron";
import Items from "@wfcd/items";
import path from "path";

let warframesCache: any[] | null = null;
let primariesCache: any[] | null = null;

const unique_name_blacklist: string[] = [
  "/Lotus/Powersuits/PowersuitAbilities/Helminth",  // Not an actual Item
  "/Lotus/Powersuits/SiriusOrion/OrionSuit",  // Game uses "SiriusSuit"
  "/Lotus/Powersuits/Excalibur/ExcaliburPrime",  // Founders
  "/Lotus/Weapons/Tenno/Pistol/LatoPrime",  // Founders
  "/Lotus/Weapons/Tenno/Melee/LongSword/SkanaPrime",  // Founders
  "/Lotus/Weapons/Tenno/Grimoire/TnDoppelgangerGrimoire",  // Doppelganger Grimoire
];

ipcMain.handle('get-warframes', async () => {
  if (!warframesCache) {
    const items = new Items({ category: ['Warframes'] });
    warframesCache = items.filter((w: any) => (w.category === 'Warframes') && (!unique_name_blacklist.includes(w.uniqueName)));
  }
  return warframesCache;
});

ipcMain.handle('get-primaries', async () => {
  if (!primariesCache) {
    const items = new Items({ category: ["Primary"] });
    primariesCache = items.filter((i: any) => (i.category === "Primary") && (!unique_name_blacklist.includes(i.uniqueName)))
  }
  return primariesCache;
})

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