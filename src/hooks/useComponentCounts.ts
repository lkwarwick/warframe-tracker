// useComponentCounts.ts
import { useState, useEffect, useCallback } from "react";

export function useComponentCounts() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    window.api.getComponents().then(setCounts);
  }, []);

  const increment = useCallback(async (componentId: string) => {
    setCounts(await window.api.incrementComponent(componentId));
  }, []);

  const decrement = useCallback(async (componentId: string) => {
    setCounts(await window.api.decrementComponent(componentId));
  }, []);

  const setValue = useCallback(async (componentId: string, value: number) => {
    setCounts(await window.api.setComponent(componentId, value));
  }, []);

  return { counts, increment, decrement, setValue };
}