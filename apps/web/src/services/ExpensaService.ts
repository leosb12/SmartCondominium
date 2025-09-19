// apps/web/src/services/ExpensaService.ts
import { api } from "../services/api";

// ==== Tipos ====
export interface Expensa {
  id: number;
  propiedad_id: number;
  fecha: string;               // "YYYY-MM-DD"
  total: number;
  created_at: string;          // ISO
  tarifa_id: number;
  fecha_vencimiento: string;   // ISO
  pagado?: number;
  saldo?: number;
  estado?: string;
}

export interface HistItem {
  cargo: { id: number; ts: string; monto: number };
  pago?: { id: number };
}

export interface CreateExpensaDto {
  propiedad_id: number | string;
  fecha: string;               // "YYYY-MM-DD"
  total: number | string;
  tarifa_id: number | string;
  fecha_vencimiento: string;   // "YYYY-MM-DD" o ISO "YYYY-MM-DDTHH:mm:ss"
}

// ==== Utils ====
const ensureDateTime = (value: string) =>
  value.length === 10 ? `${value}T00:00:00` : value;

// ==== Servicio ====
export const expensaService = {
  async list(propId?: string): Promise<Expensa[]> {
    const url = propId ? `/expensas/?propiedad_id=${propId}` : `/expensas/`;
    const res = await api.get(url);
    return res.data as Expensa[];
  },

  async detail(id: number): Promise<Expensa> {
    const res = await api.get(`/expensas/${id}/`);
    return res.data as Expensa;
  },

  async create(payload: CreateExpensaDto): Promise<Expensa> {
    const body = {
      propiedad_id: Number(payload.propiedad_id),
      fecha: payload.fecha, // ya viene como "YYYY-MM-DD"
      total: Number(payload.total),
      tarifa_id: Number(payload.tarifa_id),
      fecha_vencimiento: ensureDateTime(payload.fecha_vencimiento),
    };
    const res = await api.post(`/expensas/`, body);
    return res.data as Expensa;
  },

  async abonar(id: number, monto: number): Promise<any> {
    const res = await api.post(`/expensas/${id}/abonar/`, { monto });
    return res.data;
  },

  // Tu ViewSet expone @action(detail=True) def pagos(...) -> /expensas/{id}/pagos/
  async historial(id: number): Promise<HistItem[]> {
    const res = await api.get(`/expensas/${id}/pagos/`);
    return res.data as HistItem[];
  },
};

export default expensaService;
