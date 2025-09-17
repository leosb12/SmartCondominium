import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../Layouts/DashboardLayout";
import { useAdminCheck } from "../hooks/useRoles";
import { roleService } from "../services/roleService";
import type { UserWithRoles, Role } from "../services/roleService";
import {
  Users,
  Search,
  Plus,
  Minus,
  Shield,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  UserCheck,
  UserX,
  X,
} from "lucide-react";

interface ApiError {
  response?: {
    data?: {
      error?: string;
      detail?: string | Record<string, unknown>;
    };
  };
  message?: string;
}

export default function GestionRoles() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminCheck();

  // Estados principales
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Estados de paginación y filtros
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize] = useState(10);

  // Estados de operaciones
  const [operatingUser, setOperatingUser] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [confirmText, setConfirmText] = useState("");

  // Verificar acceso de administrador
  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAdmin, adminLoading, navigate]);

  // Cargar datos iniciales
  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      loadAvailableRoles();
    }
  }, [isAdmin, currentPage, searchTerm]);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await roleService.listUsersWithRoles({
        search: searchTerm,
        page: currentPage,
        pageSize,
      });

      setUsers(response.results);
      setTotalCount(response.count);
      setTotalPages(Math.ceil(response.count / pageSize));
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || "Error cargando usuarios");
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, pageSize]);

  const loadAvailableRoles = async () => {
    try {
      const roles = await roleService.getAvailableRoles();
      setAvailableRoles(roles);
    } catch (err) {
      console.error("Error loading available roles:", err);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadUsers();
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const openAssignModal = (user: UserWithRoles) => {
    setSelectedUser(user);
    setSelectedRole("");
    setShowAssignModal(true);
    clearMessages();
  };

  const openRemoveModal = (user: UserWithRoles) => {
    setSelectedUser(user);
    setSelectedRole("");
    setConfirmText("");
    setShowRemoveModal(true);
    clearMessages();
  };

  const closeModals = () => {
    setShowAssignModal(false);
    setShowRemoveModal(false);
    setSelectedUser(null);
    setSelectedRole("");
    setConfirmText("");
  };

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRole) {
      setError("Selecciona un rol para asignar");
      return;
    }

    try {
      setOperatingUser(selectedUser.id);
      clearMessages();

      const response = await roleService.assignRole(selectedUser.id, selectedRole);
      
      if (response.success) {
        setSuccess(`Rol "${selectedRole}" asignado correctamente a ${selectedUser.email}`);
        await loadUsers();
        closeModals();
      } else {
        setError(response.message || "Error asignando rol");
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || "Error asignando rol");
    } finally {
      setOperatingUser(null);
    }
  };

  const handleRemoveRole = async () => {
    if (!selectedUser || !selectedRole) {
      setError("Selecciona un rol para remover");
      return;
    }

    if (confirmText.toUpperCase() !== "CONFIRMAR") {
      setError("Debes escribir 'CONFIRMAR' para proceder");
      return;
    }

    try {
      setOperatingUser(selectedUser.id);
      clearMessages();

      const response = await roleService.removeRole(selectedUser.id, selectedRole);
      
      if (response.success) {
        setSuccess(`Rol "${selectedRole}" removido correctamente de ${selectedUser.email}`);
        await loadUsers();
        closeModals();
      } else {
        setError(response.message || "Error removiendo rol");
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || "Error removiendo rol");
    } finally {
      setOperatingUser(null);
    }
  };

  // Loading o no autorizado
  if (adminLoading) {
    return (
      <DashboardLayout title="Gestión de Roles" subtitle="Cargando...">
        <div className="flex items-center justify-center min-h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return null; // El useEffect ya redirige
  }

  return (
    <DashboardLayout
      title="Gestión de Roles"
      subtitle="Administra permisos y roles de usuarios del sistema"
    >
      {/* Mensajes de feedback */}
      <div className="px-6 sm:px-10 mt-4 space-y-2">
        {success && (
          <div className="rounded-lg border border-green-700/50 bg-green-900/30 px-4 py-3 text-sm flex items-center gap-2">
            <CheckCircle size={16} className="text-green-400" />
            {success}
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-700/50 bg-red-900/30 px-4 py-3 text-sm flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400" />
            {error}
          </div>
        )}
      </div>

      {/* Contenido principal */}
      <main className="px-6 sm:px-10 py-8">
        {/* Header con búsqueda */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Usuarios y Roles</h1>
              <p className="text-slate-400">
                Total: {totalCount} usuarios • Página {currentPage} de {totalPages}
              </p>
            </div>
          </div>

          {/* Barra de búsqueda */}
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-900/60 border border-slate-700/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition flex items-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Buscar
            </button>
          </form>
        </div>

        {/* Tabla de usuarios */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-950/50 border-b border-slate-700/50">
                  <th className="text-left p-4 font-semibold text-slate-300">Usuario</th>
                  <th className="text-left p-4 font-semibold text-slate-300">Roles</th>
                  <th className="text-right p-4 font-semibold text-slate-300">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-400 mx-auto mb-2" />
                      <p className="text-slate-400">Cargando usuarios...</p>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center">
                      <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">
                        {searchTerm ? "No se encontraron usuarios" : "No hay usuarios con roles asignados"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-slate-800/50 hover:bg-slate-800/30 transition"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                            <span className="text-xs font-semibold text-slate-300">
                              {user.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-white">{user.email}</p>
                            <p className="text-xs text-slate-400">ID: {user.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {user.roles.length === 0 ? (
                            <span className="text-xs text-slate-500">Sin roles</span>
                          ) : (
                            user.roles.map((role) => (
                              <span
                                key={role.id}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                  role.nombre === "administrador"
                                    ? "bg-red-900/30 text-red-400 border border-red-800/50"
                                    : role.nombre === "propietario"
                                    ? "bg-blue-900/30 text-blue-400 border border-blue-800/50"
                                    : "bg-slate-700/50 text-slate-300 border border-slate-600/50"
                                }`}
                              >
                                {role.nombre === "administrador" && <ShieldCheck size={10} />}
                                {role.nombre === "propietario" && <Shield size={10} />}
                                {role.nombre}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openAssignModal(user)}
                            disabled={operatingUser === user.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600/20 text-green-400 border border-green-700/50 rounded-lg hover:bg-green-600/30 disabled:opacity-50 transition text-xs font-medium"
                          >
                            <Plus size={12} />
                            Asignar
                          </button>
                          <button
                            onClick={() => openRemoveModal(user)}
                            disabled={operatingUser === user.id || user.roles.length === 0}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600/20 text-red-400 border border-red-700/50 rounded-lg hover:bg-red-600/30 disabled:opacity-50 transition text-xs font-medium"
                          >
                            <Minus size={12} />
                            Remover
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-700/50 bg-slate-950/30">
              <p className="text-sm text-slate-400">
                Mostrando {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalCount)} de {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:hover:bg-slate-800 transition"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-lg text-sm font-medium">
                  {currentPage}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:hover:bg-slate-800 transition"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal: Asignar Rol */}
      {showAssignModal && selectedUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl p-6 border border-slate-700 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-600/20 rounded-lg">
                  <UserCheck className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Asignar Rol</h3>
                  <p className="text-sm text-slate-400">{selectedUser.email}</p>
                </div>
              </div>
              <button onClick={closeModals} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Seleccionar rol a asignar:
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">-- Seleccionar rol --</option>
                  {availableRoles
                    .filter(role => !selectedUser.roles.some(userRole => userRole.nombre === role.nombre))
                    .map((role) => (
                      <option key={role.id} value={role.nombre}>
                        {role.nombre}
                      </option>
                    ))
                  }
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={closeModals}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAssignRole}
                  disabled={!selectedRole || operatingUser === selectedUser.id}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg transition"
                >
                  {operatingUser === selectedUser.id ? "Asignando..." : "Asignar Rol"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Remover Rol */}
      {showRemoveModal && selectedUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl p-6 border border-slate-700 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-600/20 rounded-lg">
                  <UserX className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Remover Rol</h3>
                  <p className="text-sm text-slate-400">{selectedUser.email}</p>
                </div>
              </div>
              <button onClick={closeModals} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Seleccionar rol a remover:
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">-- Seleccionar rol --</option>
                  {selectedUser.roles.map((role) => (
                    <option key={role.id} value={role.nombre}>
                      {role.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Confirmación para roles críticos */}
              {selectedRole === "administrador" && (
                <div className="p-3 bg-red-900/20 border border-red-800/50 rounded-lg">
                  <div className="flex items-center gap-2 text-red-400 text-sm mb-2">
                    <AlertTriangle size={14} />
                    <span className="font-medium">¡Atención!</span>
                  </div>
                  <p className="text-xs text-red-300">
                    Estás a punto de remover privilegios de administrador. Esta acción puede limitar el acceso del usuario.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Escribe "CONFIRMAR" para proceder:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="CONFIRMAR"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={closeModals}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRemoveRole}
                  disabled={!selectedRole || confirmText.toUpperCase() !== "CONFIRMAR" || operatingUser === selectedUser.id}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg transition"
                >
                  {operatingUser === selectedUser.id ? "Removiendo..." : "Remover Rol"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}