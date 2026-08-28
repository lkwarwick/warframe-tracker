import { create } from 'zustand';

export type FoundrySettings = {
  itemSearchText: string;
  hideCompleted: boolean;
  primeFilter: 'all' | 'prime-only' | 'non-prime-only';
  itemGroup: 'all' | 'warframes' | 'primaries' | 'secondaries' | 'melee' | 'archwing' | 'companions';
};

export type UserSettings = {
  foundry?: Partial<FoundrySettings>;
  [view: string]: unknown;
};

export interface UserData {
  mastered: Record<string, true>;
  components: Record<string, number>;
  settings: UserSettings;
  updatedAt: string;
}

export const EMPTY_MASTERED: Record<string, true> = {};
export const EMPTY_COMPONENTS: Record<string, number> = {};

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
