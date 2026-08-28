import { app, BrowserWindow, ipcMain, Menu } from "electron";
import path from "path";
import Store from 'electron-store';

if (process.platform === "linux") {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch("disable-gpu");
  app.commandLine.appendSwitch("disable-gpu-vsync");
}

/* -------------------------------- App Data -------------------------------- */

interface LegacyAppData {
  windowBounds?: WindowBounds;
  userData: UserData;
}

interface WindowState {
  windowBounds: WindowBounds;
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

const legacyStore = new Store<LegacyAppData>();
const windowStore = new Store<WindowState>({
  name: "window-state",
});

const personalDataPath = path.join(app.getPath("userData"), "sync-data");
const userDataStore = new Store<{ userData: UserData }>({
  cwd: personalDataPath,
  name: "user-data",
});
const previousPersonalDataStore = new Store<{ userData: UserData }>({
  cwd: path.join(app.getPath("documents"), "Warframe Tracker"),
  name: "user-data",
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
  const data = userDataStore.get("userData");
  return isUserData(data) ? data : createEmptyUserData();
});
ipcMain.handle("save-user-data", (_event, data: unknown) => {
  if (!isUserData(data)) return false;
  userDataStore.set("userData", data);
  return true;
});
ipcMain.handle("get-user-data-path", () => personalDataPath);

/* ---------------------------- Browser + Preload --------------------------- */

let win: BrowserWindow | null = null;
let isClosing = false;
const iconPath = app.isPackaged
  ? path.join(__dirname, "assets/favicon.png")
  : path.join(process.cwd(), "electron/assets/favicon.png");

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);

  if (!userDataStore.has("userData") && legacyStore.has("userData")) {
    const legacyUserData = legacyStore.get("userData");
    if (isUserData(legacyUserData)) userDataStore.set("userData", legacyUserData);
  }
  if (!userDataStore.has("userData") && previousPersonalDataStore.has("userData")) {
    const previousUserData = previousPersonalDataStore.get("userData");
    if (isUserData(previousUserData)) userDataStore.set("userData", previousUserData);
  }
  if (legacyStore.has("windowBounds") && !windowStore.has("windowBounds")) {
    const legacyWindowBounds = legacyStore.get("windowBounds");
    if (legacyWindowBounds) windowStore.set("windowBounds", legacyWindowBounds);
  }

  const saved = windowStore.get("windowBounds", { width: 1000, height: 700 });
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
    icon: iconPath,
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
        windowStore.set("windowBounds", {
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