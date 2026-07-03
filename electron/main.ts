import { app, BrowserWindow, ipcMain } from "electron";
import Items from "@wfcd/items";
import path from "path";
import Store from 'electron-store';

/* ------------------------- Mastery Checklist Items ------------------------ */

let warframesCache: any[] | null = null;
let primariesCache: any[] | null = null;
let secondariesCache: any[] | null = null;
let meleeCache: any[] | null = null;
let archwingCache: any[] | null = null;
let companionsCache: any[] | null = null;

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

ipcMain.handle('get-secondaries', async () => {
  if (!secondariesCache) {
    const items = new Items({ category: ["Secondary"] });
    secondariesCache = items.filter((i: any) => (i.category === "Secondary") && (!unique_name_blacklist.includes(i.uniqueName)))
  }
  return secondariesCache;
})

ipcMain.handle('get-melee', async () => {
  if (!meleeCache) {
    const items = new Items({ category: ["Melee"] });
    meleeCache = items.filter((i: any) => (i.category === "Melee") && (!unique_name_blacklist.includes(i.uniqueName)))
  }
  return meleeCache;
})

ipcMain.handle('get-archwing', async () => {
  if (!archwingCache) {
    const items = new Items({ category: ["Archwing", "Arch-Gun", "Arch-Melee"] });
    archwingCache = items.filter((i: any) => !unique_name_blacklist.includes(i.uniqueName))
  }
  return archwingCache;
})

ipcMain.handle('get-companions', async () => {
  if (!companionsCache) {
    const items = new Items({ category: ["Pets", "Sentinels", "SentinelWeapons"] });
    companionsCache = items.filter((i: any) => !unique_name_blacklist.includes(i.uniqueName))
  }
  return companionsCache;
})

/* -------------------------------- App Data -------------------------------- */

interface AppData {
  masteryProgress: { selectedComponents: Record<string, true> };
}

const store = new Store<AppData>({
  defaults: { masteryProgress: { selectedComponents: {} } },
});

ipcMain.handle("get-progress", () => store.get("masteryProgress"));  // Get all progression
ipcMain.handle("toggle-component", (_e, parentId: string, componentId: string) => {  // ?
  const progress = store.get("masteryProgress");
  const key = `${parentId}:${componentId}`;
  const selected = { ...progress.selectedComponents };
  selected[key] ? delete selected[key] : (selected[key] = true);
  const updated = { selectedComponents: selected };
  store.set("masteryProgress", updated);
  return updated;
});

/* ---------------------------- Browser + Preload --------------------------- */

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