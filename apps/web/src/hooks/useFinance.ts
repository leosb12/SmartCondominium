// src/hooks/useFinance.ts
import { useState, useCallback } from "react";
import { financeService, type Tarifa, type Extraordinaria, type Expensa } from "../services/financeService";

interface UseFinanceReturn {
  // Estados
  loading: boolean;
  error: string | null;
  
  // Datos
  tarifaVigente: Tarifa | null;
  expensasGeneradas: Expensa[];
  
  // Acciones para tarifas
  crearTarifa: (monto: number) => Promise<void>;
  obtenerTarifaVigente: () => Promise<void>;
  
  // Acciones para extraordinarias
  crearExtraordinaria: (periodo: string, totalMonto: number, descripcion?: string) => Promise<void>;
  obtenerExtraordinaria: (periodo: string) => Promise<Extraordinaria | null>;
  
  // Acciones para expensas
  generarExpensasHoy: () => Promise<void>;
  
  // Utilidades
  clearError: () => void;
}

export const useFinance = (): UseFinanceReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tarifaVigente, setTarifaVigente] = useState<Tarifa | null>(null);
  const [expensasGeneradas, setExpensasGeneradas] = useState<Expensa[]>([]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback((err: unknown) => {
    const errorMessage = err instanceof Error ? err.message : "Error desconocido";
    setError(errorMessage);
    console.error("Finance error:", err);
  }, []);

  const crearTarifa = useCallback(async (monto: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await financeService.createTarifa(monto);
      
      if (response.success && response.data?.tarifa) {
        setTarifaVigente(response.data.tarifa);
      }
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const obtenerTarifaVigente = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await financeService.getTarifaVigente();
      
      if (response.success && response.data?.tarifa) {
        setTarifaVigente(response.data.tarifa);
      }
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const crearExtraordinaria = useCallback(async (
    periodo: string, 
    totalMonto: number, 
    descripcion: string = ""
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      await financeService.createExtraordinaria(periodo, totalMonto, descripcion);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const obtenerExtraordinaria = useCallback(async (periodo: string): Promise<Extraordinaria | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await financeService.getExtraordinaria(periodo);
      
      if (response.success && response.data?.extraordinaria) {
        return response.data.extraordinaria;
      }
      
      return null;
    } catch (err) {
      handleError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const generarExpensasHoy = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await financeService.generarExpensasHoy();
      
      if (response.success && response.data?.expensas_generadas) {
        setExpensasGeneradas(response.data.expensas_generadas);
      }
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  return {
    // Estados
    loading,
    error,
    
    // Datos
    tarifaVigente,
    expensasGeneradas,
    
    // Acciones
    crearTarifa,
    obtenerTarifaVigente,
    crearExtraordinaria,
    obtenerExtraordinaria,
    generarExpensasHoy,
    
    // Utilidades
    clearError,
  };
};