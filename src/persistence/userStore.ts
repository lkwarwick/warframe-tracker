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

/* --------------------------- Component Functions -------------------------- */

type NumericRecordField = {
  [K in keyof UserData]: UserData[K] extends Record<string, number> ? K : never
}[keyof UserData];

export function adjustCount(
  update: UserStore['update'],
  field: NumericRecordField,
  key: string,
  delta: number
) {
  update((prev) => {
    const record = prev[field] as Record<string, number>;
    const next = (record[key] ?? 0) + delta;
    const { [key]: _, ...rest } = record;
    return { [field]: next > 0 ? { ...record, [key]: next } : rest } as Partial<UserData>;
  });
}

export function setCount(
  update: UserStore['update'],
  field: NumericRecordField,
  key: string,
  value: number
) {
  update((prev) => {
    const record = prev[field] as Record<string, number>;
    if (value <= 0) {
      const { [key]: _, ...rest } = record;
      return { [field]: rest } as Partial<UserData>;
    }
    return { [field]: { ...record, [key]: value } } as Partial<UserData>;
  });
}

export function removeKey(
  update: UserStore['update'],
  field: keyof UserData,
  key: string
) {
  update((prev) => {
    const record = prev[field] as Record<string, unknown>;
    const { [key]: _, ...rest } = record;
    return { [field]: rest } as Partial<UserData>;
  });
}