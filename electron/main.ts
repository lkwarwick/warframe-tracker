import { app, BrowserWindow, ipcMain, screen } from "electron";
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
    warframesCache = items.filter((w: any) => (w.category === 'Warframes') && (!unique_name_blacklist.includes(w.uniqueName)) && (w.masterable));
  }
  return warframesCache;
});

ipcMain.handle('get-primaries', async () => {
  if (!primariesCache) {
    const items = new Items({ category: ["Primary"] });
    primariesCache = items.filter((i: any) => (i.category === "Primary") && (!unique_name_blacklist.includes(i.uniqueName)) && (i.masterable))
  }
  return primariesCache;
})

ipcMain.handle('get-secondaries', async () => {
  if (!secondariesCache) {
    const items = new Items({ category: ["Secondary"] });
    secondariesCache = items.filter((i: any) => (i.category === "Secondary") && (!unique_name_blacklist.includes(i.uniqueName)) && (i.masterable))
  }
  return secondariesCache;
})

ipcMain.handle('get-melee', async () => {
  if (!meleeCache) {
    const items = new Items({ category: ["Melee"] });
    meleeCache = items.filter((i: any) => (i.category === "Melee") && (!unique_name_blacklist.includes(i.uniqueName)) && (i.masterable))
  }
  return meleeCache;
})

ipcMain.handle('get-archwing', async () => {
  if (!archwingCache) {
    const items = new Items({ category: ["Archwing", "Arch-Gun", "Arch-Melee"] });
    archwingCache = items.filter((i: any) => !unique_name_blacklist.includes(i.uniqueName) && (i.masterable))
  }
  return archwingCache;
})

ipcMain.handle('get-companions', async () => {
  if (!companionsCache) {
    const items = new Items({ category: ["Pets", "Sentinels", "SentinelWeapons"] });
    companionsCache = items.filter((i: any) => !unique_name_blacklist.includes(i.uniqueName) && (i.masterable))
  }
  return companionsCache;
})

/* -------------------------------- App Data -------------------------------- */

interface AppData {
  masteryProgress: { selectedComponents: Record<string, true> };
  primeJunk: { primeParts: Record<string, number> };
  windowBounds: WindowBounds;
}

interface WindowBounds {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized?: boolean;
}

const store = new Store<AppData>({
  defaults: { 
    masteryProgress: { selectedComponents: {} },
    primeJunk: { primeParts: {} },
    windowBounds: { width: 1000, height: 700 },
  },
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
ipcMain.handle("get-prime-parts", () => store.get("primeJunk").primeParts);  // Get all prime parts
ipcMain.handle("increment-prime-part", (_e, partId: string) => {
  const primeJunk = store.get("primeJunk") ?? { primeParts: {} };
  const current = primeJunk.primeParts?.[partId] ?? 0;
  const next = current + 1;
  const updatedParts = { ...primeJunk.primeParts, [partId]: next };
  store.set("primeJunk", { primeParts: updatedParts });
  return updatedParts;
});
ipcMain.handle("decrement-prime-part", (_e, partId: string) => {
  const primeJunk = store.get("primeJunk") ?? { primeParts: {} };
  const current = primeJunk.primeParts?.[partId] ?? 0;
  const next = current - 1;
  const { [partId]: _, ...rest } = primeJunk.primeParts;
  const updatedParts =
    next > 0 ? { ...primeJunk.primeParts, [partId]: next } : rest;
  store.set("primeJunk", { primeParts: updatedParts });
  return updatedParts;
});
ipcMain.handle("remove-prime-part", (_e, partId: string) => {
  const primeJunk = store.get("primeJunk") ?? { primeParts: {} };
  const { [partId]: _, ...rest } = primeJunk.primeParts;
  store.set("primeJunk", { primeParts: rest });
  return rest;
});

console.log('electron-store path:', store.path);

/* ---------------------------- Browser + Preload --------------------------- */

let win: BrowserWindow | null = null;

app.whenReady().then(() => {
  const saved = store.get("windowBounds");
  const x = typeof saved.x === "number" ? saved.x : undefined;
  const y = typeof saved.y === "number" ? saved.y : undefined;

  win = new BrowserWindow({
    width: saved.width ?? 1000,
    height: saved.height ?? 700,
    x,
    y,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: "Warframe Tracker",
    icon: path.join(__dirname, "assets/favicon.png"),
  });

  if (saved.isMaximized) win.maximize();
  win.once("ready-to-show", () => win?.show());

  win.on("close", () => {
    if (!win) return;
    const b = win.getNormalBounds();
    store.set("windowBounds", {
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.height,
      isMaximized: win.isMaximized(),
    });
  });

  win.loadURL("http://localhost:5173");
});