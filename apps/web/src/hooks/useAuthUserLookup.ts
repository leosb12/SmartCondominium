import { useEffect, useState } from "react";
import { searchAuthUsers } from "../services/authUsersService";
import type { AuthUserOption } from "../services/authUsersService";

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const h = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(h);
  }, [value, delay]);
  return debounced;
}

export function useAuthUserLookup() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<AuthUserOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  const debounced = useDebounced(input, 300);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await searchAuthUsers(debounced, 10);
        if (active) setOptions(res);
      } catch (e: any) {
        if (active) setError(e?.message || "Error buscando usuarios");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [debounced]);

  return { input, setInput, loading, options, error };
}
