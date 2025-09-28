import { api } from "./api";

export type AuthUserOption = {
  id: string;        // UUID de Supabase Auth
  full_name: string; // nombre armado desde profiles
  email: string;
};

export async function searchAuthUsers(query: string, limit = 10): Promise<AuthUserOption[]> {
  // Tu endpoint /api/users/ ya devuelve todos; filtramos en frontend
  // Si luego agregas server-side search, solo ajustas esta función.
  const { data } = await api.get<AuthUserOption[]>("/users/");
  const q = (query ?? "").trim().toLowerCase();

  let list = Array.isArray(data) ? data : [];
  if (q) {
    list = list.filter(
      (u) =>
        (u.full_name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.id || "").toLowerCase().includes(q)
    );
  }

  return list.slice(0, limit);
}
