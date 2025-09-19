// src/services/financeService.ts
import { api } from "./api";

export interface Tarifa {
  id: number;
  monto: number;
  created_at: string;
}

export interface Extraordinaria {
  periodo: string;
  total_monto: number;
  descripcion: string;
}

export interface Expensa {
  id: number;
  propiedad_id: number;
  fecha: string;
  tarifa_id: number;
  total: number;
  propiedad: {
    nro_casa: string;
    m2: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface TarifaResponse extends ApiResponse<{ tarifa: Tarifa }> {}
export interface ExtraordinariaResponse extends ApiResponse<{ extraordinaria: Extraordinaria }> {}
export interface ExpensasGenerationResponse extends ApiResponse<{
  expensas_generadas: Expensa[];
  total_generadas: number;
  fecha_generacion: string;
}> {}

class FinanceService {
  private baseUrl = "/admin/finanzas";

  /**
   * Crear nueva tarifa por m²
   */
  async createTarifa(monto: number): Promise<TarifaResponse> {
    try {
      const response = await api.post(`${this.baseUrl}/tarifa`, { monto });
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Error al crear tarifa"
      );
    }
  }

  /**
   * Obtener tarifa vigente (actual)
   */
  async getTarifaVigente(): Promise<TarifaResponse> {
    try {
      const response = await api.get(`${this.baseUrl}/tarifa/vigente`);
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Error al obtener tarifa vigente"
      );
    }
  }

  /**
   * Crear/actualizar extraordinaria para un período futuro
   */
  async createExtraordinaria(
    periodo: string,
    totalMonto: number,
    descripcion: string = ""
  ): Promise<ExtraordinariaResponse> {
    try {
      const response = await api.post(`${this.baseUrl}/extraordinaria`, {
        periodo,
        total_monto: totalMonto,
        descripcion,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Error al crear extraordinaria"
      );
    }
  }

  /**
   * Obtener extraordinaria para un período específico
   */
  async getExtraordinaria(periodo: string): Promise<ExtraordinariaResponse> {
    try {
      const response = await api.get(`${this.baseUrl}/extraordinaria`, {
        params: { periodo },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Error al obtener extraordinaria"
      );
    }
  }

  /**
   * Generar expensas manualmente para el día de hoy
   */
  async generarExpensasHoy(): Promise<ExpensasGenerationResponse> {
    try {
      const response = await api.post(`${this.baseUrl}/expensas/generar-hoy`);
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Error al generar expensas"
      );
    }
  }

  /**
   * Test de conectividad con base de datos (debug)
   */
  async testDatabase(): Promise<any> {
    try {
      const response = await api.get(`${this.baseUrl}/debug/database-test`);
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Error en test de base de datos"
      );
    }
  }
}

// Exportar instancia singleton
export const financeService = new FinanceService();