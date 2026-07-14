import { create } from 'zustand';

export interface UserData {
  // your actual shape
  items: any[];
  settings: Record<string, any>;
  updatedAt: string;
}

interface UserStore {
  data: UserData | null;
  dirty: boolean;
  hydrate: (data: UserData) => void;
  update: (patch: Partial<UserData>) => void;
  markClean: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  data: null,
  dirty: false,
  hydrate: (data) => set({ data, dirty: false }),
  update: (patch) => set((s) => ({
    data: s.data ? { ...s.data, ...patch, updatedAt: new Date().toISOString() } : null,
    dirty: true,
  })),
  markClean: () => set({ dirty: false }),
}));