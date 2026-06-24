const { app, BrowserWindow, dialog } = require("electron");
const { spawn, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const http = require("http");

const DASH_PORT = 8050;
const DASH_URL = `http://127.0.0.1:${DASH_PORT}`;
const STARTUP_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 300;

let py = null;
let win = null;
let logStream = null;

const stateFile = path.join(app.getPath("userData"), "window-state.json");

function loadWindowState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile, "utf-8"));
  } catch {
    return {};
  }
}

function saveWindowState(win) {
  if (!win) return;
  const bounds = win.getBounds();
  fs.writeFileSync(
    stateFile,
    JSON.stringify({
      ...bounds,
      isMaximized: win.isMaximized(),
    })
  );
}

function getLogPath() {
  const logDir = path.join(app.getPath("userData"), "logs");
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  return path.join(logDir, `backend-${Date.now()}.log`);
}

function log(line) {
  const stamped = `[${new Date().toISOString()}] ${line}`;
  console.log(stamped);
  if (logStream) logStream.write(stamped + "\n");
}

function freePort(port) {
  try {
    if (process.platform === "win32") {
      const out = execSync(`netstat -ano | findstr :${port}`).toString();
      const pids = new Set(
        out
          .split("\n")
          .map((l) => l.trim().split(/\s+/).pop())
          .filter((pid) => pid && /^\d+$/.test(pid))
      );
      for (const pid of pids) {
        try {
          execSync(`taskkill /F /PID ${pid}`);
        } catch {}
      }
    } else {
      const out = execSync(`lsof -ti tcp:${port} || true`).toString().trim();
      if (out) {
        for (const pid of out.split("\n").filter(Boolean)) {
          try {
            execSync(`kill -9 ${pid}`);
          } catch {}
        }
      }
    }
  } catch {}
}

function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve(true);
      });
      req.on("error", () => {
        if (Date.now() > deadline) {
          reject(new Error(`Timed out after ${timeoutMs}ms`));
        } else {
          setTimeout(attempt, POLL_INTERVAL_MS);
        }
      });
      req.setTimeout(2000, () => req.destroy());
    };
    attempt();
  });
}

function killBackend() {
  if (!py || py.killed) return;
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /F /T /PID ${py.pid}`);
    } else {
      process.kill(-py.pid, "SIGKILL");
    }
  } catch (e) {
    log(`kill error: ${e.message}`);
  }
  py = null;
}

function showFatalError(title, message) {
  dialog.showErrorBox(title, message);
}

async function startBackendAndWindow() {
  const logPath = getLogPath();
  logStream = fs.createWriteStream(logPath, { flags: "a" });

  freePort(DASH_PORT);

  py = spawn(
    "uv",
    ["run", "python", path.join(__dirname, "..", "backend", "app.py")],
    {
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  py.stdout.on("data", (d) => log(`[backend] ${d}`));
  py.stderr.on("data", (d) => log(`[backend:err] ${d}`));

  let backendExitedEarly = false;
  py.on("exit", () => {
    backendExitedEarly = true;
  });

  try {
    await waitForServer(DASH_URL, STARTUP_TIMEOUT_MS);
  } catch (err) {
    killBackend();
    showFatalError("Dash failed to start", err.message);
    app.quit();
    return;
  }

  const state = loadWindowState();

  win = new BrowserWindow({
    x: state.x,
    y: state.y,
    width: state.width || 1280,
    height: state.height || 800,
    icon: path.join(__dirname, "assets", "favicon.ico"),
  });

  if (state.isMaximized) win.maximize();

  win.loadURL(DASH_URL);

  ["resize", "move", "close"].forEach((event) => {
    win.on(event, () => saveWindowState(win));
  });

  win.on("closed", () => (win = null));
}

app.whenReady().then(startBackendAndWindow);

app.on("window-all-closed", () => {
  killBackend();
  app.quit();
});

app.on("before-quit", () => {
  killBackend();
});

process.on("uncaughtException", (err) => {
  log(err.stack || err.message);
  killBackend();
  app.quit();
});