import { create } from 'zustand';

export interface UserData {
  mastered: Record<string, true>;
  components: Record<string, number>;
  settings: Record<string, any>;
  updatedAt: string;
}

interface UserStore {
  data: UserData | null;
  dirty: boolean;
  hydrate: (data: UserData) => void;
  update: (patchOrFn: Partial<UserData> | ((prev: UserData) => Partial<UserData>)) => void;
  markClean: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  data: null,
  dirty: false,
  hydrate: (data) => set({ data, dirty: false }),
  update: (reducer) => set((s) => {
    if (!s.data) return {};
    const patch = typeof reducer === 'function' ? reducer(s.data) : reducer;
    return {
      data: { 
        ...s.data, 
        ...patch, 
        updatedAt: new Date().toISOString() 
      },
      dirty: true,
    };
  }),
  markClean: () => set({ dirty: false }),
}));

export function createEmptyUserData(): UserData {
  return {
    mastered: {},
    components: {},
    settings: {},
    updatedAt: new Date().toISOString(),
  }
}