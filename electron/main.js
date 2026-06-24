const { app, BrowserWindow, dialog } = require("electron");
const { spawn, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const http = require("http");

const DASH_PORT = 8050;
const DASH_URL = `http://127.0.0.1:${DASH_PORT}`;
const STARTUP_TIMEOUT_MS = 30_000; // how long to wait for Dash before giving up
const POLL_INTERVAL_MS = 300;

let py = null;
let win = null;
let logStream = null;

// ---------------------------------------------------------------------------
// Logging — writes to a file under userData/logs AND the console, so you have
// a real trace to look at instead of guessing why the window is blank.
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Free the port before we even try to start Dash. This is what actually
// fixes "something is already on 8050" — we don't rely on the previous run
// having shut itself down cleanly.
// ---------------------------------------------------------------------------
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
        log(`Port ${port} was held by PID ${pid}, killing it.`);
        try {
          execSync(`taskkill /F /PID ${pid}`);
        } catch {}
      }
    } else {
      const out = execSync(`lsof -ti tcp:${port} || true`).toString().trim();
      if (out) {
        for (const pid of out.split("\n").filter(Boolean)) {
          log(`Port ${port} was held by PID ${pid}, killing it.`);
          try {
            execSync(`kill -9 ${pid}`);
          } catch {}
        }
      }
    }
  } catch {
    // No process found listening on the port — nothing to clean up.
  }
}

// ---------------------------------------------------------------------------
// Poll the actual HTTP endpoint instead of guessing with a fixed delay.
// Resolves as soon as Dash answers, rejects if it never does within timeoutMs.
// ---------------------------------------------------------------------------
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
          reject(new Error(`Timed out after ${timeoutMs}ms waiting for ${url}`));
        } else {
          setTimeout(attempt, POLL_INTERVAL_MS);
        }
      });
      req.setTimeout(2000, () => req.destroy());
    };
    attempt();
  });
}

// ---------------------------------------------------------------------------
// Kill the backend AND any children it spawned (e.g. Dash's debug reloader
// process), instead of one HTTP POST to a shutdown route that may not even
// exist anymore in current Werkzeug.
// ---------------------------------------------------------------------------
function killBackend() {
  if (!py || py.killed) return;
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /F /T /PID ${py.pid}`);
    } else {
      process.kill(-py.pid, "SIGKILL"); // negative pid = whole process group
    }
  } catch (e) {
    log(`Error killing backend: ${e.message}`);
  }
  py = null;
}

function showFatalError(title, message) {
  dialog.showErrorBox(title, message);
}

async function startBackendAndWindow() {
  const logPath = getLogPath();
  logStream = fs.createWriteStream(logPath, { flags: "a" });

  log(`Freeing port ${DASH_PORT} if it's already in use…`);
  freePort(DASH_PORT);

  log("Starting Dash backend…");
  py = spawn(
    "uv",
    ["run", "python", path.join(__dirname, "..", "backend", "app.py")],
    {
      // On POSIX, give it its own process group (negative-pid kill below
      // then takes out any subprocesses it spawns, e.g. a debug reloader).
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  py.stdout.on("data", (d) => log(`[backend] ${d.toString().trimEnd()}`));
  py.stderr.on("data", (d) => log(`[backend:err] ${d.toString().trimEnd()}`));

  let backendExitedEarly = false;
  py.on("error", (err) => {
    log(`Failed to spawn backend: ${err.message}`);
  });
  py.on("exit", (code, signal) => {
    backendExitedEarly = true;
    log(`Backend process exited early (code=${code}, signal=${signal}).`);
  });

  try {
    await waitForServer(DASH_URL, STARTUP_TIMEOUT_MS);
  } catch (err) {
    log(`Dash did not come up in time: ${err.message}`);
    killBackend();
    showFatalError(
      "Dash failed to start",
      `The Plotly Dash backend did not respond at ${DASH_URL} within ` +
        `${STARTUP_TIMEOUT_MS / 1000}s.\n\n` +
        (backendExitedEarly
          ? "The backend process exited before the server came up — check the log below for the Python traceback.\n\n"
          : "The backend process is still running but never started listening — it may be hung.\n\n") +
        `Log file: ${logPath}\n\n` +
        `If this keeps happening, a previous run's Python process may still be ` +
        `holding port ${DASH_PORT}. This app tries to free it automatically on ` +
        `launch, but you can check manually with ` +
        `${
          process.platform === "win32"
            ? `"netstat -ano | findstr :${DASH_PORT}"`
            : `"lsof -i :${DASH_PORT}"`
        }.`
    );
    app.quit();
    return;
  }

  log("Dash responded successfully — opening window.");
  win = new BrowserWindow({
    icon: path.join(__dirname, "assets", "favicon.ico"),
  });
  win.loadURL(DASH_URL);

  win.on("closed", () => {
    win = null;
  });
}

app.whenReady().then(startBackendAndWindow);

app.on("window-all-closed", () => {
  killBackend();
  app.quit();
});

app.on("before-quit", () => {
  killBackend();
});

// Don't let an unrelated crash leave the Python process orphaned and the
// port locked for next time.
process.on("uncaughtException", (err) => {
  log(`Uncaught exception: ${err.stack || err.message}`);
  killBackend();
  app.quit();
});