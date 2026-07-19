import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
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