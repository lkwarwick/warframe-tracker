import { contextBridge, ipcRenderer } from 'electron';

type UserData = {
  mastered: Record<string, true>;
  components: Record<string, number>;
  settings: Record<string, unknown>;
  updatedAt: string;
};

contextBridge.exposeInMainWorld('api', {
  loadUserData: (): Promise<UserData> => ipcRenderer.invoke('load-user-data'),
  saveUserData: (data: UserData): Promise<boolean> => ipcRenderer.invoke('save-user-data', data),
  getUserDataPath: (): Promise<string> => ipcRenderer.invoke('get-user-data-path'),
  // Force save on close: renderer can register a callback which will be called
  // when the main process sends the 'force-save' message.
  onForceSave: (cb: () => Promise<boolean> | boolean) => {
    ipcRenderer.on('force-save', async () => {
      try {
        const result = await cb();
        ipcRenderer.send('force-save-result', Boolean(result));
      } catch (e) {
        ipcRenderer.send('force-save-result', false);
      }
    });
  },
});