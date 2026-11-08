import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { save } from "@tauri-apps/plugin-dialog";
import type { UserData } from "../persistence/userStore";

export type ScreenshotCapture = {
  path: string;
  dataUrl: string;
  canDelete: boolean;
};

export function loadUserData(): Promise<UserData> {
  return invoke<UserData>("load_user_data");
}

export function saveUserData(data: UserData): Promise<void> {
  return invoke("save_user_data", { data });
}

export function getUserDataPath(): Promise<string> {
  return invoke<string>("get_user_data_path");
}

export function deleteScreenshot(filePath: string): Promise<boolean> {
  return invoke<boolean>("delete_screenshot", { filePath });
}

export async function saveScreenshotCopy(filePath: string, dataUrl: string): Promise<void> {
  const fileName = filePath.split(/[\\/]/).pop() || "warframe-screenshot.png";
  const extension = dataUrl.startsWith("data:image/png;") ? "png" : "jpg";
  const destination = await save({
    defaultPath: fileName,
    filters: [{ name: "Screenshot image", extensions: [extension] }],
  });
  if (!destination) return;

  await invoke<void>("save_screenshot_copy", { filePath: destination, dataUrl });
}

export function onScreenshot(
  callback: (capture: ScreenshotCapture) => void,
): Promise<() => void> {
  return listen<ScreenshotCapture>("screenshot-created", (event) => {
    callback(event.payload);
  });
}

export function saveWindowState(): Promise<void> {
  return invoke("save_window_state");
}
