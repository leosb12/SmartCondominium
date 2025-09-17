import { useState, useEffect, useCallback } from "react";
import { roleService } from "../services/roleService";
import type { Role } from "../services/roleService";

interface UseRolesReturn {
  roles: Role[];
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  hasRole: (roleName: string) => boolean;
  refreshRoles: () => Promise<void>;
}

/**
 * Hook personalizado para gestionar los roles del usuario autenticado
 */
export const useRoles = (): UseRolesReturn => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRoles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const userRoles = await roleService.getMyRoles();
      setRoles(userRoles);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error cargando roles";
      setError(errorMessage);
      console.error("Error loading user roles:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  // Función para verificar si tiene un rol específico
  const hasRole = useCallback((roleName: string): boolean => {
    return roles.some(role => role.nombre.toLowerCase() === roleName.toLowerCase());
  }, [roles]);

  // Verificar si es administrador
  const isAdmin = hasRole("administrador");

  // Función para refrescar roles
  const refreshRoles = useCallback(async () => {
    await loadRoles();
  }, [loadRoles]);

  return {
    roles,
    loading,
    error,
    isAdmin,
    hasRole,
    refreshRoles,
  };
};

interface UseAdminCheckReturn {
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Hook simplificado solo para verificar si el usuario es administrador
 */
export const useAdminCheck = (): UseAdminCheckReturn => {
  const { isAdmin, loading, error } = useRoles();
  
  return { isAdmin, loading, error };
};