import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../Layouts/DashboardLayout";
import { useAdminCheck } from "../hooks/useRoles";
import { mantenimientoService, type OrdenTrabajo } from "../services/mantenimientoService";
import {
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  UserPlus,
  Search,
} from "lucide-react";

type PersonalTipo = "interno" | "externo";
type Tecnico = {
  id: string;
  nombre: string;
  email: string;
};

interface ApiError {
  response?: {
    data?: {
      detail?: string;
      error?: string;
    };
  };
  message?: string;
}

export default function AsignarTareas() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminCheck();

  const [ordenesPendientes, setOrdenesPendientes] = useState<OrdenTrabajo[]>([]);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<number | "">("");
  const [tipoPersonal, setTipoPersonal] = useState<PersonalTipo>("interno");
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [tecnicoId, setTecnicoId] = useState<string>("");

  const [loadingInit, setLoadingInit] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/dashboard", { replace: true });
    }
  }, [adminLoading, isAdmin, navigate]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingInit(true);
        // Cargar órdenes pendientes y técnicos con nombres reales
        const [ordenes, tecnicosData] = await Promise.all([
          mantenimientoService.listarOrdenesPendientes(),
          mantenimientoService.listarTecnicosConNombres(tipoPersonal)
        ]);
        setOrdenesPendientes(ordenes);
        setTecnicos(tecnicosData);
      } catch (e: unknown) {
        const error = e as ApiError;
        const msg =
          error?.response?.data?.detail ||
          error?.response?.data?.error ||
          error?.message ||
          "Error cargando datos";
        setError(typeof msg === "string" ? msg : "Error cargando datos");
      } finally {
        setLoadingInit(false);
      }
    };
    if (isAdmin) load();
  }, [isAdmin, tipoPersonal]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!ordenSeleccionada || !tecnicoId) {
      setError("Debes seleccionar una orden y un técnico.");
      return;
    }

    try {
      setAssigning(true);
      const data = await mantenimientoService.asignarOrden(
        Number(ordenSeleccionada),
        tecnicoId
      );
      setSuccess(`Orden #${data.id} asignada con éxito.`);
      
      // Recargar órdenes pendientes
      const ordenesActualizadas = await mantenimientoService.listarOrdenesPendientes();
      setOrdenesPendientes(ordenesActualizadas);
      
      setOrdenSeleccionada("");
      setTecnicoId("");
    } catch (e: unknown) {
      const error = e as ApiError;
      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        error?.message ||
        "Error asignando orden";
      setError(typeof msg === "string" ? msg : "Error asignando orden");
    } finally {
      setAssigning(false);
    }
  };

  if (adminLoading || loadingInit) {
    return (
      <DashboardLayout title="Asignar Tareas" subtitle="Cargando...">
        <div className="flex items-center justify-center min-h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      </DashboardLayout>
    );
  }
  if (!isAdmin) return null;

  return (
    <DashboardLayout
      title="Asignar Tareas"
      subtitle="Asignar una orden a personal interno o externo"
    >
      {/* Feedback */}
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

      <main className="px-6 sm:px-10 py-8">
        <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Orden de Trabajo */}
          <div className="lg:col-span-2">
            <label className="text-sm text-slate-300 font-medium flex items-center gap-2 mb-2">
              <Search size={16} /> Seleccionar Orden de Trabajo Pendiente
            </label>
            <select
              value={ordenSeleccionada}
              onChange={(e) => setOrdenSeleccionada(e.target.value ? Number(e.target.value) : "")}
              className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Seleccionar orden --</option>
              {ordenesPendientes.map((orden) => (
                <option key={orden.id} value={orden.id}>
                  #{orden.id} - {orden.descripcion} - ${orden.costo} - {orden.fecha_programada}
                </option>
              ))}
            </select>
            {ordenesPendientes.length === 0 && (
              <p className="text-xs text-slate-400 mt-1">
                No hay órdenes pendientes disponibles
              </p>
            )}
          </div>

          {/* Tipo de personal */}
          <div>
            <label className="text-sm text-slate-300">Tipo de personal</label>
            <select
              value={tipoPersonal}
              onChange={(e) =>
                setTipoPersonal(e.target.value as PersonalTipo)
              }
              className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="interno">Interno</option>
              <option value="externo">Externo</option>
            </select>
          </div>

          {/* Técnico */}
          <div>
            <label className="text-sm text-slate-300">Técnico</label>
            <select
              value={tecnicoId}
              onChange={(e) => setTecnicoId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Seleccionar técnico --</option>
              {tecnicos.map((tecnico) => (
                <option key={tecnico.id} value={tecnico.id}>
                  {tecnico.nombre} ({tecnico.email})
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={assigning}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition"
            >
              <UserPlus size={18} />
              {assigning ? "Asignando..." : "Asignar"}
            </button>
          </div>
        </form>
      </main>
    </DashboardLayout>
  );
}