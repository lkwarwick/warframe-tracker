import { app, BrowserWindow, ipcMain, Menu } from "electron";
import fs from "fs";
import { promises as fsPromises } from "fs";
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

const screenshotExtensions = new Set([".jpg", ".jpeg", ".png"]);
const screenshotWatchers: fs.FSWatcher[] = [];
const pendingScreenshots = new Set<string>();
let screenshotDirectories: string[] = [];

function isScreenshotPath(filePath: string): boolean {
  return screenshotExtensions.has(path.extname(filePath).toLowerCase());
}

function isWatchedScreenshotPath(filePath: string): boolean {
  const resolvedPath = path.resolve(filePath);
  return screenshotDirectories.some((directory) => path.dirname(resolvedPath) === directory);
}

async function sendScreenshot(filePath: string): Promise<void> {
  if (!win || win.isDestroyed() || pendingScreenshots.has(filePath)) return;
  pendingScreenshots.add(filePath);

  try {
    let previousSize = -1;
    let file: Buffer | undefined;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const stats = await fsPromises.stat(filePath);
      if (stats.size > 0 && stats.size === previousSize) {
        file = await fsPromises.readFile(filePath);
        break;
      }
      previousSize = stats.size;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!file) return;

    const extension = path.extname(filePath).toLowerCase();
    const mimeType = extension === ".png" ? "image/png" : "image/jpeg";
    win.webContents.send("screenshot-created", {
      path: filePath,
      dataUrl: `data:${mimeType};base64,${file.toString("base64")}`,
    });
  } catch (_) {
    // The file may have been moved or deleted before it finished writing.
  } finally {
    pendingScreenshots.delete(filePath);
  }
}

function startScreenshotWatcher(): void {
  const picturesPath = app.getPath("pictures");
  const homePath = app.getPath("home");
  const configuredPath = process.env.WARFRAME_SCREENSHOT_DIR;
  const protonScreenshotDirectories = [
    path.join(homePath, ".steam", "steam", "steamapps/compatdata/230410/pfx/drive_c/users/steamuser/Pictures/Warframe"),
    path.join(homePath, ".steam", "debian-installation/steamapps/compatdata/230410/pfx/drive_c/users/steamuser/Pictures/Warframe"),
    path.join(homePath, ".local", "share/Steam/steamapps/compatdata/230410/pfx/drive_c/users/steamuser/Pictures/Warframe"),
  ];
  const directories = [
    configuredPath,
    path.join(picturesPath, "Warframe"),
    path.join(picturesPath, "Screenshots"),
    picturesPath,
    ...protonScreenshotDirectories,
  ].filter((directory): directory is string => Boolean(directory));
  screenshotDirectories = [...new Set(directories.filter((directory) => fs.existsSync(directory)))];

  for (const directory of screenshotDirectories) {
    try {
      const watcher = fs.watch(directory, (_eventType, filename) => {
        if (!filename) return;
        const filePath = path.join(directory, filename.toString());
        if (isScreenshotPath(filePath)) void sendScreenshot(filePath);
      });
      screenshotWatchers.push(watcher);
    } catch (_) {
      // A missing or inaccessible screenshot directory should not stop startup.
    }
  }
}

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
ipcMain.handle("delete-screenshot", async (_event, filePath: unknown) => {
  if (typeof filePath !== "string" || !isScreenshotPath(filePath) || !isWatchedScreenshotPath(filePath)) {
    return false;
  }

  try {
    await fsPromises.unlink(path.resolve(filePath));
    return true;
  } catch (_) {
    return false;
  }
});

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

  startScreenshotWatcher();
});