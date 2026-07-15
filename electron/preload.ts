import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // Mastery
  getMastered: () => ipcRenderer.invoke('get-mastered'),
  toggleMastered: (uniqueName: string) => ipcRenderer.invoke("toggle-mastered", uniqueName),
  // Components
  getComponents: () => ipcRenderer.invoke('get-components'),
  incrementComponent: (uniqueName: string) => ipcRenderer.invoke('increment-component', uniqueName),
  decrementComponent: (uniqueName: string) => ipcRenderer.invoke('decrement-component', uniqueName),
  setComponent: (uniqueName: string, value: number) => ipcRenderer.invoke('set-component', uniqueName, value),
  removeComponent: (uniqueName: string) => ipcRenderer.invoke('remove-component', uniqueName),
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