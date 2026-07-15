import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import Store from 'electron-store';

/* -------------------------------- App Data -------------------------------- */

interface AppData {
  // Warframe
  mastered: Record<string, true>;
  components: Record<string, number>;
  // Misc
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
    // Warframe
    mastered: {},
    components: {},
    // Misc
    windowBounds: { width: 1000, height: 700 },
  },
});

/* ------------------------------ Save Data API ----------------------------- */

ipcMain.handle("get-mastered", () => store.get("mastered"));

ipcMain.handle("toggle-mastered", (_e, uniqueName: string) => {
  // Grab local copy
  const mastered = store.get("mastered");

  // Remove if present
  if (mastered[uniqueName]) {
    const { [uniqueName]: _, ...rest } = mastered;
    store.set("mastered", rest);
    return rest;
  }

  // Add if missing
  const updated = { ...mastered, [uniqueName]: true };
  store.set("mastered", updated);
  return updated;
});

const getComponents = () => store.get("components");

const setComponents = (updated: Record<string, number>) => {
  store.set("components", updated);
  return updated;
};

ipcMain.handle("get-components", () => getComponents());

ipcMain.handle("increment-component", (_e, uniqueName: string) => {
  const components = getComponents();
  const next = (components[uniqueName] ?? 0) + 1;
  return setComponents({ ...components, [uniqueName]: next });
});

ipcMain.handle("decrement-component", (_e, uniqueName: string) => {
  const components = getComponents();
  const next = (components[uniqueName] ?? 0) - 1;
  const { [uniqueName]: _, ...rest } = components;
  return setComponents(next > 0 ? { ...components, [uniqueName]: next } : rest);
});

ipcMain.handle("set-component", (_e, uniqueName: string, value: number) => {
  const components = getComponents();
  if (value <= 0) {
    const { [uniqueName]: _, ...rest } = components;
    return setComponents(rest);
  }
  return setComponents({ ...components, [uniqueName]: value });
});

ipcMain.handle("remove-component", (_e, uniqueName: string) => {
  const { [uniqueName]: _, ...rest } = getComponents();
  return setComponents(rest);
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

  win.on("close", (e) => {
    if (!win) return;
    // Prevent default close so we can attempt to flush save to remote gist
    e.preventDefault();

    // Ask renderer to save; wait for a response or timeout
    const waitForSave = new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, 5000);

      ipcMain.once("force-save-result", (_evt, result: boolean) => {
        clearTimeout(timeout);
        resolve(Boolean(result));
      });

      try {
        win?.webContents.send("force-save");
      } catch (_) {
        // ignore send errors
      }
    });

    void (async () => {
      try {
        await waitForSave;
      } finally {
        // Persist window bounds locally (electron-store)
        const b = win!.getNormalBounds();
        store.set("windowBounds", {
          x: b.x,
          y: b.y,
          width: b.width,
          height: b.height,
          isMaximized: win!.isMaximized(),
        });

        // Remove this handler and close the window for real
        win!.removeAllListeners("close");
        win!.close();
      }
    })();
  });

  win.loadURL("http://localhost:5173");
});