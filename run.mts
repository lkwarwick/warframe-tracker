import { spawn } from "node:child_process";
import { createServer } from "vite";

const vite = await createServer();
await vite.listen();

const electron = spawn("electron", ["."], { stdio: "inherit" });

electron.on("exit", async () => {
  await vite.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  await vite.close();
  electron.kill();
  process.exit(0);
});