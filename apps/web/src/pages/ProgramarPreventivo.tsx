import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../Layouts/DashboardLayout";
import { useAdminCheck } from "../hooks/useRoles";
import {
  Calendar,
  Clock,
  ClipboardList,
  DollarSign,
  UserPlus,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Layers,
} from "lucide-react";
import {
  mantenimientoService,
  type CatalogoItem,
  type HoraItem,
} from "../services/mantenimientoService";

type PersonalTipo = "interno" | "externo";

export default function ProgramarPreventivo() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminCheck();

  // selects
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([]);
  const [horas, setHoras] = useState<HoraItem[]>([]);
  const [tecnicos, setTecnicos] = useState<string[]>([]);

  // form
  const [catalogoId, setCatalogoId] = useState<number | "">("");
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState("");
  const [horaId, setHoraId] = useState<number | "">("");
  const [costo, setCosto] = useState<string>("");

  const [asignarAhora, setAsignarAhora] = useState(false);
  const [tipoPersonal, setTipoPersonal] = useState<PersonalTipo>("interno");
  const [tecnicoId, setTecnicoId] = useState<string>("");

  // ui state
  const [loadingInit, setLoadingInit] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
        // Endpoints reales del backend
        const [cat, hs] = await Promise.all([
          mantenimientoService.listarCatalogo(),
          mantenimientoService.listarHoras(),
        ]);
        setCatalogo(cat);
        setHoras(hs);

        // Pre-carga internos por defecto
        const internos = await mantenimientoService.listarPersonal("interno");
        setTecnicos(internos);
      } catch (e: any) {
        const msg =
          e?.response?.data?.detail ||
          e?.response?.data?.error ||
          e?.message ||
          "Error cargando datos iniciales";
        setError(typeof msg === "string" ? msg : "Error cargando datos iniciales");
      } finally {
        setLoadingInit(false);
      }
    };
    if (isAdmin) load();
  }, [isAdmin]);

  useEffect(() => {
    const loadTecnicos = async () => {
      try {
        const users = await mantenimientoService.listarPersonal(tipoPersonal);
        setTecnicos(users);
        setTecnicoId("");
      } catch (e: any) {
        const msg =
          e?.response?.data?.detail ||
          e?.response?.data?.error ||
          e?.message ||
          "Error cargando personal";
        setError(typeof msg === "string" ? msg : "Error cargando personal");
      }
    };
    if (asignarAhora) loadTecnicos();
  }, [asignarAhora, tipoPersonal]);

  const costoNumber = useMemo(
    () => (costo !== "" ? Number(costo) : undefined),
    [costo]
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!catalogoId || !fecha || !horaId || !descripcion.trim() || !costo.trim()) {
      setError("Completa catálogo, descripción, fecha, hora y costo.");
      return;
    }
    if (asignarAhora && !tecnicoId) {
      setError("Selecciona un técnico o desactiva la asignación inmediata.");
      return;
    }

    try {
      setSubmitting(true);
      const data = await mantenimientoService.crearPreventivo({
        catalogo_id: Number(catalogoId),
        descripcion: descripcion.trim(),
        fecha_programada: fecha,
        hora_id: Number(horaId),
        costo: costoNumber,
        ordenado_a_id: asignarAhora ? tecnicoId : null,
      });
      setSuccess(`Orden preventiva #${data.id} creada correctamente.`);
      // reset
      setCatalogoId("");
      setDescripcion("");
      setFecha("");
      setHoraId("");
      setCosto("");
      setAsignarAhora(false);
      setTecnicoId("");
      setTipoPersonal("interno");
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.error ||
        e?.message ||
        "Error creando mantenimiento preventivo";
      setError(typeof msg === "string" ? msg : "Error creando mantenimiento preventivo");
    } finally {
      setSubmitting(false);
    }
  };

  if (adminLoading || loadingInit) {
    return (
      <DashboardLayout title="Programar Preventivo" subtitle="Cargando...">
        <div className="flex items-center justify-center min-h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      </DashboardLayout>
    );
  }
  if (!isAdmin) return null;

  return (
    <DashboardLayout
      title="Programar Mantenimiento Preventivo"
      subtitle="Crear una orden de trabajo preventiva"
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
          {/* Catálogo */}
          <div className="space-y-2">
            <label className="text-sm text-slate-300 font-medium flex items-center gap-2">
              <Layers size={16} /> Catálogo
            </label>
            <select
              value={catalogoId}
              onChange={(e) =>
                setCatalogoId(e.target.value ? Number(e.target.value) : "")
              }
              className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Seleccionar --</option>
              {catalogo.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha */}
          <div className="space-y-2">
            <label className="text-sm text-slate-300 font-medium flex items-center gap-2">
              <Calendar size={16} /> Fecha programada
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Hora */}
          <div className="space-y-2">
            <label className="text-sm text-slate-300 font-medium flex items-center gap-2">
              <Clock size={16} /> Hora
            </label>
            <select
              value={horaId}
              onChange={(e) =>
                setHoraId(e.target.value ? Number(e.target.value) : "")
              }
              className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Seleccionar --</option>
              {horas.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.valor?.slice(0, 5) ??
                    `${String(h.id).padStart(2, "0")}:00`}
                </option>
              ))}
            </select>
          </div>

          {/* Costo */}
          <div className="space-y-2">
            <label className="text-sm text-slate-300 font-medium flex items-center gap-2">
              <DollarSign size={16} /> Costo *
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              required
            />
          </div>

          {/* Descripción */}
          <div className="lg:col-span-2 space-y-2">
            <label className="text-sm text-slate-300 font-medium flex items-center gap-2">
              <ClipboardList size={16} /> Descripción
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Detalle del trabajo preventivo…"
            />
          </div>

          {/* Asignar ahora */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-3">
              <input
                id="asignar"
                type="checkbox"
                checked={asignarAhora}
                onChange={(e) => setAsignarAhora(e.target.checked)}
                className="w-4 h-4"
              />
              <label
                htmlFor="asignar"
                className="text-slate-300 text-sm flex items-center gap-2"
              >
                <UserPlus size={16} /> Asignar ahora a personal
              </label>
            </div>

            {asignarAhora && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                <div className="md:col-span-2">
                  <label className="text-sm text-slate-300">Técnico</label>
                  <select
                    value={tecnicoId}
                    onChange={(e) => setTecnicoId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Seleccionar técnico --</option>
                    {tecnicos.map((uuid) => (
                      <option key={uuid} value={uuid}>
                        {uuid}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition"
            >
              {submitting ? "Creando..." : "Crear preventivo"}
            </button>
          </div>
        </form>
      </main>
    </DashboardLayout>
  );
}