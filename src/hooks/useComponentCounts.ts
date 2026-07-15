import { useCallback } from "react";
import { useUserStore } from "../persistence/userStore.js";

export function useComponentCounts() {
  const counts = useUserStore((s) => s.data?.components || {});
  const update = useUserStore((s) => s.update);

  const increment = useCallback((uniqueName: string) => {
    update((prev) => {
      const next = (prev.components[uniqueName] ?? 0) + 1;
      return { components: { ...prev.components, [uniqueName]: next } };
    });
  }, [update]);

  const decrement = useCallback((uniqueName: string) => {
    update((prev) => {
      const next = (prev.components[uniqueName] ?? 0) - 1;
      const { [uniqueName]: _, ...rest } = prev.components;
      return { components: next > 0 ? { ...prev.components, [uniqueName]: next } : rest };
    });
  }, [update]);

  const setValue = useCallback((uniqueName: string, value: number) => {
    update((prev) => {
      if (value <= 0) {
        const { [uniqueName]: _, ...rest } = prev.components;
        return { components: rest };
      }
      return { components: { ...prev.components, [uniqueName]: value } };
    });
  }, [update]);

  return { counts, increment, decrement, setValue };
}