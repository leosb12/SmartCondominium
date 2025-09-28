// src/hooks/useVisitorLookup.ts
import { useEffect, useState } from "react";
import { searchVisitors } from "../services/visitorsService";
import type { VisitorOption } from "../services/visitorsService";

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const h = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(h);
  }, [value, delay]);
  return debounced;
}

export function useVisitorLookup() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<VisitorOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  const debounced = useDebounced(input, 300);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await searchVisitors(debounced, 10);
        if (active) setOptions(res);
      } catch (e: any) {
        if (active) setError(e?.message || "Error buscando visitantes");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [debounced]);

  return { input, setInput, loading, options, error };
}
