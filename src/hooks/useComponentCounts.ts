// useComponentCounts.ts
import { useState, useEffect, useCallback } from "react";

export function useComponentCounts() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    window.api.getComponents().then(setCounts);
  }, []);

  const increment = useCallback(async (uniqueName: string) => {
    setCounts(await window.api.incrementComponent(uniqueName));
  }, []);

  const decrement = useCallback(async (uniqueName: string) => {
    setCounts(await window.api.decrementComponent(uniqueName));
  }, []);

  const setValue = useCallback(async (uniqueName: string, value: number) => {
    setCounts(await window.api.setComponent(uniqueName, value));
  }, []);

  return { counts, increment, decrement, setValue };
}