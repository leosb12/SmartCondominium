import { api } from "./api";

// Interfaces para los tipos de datos
interface Role {
  id: number;
  nombre: string;
}

interface UserWithRoles {
  id: string;
  email: string;
  roles: Role[];
}

interface RoleOperationResponse {
  success: boolean;
  message: string;
  user_id?: string;
  role_name?: string;
}

interface PaginatedUsersResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: UserWithRoles[];
}

interface UserRolesResponse {
  user_id: string;
  roles: Role[];
}

interface AvailableRolesResponse {
  roles: Role[];
}

interface ApiError {
  response?: {
    data?: {
      error?: string;
      detail?: string | Record<string, unknown>;
    };
  };
  message?: string;
}

class RoleService {
  private getAuthHeaders() {
    const token = localStorage.getItem("access_token");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Obtiene los roles del usuario autenticado actual
   */
  async getMyRoles(): Promise<Role[]> {
    try {
      const response = await api.get<UserRolesResponse>("/roles/me/", {
        headers: this.getAuthHeaders(),
      });
      return response.data.roles;
    } catch (error) {
      const apiError = error as ApiError;
      console.error("Error getting my roles:", apiError);
      throw new Error(
        apiError.response?.data?.error || "Error obteniendo mis roles"
      );
    }
  }

  /**
   * Verifica si el usuario actual tiene un rol específico
   */
  async hasRole(roleName: string): Promise<boolean> {
    try {
      const roles = await this.getMyRoles();
      return roles.some(role => role.nombre.toLowerCase() === roleName.toLowerCase());
    } catch (error) {
      console.error("Error checking role:", error);
      return false;
    }
  }

  /**
   * Verifica si el usuario actual es administrador
   */
  async isAdmin(): Promise<boolean> {
    return this.hasRole("administrador");
  }

  /**
   * Obtiene los roles de un usuario específico (solo admins)
   */
  async getUserRoles(userId: string): Promise<Role[]> {
    try {
      const response = await api.get<UserRolesResponse>(`/roles/user/?user_id=${userId}`, {
        headers: this.getAuthHeaders(),
      });
      return response.data.roles;
    } catch (error) {
      const apiError = error as ApiError;
      console.error("Error getting user roles:", apiError);
      throw new Error(
        apiError.response?.data?.error || "Error obteniendo roles del usuario"
      );
    }
  }

  /**
   * Lista usuarios con sus roles (solo admins)
   */
  async listUsersWithRoles(options: {
    search?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<PaginatedUsersResponse> {
    try {
      const params = new URLSearchParams();
      if (options.search) params.append("search", options.search);
      if (options.page) params.append("page", options.page.toString());
      if (options.pageSize) params.append("page_size", options.pageSize.toString());

      const queryString = params.toString() ? `?${params.toString()}` : "";
      
      const response = await api.get<PaginatedUsersResponse>(
        `/roles/management/users/${queryString}`,
        {
          headers: this.getAuthHeaders(),
        }
      );
      return response.data;
    } catch (error) {
      const apiError = error as ApiError;
      console.error("Error listing users:", apiError);
      throw new Error(
        apiError.response?.data?.error || "Error listando usuarios"
      );
    }
  }

  /**
   * Asigna un rol a un usuario (solo admins)
   */
  async assignRole(userId: string, roleName: string): Promise<RoleOperationResponse> {
    try {
      const response = await api.post<RoleOperationResponse>(
        "/roles/management/assign/",
        {
          user_id: userId,
          role_name: roleName,
        },
        {
          headers: this.getAuthHeaders(),
        }
      );
      return response.data;
    } catch (error) {
      const apiError = error as ApiError;
      console.error("Error assigning role:", apiError);
      throw new Error(
        apiError.response?.data?.error || "Error asignando rol"
      );
    }
  }

  /**
   * Remueve un rol de un usuario (solo admins)
   */
  async removeRole(userId: string, roleName: string): Promise<RoleOperationResponse> {
    try {
      const response = await api.post<RoleOperationResponse>(
        "/roles/management/remove/",
        {
          user_id: userId,
          role_name: roleName,
        },
        {
          headers: this.getAuthHeaders(),
        }
      );
      return response.data;
    } catch (error) {
      const apiError = error as ApiError;
      console.error("Error removing role:", apiError);
      throw new Error(
        apiError.response?.data?.error || "Error removiendo rol"
      );
    }
  }

  /**
   * Obtiene todos los roles disponibles (solo admins)
   */
  async getAvailableRoles(): Promise<Role[]> {
    try {
      const response = await api.get<AvailableRolesResponse>("/roles/management/available/", {
        headers: this.getAuthHeaders(),
      });
      return response.data.roles;
    } catch (error) {
      const apiError = error as ApiError;
      console.error("Error getting available roles:", apiError);
      throw new Error(
        apiError.response?.data?.error || "Error obteniendo roles disponibles"
      );
    }
  }
}

// Instancia singleton del servicio
export const roleService = new RoleService();

// Exportar tipos para uso en componentes
export type {
  Role,
  UserWithRoles,
  RoleOperationResponse,
  PaginatedUsersResponse,
  UserRolesResponse,
  AvailableRolesResponse,
};