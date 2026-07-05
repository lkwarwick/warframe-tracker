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
  selectedComponents: Record<string, true>;
  primeParts: Record<string, number>;
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
    selectedComponents: {},
    primeParts: {},
    windowBounds: { width: 1000, height: 700 },
  },
});

ipcMain.handle("get-progress", () => store.get("selectedComponents"));  // Get all progression

ipcMain.handle("toggle-component", (_e, parentId: string, componentId: string) => {
  const selected = { ...store.get("selectedComponents") };
  const key = `${parentId}:${componentId}`;
  selected[key] ? delete selected[key] : (selected[key] = true);
  store.set("selectedComponents", selected);
  return selected;
});

ipcMain.handle("get-prime-parts", () => store.get("primeParts"));  // Get all prime parts

ipcMain.handle("increment-prime-part", (_e, partId: string) => {
  const parts = store.get("primeParts");
  const next = (parts[partId] ?? 0) + 1;
  const updated = { ...parts, [partId]: next };
  store.set("primeParts", updated);
  return updated;
});

ipcMain.handle("decrement-prime-part", (_e, partId: string) => {
  const parts = store.get("primeParts");
  const next = (parts[partId] ?? 0) - 1;
  const { [partId]: _, ...rest } = parts;
  const updated = next > 0 ? { ...parts, [partId]: next } : rest;
  store.set("primeParts", updated);
  return updated;
});

ipcMain.handle("remove-prime-part", (_e, partId: string) => {
  const parts = store.get("primeParts");
  const { [partId]: _, ...rest } = parts;
  store.set("primeParts", rest);
  return rest;
});

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