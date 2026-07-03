import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  getWarframes: () => ipcRenderer.invoke('get-warframes'),
  getPrimaries: () => ipcRenderer.invoke('get-primaries'),
  getSecondaries: () => ipcRenderer.invoke('get-secondaries'),
  getMelee: () => ipcRenderer.invoke('get-melee'),
  getArchwing: () => ipcRenderer.invoke('get-archwing'),
  getCompanions: () => ipcRenderer.invoke('get-companions'),
  getProgress: () => ipcRenderer.invoke('get-progress'),
  toggleComponent: (parentId: string, componentId: string) => ipcRenderer.invoke('toggle-component', parentId, componentId),
});