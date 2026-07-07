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
  incrementComponent: (uniqueName: string) => ipcRenderer.invoke('increment-component', uniqueName),
  decrementComponent: (uniqueName: string) => ipcRenderer.invoke('decrement-component', uniqueName),
  setComponent: (uniqueName: string, value: number) => ipcRenderer.invoke('set-component', uniqueName, value),
  removeComponent: (uniqueName: string) => ipcRenderer.invoke('remove-component', uniqueName),
  // Old Save Data
  getPrimeParts: () => ipcRenderer.invoke('get-prime-parts'),
  incrementPrimePart: (partId: string) => ipcRenderer.invoke("increment-prime-part", partId),
  decrementPrimePart: (partId: string) => ipcRenderer.invoke("decrement-prime-part", partId),
  removePrimePart: (partId: string) => ipcRenderer.invoke("remove-prime-part", partId),
});