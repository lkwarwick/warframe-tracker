const { app, BrowserWindow } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const http = require("http");

let py;


function createWindow() {
  const win = new BrowserWindow({
    icon: path.join(__dirname, "assets", "favicon.ico")
  });

  win.loadURL("http://127.0.0.1:8050");
}

function killPort() {
  const req = http.request({
    method: "POST",
    hostname: "127.0.0.1",
    port: 8050,
    path: "/shutdown",
  });
  req.on("error", () => {});
  req.end();
}

app.whenReady().then(() => {
  py = spawn("uv", ["run", "python", path.join(__dirname, "..", "backend", "app.py")], {
    stdio: "inherit",
    detached: true,
  });

  setTimeout(createWindow, 1500);
});

app.on("before-quit", () => {
  try {
    killPort();
  } catch {}
});