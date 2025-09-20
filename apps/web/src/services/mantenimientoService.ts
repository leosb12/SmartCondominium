// src/services/mantenimientoService.ts
import { api } from "./api";

/* ===== Tipos ===== */
export interface CatalogoItem {
  id: number;
  nombre: string;
  descripcion?: string;
}

export interface HoraItem {
  id: number;     // 0..23
  valor: string;  // "09:00:00"
}

export interface PreventivoPayload {
  catalogo_id: number;
  descripcion: string;
  fecha_programada: string; // "YYYY-MM-DD"
  hora_id: number;          // 0..23
  costo?: number;
  ordenado_a_id?: string | null; // uuid del técnico o null
}

export interface OrdenTrabajo {
  id: number;
  catalogo_id: number;
  creado_por_id: string;
  ordenado_a_id: string | null;
  tipo: string;               // "preventivo"
  estado_trabajo_id: number;  // 1 = pendiente
  descripcion: string;
  costo?: number | null;
  fecha_programada: string;   // "YYYY-MM-DD"
  hora_id: number;            // 0..23
}

/* ===== Servicio (estilo financeService) ===== */
class MantenimientoService {
  private getAuthHeaders() {
    const token = localStorage.getItem("access_token");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  /** Crear orden de mantenimiento preventivo */
  async crearPreventivo(payload: PreventivoPayload): Promise<OrdenTrabajo> {
    const response = await api.post("/mantenimiento/preventivos/", payload, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  /** Asignar una orden a usuario interno/externo */
  async asignarOrden(
    orden_trabajo_id: number,
    usuario_id: string
  ): Promise<OrdenTrabajo> {
    const response = await api.post("/mantenimiento/asignaciones/", {
      orden_trabajo_id, usuario_id
    }, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  /** Listar usuarios por tipo de personal (devuelve array de UUIDs) */
  async listarPersonal(tipo: "interno" | "externo"): Promise<string[]> {
    const response = await api.get("/mantenimiento/personal/", {
      params: { tipo },
      headers: this.getAuthHeaders(),
    });
    return response.data.usuarios || [];
  }

  /** Listar técnicos con nombres por tipo de personal */
  async listarTecnicosConNombres(tipo: "interno" | "externo"): Promise<Array<{id: string, nombre: string, email: string}>> {
    const response = await api.get("/mantenimiento/tecnicos/", {
      params: { tipo },
      headers: this.getAuthHeaders(),
    });
    return response.data.tecnicos || [];
  }

  /** Listar órdenes de trabajo pendientes */
  async listarOrdenesPendientes(): Promise<OrdenTrabajo[]> {
    const response = await api.get("/mantenimiento/ordenes-pendientes/", {
      headers: this.getAuthHeaders(),
    });
    return response.data || [];
  }

  /** Listar mis órdenes asignadas */
  async listarMisOrdenes(): Promise<OrdenTrabajo[]> {
    const response = await api.get("/mantenimiento/mis-ordenes/", {
      headers: this.getAuthHeaders(),
    });
    return response.data || [];
  }

  /** Catálogo de equipos/activos */
  async listarCatalogo(): Promise<CatalogoItem[]> {
    const response = await api.get("/mantenimiento/catalogo/", {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  /** Horas disponibles (0..23) */
  async listarHoras(): Promise<HoraItem[]> {
    const response = await api.get("/mantenimiento/hora/", {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  /** Métodos mock para cuando los endpoints no estén disponibles */
  async listarCatalogoMock(): Promise<CatalogoItem[]> {
    return [
      { id: 1, nombre: "Ascensor", descripcion: "Sistema de elevación" },
      { id: 2, nombre: "Bombas de agua", descripcion: "Equipo hidráulico" },
      { id: 3, nombre: "Generador eléctrico", descripcion: "Sistema de emergencia" },
      { id: 4, nombre: "Sistema de seguridad", descripcion: "Cámaras y alarmas" },
    ];
  }

  async listarHorasMock(): Promise<HoraItem[]> {
    return Array.from({ length: 24 }).map((_, h) => ({
      id: h,
      valor: `${String(h).padStart(2, "0")}:00:00`,
    }));
  }

  /** Mock para órdenes pendientes (sin asignar) */
  async listarOrdenesPendientesMock(): Promise<OrdenTrabajo[]> {
    return [
      {
        id: 1,
        catalogo_id: 1,
        creado_por_id: "admin-uuid",
        ordenado_a_id: null,
        tipo: "preventivo",
        estado_trabajo_id: 1,
        descripcion: "Mantenimiento preventivo del ascensor principal",
        costo: 150.00,
        fecha_programada: "2025-09-25",
        hora_id: 9
      },
      {
        id: 2,
        catalogo_id: 2,
        creado_por_id: "admin-uuid",
        ordenado_a_id: null,
        tipo: "preventivo",
        estado_trabajo_id: 1,
        descripcion: "Revisión de bombas de agua",
        costo: 200.00,
        fecha_programada: "2025-09-26",
        hora_id: 14
      }
    ];
  }
}

/* Singleton */
export const mantenimientoService = new MantenimientoService();