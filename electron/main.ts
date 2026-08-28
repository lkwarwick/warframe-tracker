import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import Store from 'electron-store';

/* -------------------------------- App Data -------------------------------- */

interface AppData {
  // Misc
  windowBounds: WindowBounds;
  userData: UserData;
}

interface UserData {
  mastered: Record<string, true>;
  components: Record<string, number>;
  settings: Record<string, unknown>;
  updatedAt: string;
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
    // Misc
    windowBounds: { width: 1000, height: 700 },
    userData: {
      mastered: {},
      components: {},
      settings: {},
      updatedAt: new Date().toISOString(),
    },
  },
});

function isUserData(value: unknown): value is UserData {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<UserData>;
  return !!data.mastered && typeof data.mastered === "object"
    && !!data.components && typeof data.components === "object"
    && !!data.settings && typeof data.settings === "object"
    && typeof data.updatedAt === "string";
}

function createEmptyUserData(): UserData {
  return {
    mastered: {},
    components: {},
    settings: {},
    updatedAt: new Date().toISOString(),
  };
}

ipcMain.handle("load-user-data", () => {
  const data = store.get("userData");
  return isUserData(data) ? data : createEmptyUserData();
});
ipcMain.handle("save-user-data", (_event, data: unknown) => {
  if (!isUserData(data)) return false;
  store.set("userData", data);
  return true;
});

/* ---------------------------- Browser + Preload --------------------------- */

let win: BrowserWindow | null = null;
let isClosing = false;

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
    if (isClosing) return;
    if (!win) return;
    isClosing = true;
    e.preventDefault();

    // Ask renderer to save; wait for a response or timeout
    const waitForSave = new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, 2000);

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

  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
});