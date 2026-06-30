import { app, BrowserWindow } from "electron";

app.whenReady().then(() => {
  new BrowserWindow({ width: 1000, height: 700 }).loadURL(
    "http://localhost:5173",
  );
});