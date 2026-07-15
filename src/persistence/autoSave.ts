import { saveToGist } from "./gistSync";
import { useUserStore } from "./userStore";

export async function saveUserDataIfDirty() {
  const { data, dirty, markClean } = useUserStore.getState();

  if (!data || !dirty) {
    return false;
  }

  await saveToGist(data);
  markClean();
  return true;
}

export async function forceSaveUserData() {
  const { data, markClean } = useUserStore.getState();

  if (!data) return false;

  await saveToGist(data);
  markClean();
  return true;
}
