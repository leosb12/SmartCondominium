/* Servicio para consumir el endpoint público de Bitácora.
   - No usa tokens ni headers de auth.
   - Soporta filtros: q, table_name, event_type, user_id, created_from, created_to, ordering
   - Paginación: detecta DRF paginado (results + count) o lista plana.
*/
export type BitacoraRecord = {
  id: number;
  event_type: string;
  table_name: string;
  row_id: string;
  created_at: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  details: unknown | null;
};

export type BitacoraListResponse =
  | { results: BitacoraRecord[]; count: number }
  | BitacoraRecord[];

export type NormalizedBitacoraList = {
  results: BitacoraRecord[];
  count: number;
};

export type BitacoraQuery = {
  q?: string;
  table_name?: string;
  event_type?: string;
  user_id?: string;
  created_from?: string; // ISO 8601
  created_to?: string;   // ISO 8601
  ordering?: string;     // "-created_at" | "created_at" | "id" | "-id"
  page?: number;
  page_size?: number;
};

const DEV_FALLBACK_BASE =
  typeof window !== "undefined" && window.location.port === "5173"
    ? "http://localhost:8001/api"
    : "/api";

const API_BASE =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env &&
    (import.meta as any).env.VITE_API_BASE) ||
  DEV_FALLBACK_BASE;

const BITACORA_URL = `${API_BASE.replace(/\/$/, "")}/bitacora/`;

function toSearchParams(params: BitacoraQuery) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.table_name) sp.set("table_name", params.table_name);
  if (params.event_type) sp.set("event_type", params.event_type);
  if (params.user_id) sp.set("user_id", params.user_id);
  if (params.created_from) sp.set("created_from", params.created_from);
  if (params.created_to) sp.set("created_to", params.created_to);
  if (params.ordering) sp.set("ordering", params.ordering);
  if (params.page) sp.set("page", String(params.page));
  if (params.page_size) sp.set("page_size", String(params.page_size));
  return sp;
}

async function fetchJSON(url: string) {
  const res = await fetch(url);
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (!/application\/json/i.test(ct)) {
    const text = await res.text().catch(() => "");
    const snippet = text?.slice(0, 120) || "";
    throw new Error(
      `La respuesta no es JSON (Content-Type="${ct}"). Revisa VITE_API_BASE. Respuesta: ${snippet}`
    );
  }
  return res.json();
}

export const bitacoraService = {
  async list(params: BitacoraQuery = {}): Promise<NormalizedBitacoraList> {
    const sp = toSearchParams(params);
    const url = sp.toString() ? `${BITACORA_URL}?${sp.toString()}` : BITACORA_URL;

    const data: BitacoraListResponse = await fetchJSON(url);

    // Normalizar paginación
    if (Array.isArray(data)) {
      return { results: data, count: data.length };
    }
    return { results: data.results, count: data.count };
  },

  async get(id: number): Promise<BitacoraRecord> {
    const url = `${BITACORA_URL}${id}/`;
    return fetchJSON(url);
  },
};