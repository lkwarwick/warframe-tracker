import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  getWarframes: () => ipcRenderer.invoke('get-warframes'),
  getPrimaries: () => ipcRenderer.invoke('get-primaries'),
});