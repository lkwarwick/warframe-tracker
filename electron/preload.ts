import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // Item Categories
  getWarframes: () => ipcRenderer.invoke('get-warframes'),
  getPrimaries: () => ipcRenderer.invoke('get-primaries'),
  getSecondaries: () => ipcRenderer.invoke('get-secondaries'),
  getMelee: () => ipcRenderer.invoke('get-melee'),
  getArchwing: () => ipcRenderer.invoke('get-archwing'),
  getCompanions: () => ipcRenderer.invoke('get-companions'),
  // New Save Data
  getMastered: () => ipcRenderer.invoke('get-mastered'),
  toggleMastered: (uniqueName: string) => ipcRenderer.invoke("toggle-mastered", uniqueName),
  getComponents: () => ipcRenderer.invoke('get-components'),
  incrementComponent: (componentId: string) => ipcRenderer.invoke('increment-component', componentId),
  decrementComponent: (componentId: string) => ipcRenderer.invoke('decrement-component', componentId),
  setComponent: (componentId: string, value: number) => ipcRenderer.invoke('set-component', componentId, value),
  removeComponent: (componentId: string) => ipcRenderer.invoke('remove-component', componentId),
  // Old Save Data
  getPrimeParts: () => ipcRenderer.invoke('get-prime-parts'),
  incrementPrimePart: (partId: string) => ipcRenderer.invoke("increment-prime-part", partId),
  decrementPrimePart: (partId: string) => ipcRenderer.invoke("decrement-prime-part", partId),
  removePrimePart: (partId: string) => ipcRenderer.invoke("remove-prime-part", partId),
});