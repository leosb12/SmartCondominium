/* Servicio para consumir el endpoint público de Bitácora.
   - No usa tokens ni headers de auth.
   - Soporta filtros: q, table_name, event_type, user_id, created_from, created_to, ordering
   - Paginación: detecta DRF paginado (results + count) o lista plana.
*/

import {api} from "./api";

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

// Ruta relativa al baseURL definido en services/api.ts
const PATH = "/bitacora/";

export const bitacoraService = {
  async list(params: BitacoraQuery = {}): Promise<NormalizedBitacoraList> {
    const { data } = await api.get<BitacoraListResponse>(PATH, { params });

    if (Array.isArray(data)) {
      return { results: data, count: data.length };
    }
    return { results: data.results, count: data.count };
  },

  async get(id: number): Promise<BitacoraRecord> {
    const { data } = await api.get<BitacoraRecord>(`${PATH}${id}/`);
    return data;
  },
};