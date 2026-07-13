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
});