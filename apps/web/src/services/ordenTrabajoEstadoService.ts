import { api } from "./api";

export interface EstadoTrabajo {
  id: number;
  nombre: string;
}

export interface OrdenTrabajo {
  id: number;
  estado_trabajo_id: number;
  descripcion?: string;
  tipo?: string;
  [key: string]: any;
}

export async function fetchEstadosTrabajo(): Promise<EstadoTrabajo[]> {
  const { data } = await api.get<EstadoTrabajo[]>("/orden-trabajo-estado/estados-trabajo/");
  return data;
}

export async function fetchOrdenById(ordenId: number): Promise<OrdenTrabajo> {
  const { data } = await api.get<OrdenTrabajo>(`/orden-trabajo-estado/ordenes/${ordenId}/`);
  return data;
}

// Listar todas las órdenes
export async function fetchOrdenesTrabajo(): Promise<OrdenTrabajo[]> {
  const { data } = await api.get<OrdenTrabajo[]>("/orden-trabajo-estado/ordenes/");
  return data;
}

export async function updateEstadoOrden(
  ordenId: number,
  estadoId: number,
  comentario?: string
): Promise<OrdenTrabajo> {
  const payload: { estado_trabajo_id: number; comentario?: string } = { estado_trabajo_id: estadoId };
  if (comentario !== undefined) payload.comentario = comentario;

  const { data } = await api.patch<OrdenTrabajo>(`/orden-trabajo-estado/ordenes/${ordenId}/estado/`, payload);
  return data;
}