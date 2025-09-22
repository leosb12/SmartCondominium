import { useEffect, useMemo, useState, useCallback } from "react";
import DashboardLayout from "../Layouts/DashboardLayout";
import { api } from "../services/api";
import { roleService } from "../services/roleService";
import {
  Plus,
  Pencil,
  Search,
  RefreshCw,
  BadgeDollarSign,
  Calendar,
  Clock,
} from "lucide-react";

type OrdenTrabajo = {
  id: number;
  descripcion: string;
  fecha_programada: string; // ISO
  hora_id: number;
  costo: number | null;
  estado_trabajo_id: number;
  tipo: string;
};

type CostoTrabajo = {
  id: number;
  material: string | null;
  preciomanoobra: number;
  preciomaterial: number;
  horas_trabajadas: number;
  id_orden_trabajo: number;
  costo_total: number;
  created_at: string;
};

type FormState = {
  id?: number;
  id_orden_trabajo: number;
  material: string;
  preciomanoobra: number | "";
  preciomaterial: number | "";
  horas_trabajadas: number | "";
};

const allowedRoleIds = [1, 5, 6];

function pickApiError(e: any): string {
  return (
    e?.response?.data?.detail ||
    e?.response?.data?.error ||
    (typeof e?.response?.data === "string" ? e.response.data : "") ||
    e?.message ||
    "Error"
  );
}

export default function Costo_Material() {
  // Guard
  const [allowed, setAllowed] = useState<null | boolean>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const roles = await roleService.getMyRoles();
        const ok =
          Array.isArray(roles) &&
          roles.some((r) => allowedRoleIds.includes(Number(r.id)));
        if (mounted) setAllowed(ok);
      } catch {
        if (mounted) setAllowed(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Datos
  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([]);
  const [costos, setCostos] = useState<CostoTrabajo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filtro
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q.trim()) return ordenes;
    const s = q.toLowerCase();
    return ordenes.filter(
      (o) =>
        String(o.id).includes(s) ||
        o.descripcion?.toLowerCase()?.includes(s) ||
        o.tipo?.toLowerCase()?.includes(s)
    );
  }, [q, ordenes]);

  // Map rápido id_orden -> costo
  const costosByOrden = useMemo(() => {
    const m = new Map<number, CostoTrabajo>();
    for (const c of costos) m.set(Number(c.id_orden_trabajo), c);
    return m;
  }, [costos]);

  // Llamadas API
  const fetchOrdenes = useCallback(
    async (query?: string): Promise<OrdenTrabajo[]> => {
      const r = await api.get("/orden-trabajo-estado/ordenes/", {
        params: query?.trim() ? { q: query.trim() } : undefined,
      });
      if (Array.isArray(r.data)) return r.data;
      if (Array.isArray(r.data?.results)) return r.data.results;
      return [];
    },
    []
  );

  const fetchCostos = useCallback(async (): Promise<CostoTrabajo[]> => {
    const r = await api.get("/costo-material/");
    return Array.isArray(r.data) ? r.data : [];
  }, []);

  // Obtener (si existe) el costo de una orden directamente desde el backend
  const fetchCostoPorOrden = useCallback(
    async (ordenId: number): Promise<CostoTrabajo | null> => {
      try {
        const r = await api.get("/costo-material/", {
          params: { orden_id: Number(ordenId) },
        });
        const arr = Array.isArray(r.data) ? r.data : [];
        return arr.length > 0 ? (arr[0] as CostoTrabajo) : null;
      } catch {
        return null;
      }
    },
    []
  );

  const load = useCallback(async () => {
    if (allowed !== true) return;
    setLoading(true);
    setError("");
    try {
      const [ots, cts] = await Promise.all([fetchOrdenes(q), fetchCostos()]);
      setOrdenes(ots);
      setCostos(cts);
    } catch (e: any) {
      setError(pickApiError(e));
    } finally {
      setLoading(false);
    }
  }, [allowed, fetchOrdenes, fetchCostos, q]);

  useEffect(() => {
    if (allowed === true) load();
    if (allowed === false) setLoading(false);
  }, [allowed, load]);

  // Modal / Formulario
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [ordenSel, setOrdenSel] = useState<OrdenTrabajo | null>(null);
  const [form, setForm] = useState<FormState>({
    id_orden_trabajo: 0,
    material: "",
    preciomanoobra: "",
    preciomaterial: "",
    horas_trabajadas: "",
  });

  // Abrir modal: primero pregunta al backend si ya existe costo
  const openModal = async (orden: OrdenTrabajo) => {
    setOrdenSel(orden);
    setFormError("");
    // Chequeo robusto (evita depender de tipo number/string en memoria)
    const remoto = await fetchCostoPorOrden(Number(orden.id));
    if (remoto) {
      setForm({
        id: Number(remoto.id),
        id_orden_trabajo: Number(orden.id),
        material: remoto.material || "",
        preciomanoobra: Number(remoto.preciomanoobra),
        preciomaterial: Number(remoto.preciomaterial),
        horas_trabajadas: Number(remoto.horas_trabajadas),
      });
    } else {
      setForm({
        id_orden_trabajo: Number(orden.id),
        material: "",
        preciomanoobra: "",
        preciomaterial: "",
        horas_trabajadas: "",
      });
    }
    setOpen(true);
  };

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]:
        name === "preciomanoobra" ||
        name === "preciomaterial" ||
        name === "horas_trabajadas"
          ? value === ""
            ? ""
            : Number(value)
          : value,
    }));
  };

  const toNumber = (v: number | "" | undefined, def = 0) =>
    typeof v === "number" && !Number.isNaN(v) ? v : def;

  // Guardado: re-confirma si existe costo para decidir POST o PATCH
  const submit = async () => {
    const ordenId = Number(form.id_orden_trabajo);
    if (!ordenId) return;

    setSubmitting(true);
    setFormError("");

    try {
      // Datos limpios
      const payload = {
        material: (form.material || "").trim(),
        preciomanoobra: toNumber(form.preciomanoobra, 0),
        preciomaterial: toNumber(form.preciomaterial, 0),
        horas_trabajadas: toNumber(form.horas_trabajadas, 0),
        id_orden_trabajo: ordenId,
      };

      // Confirmar si ya existe en backend
      let existente: CostoTrabajo | null = await fetchCostoPorOrden(ordenId);

      // Forzar edición si el formulario trae id
      if (!existente && form.id) {
        existente = { ...(form as any) } as CostoTrabajo;
      }

      let saved: CostoTrabajo | null = null;
      if (existente && existente.id) {
        const r = await api.patch(`/costo-material/${existente.id}/`, payload);
        saved = r.data;
      } else {
        const r = await api.post(`/costo-material/`, payload);
        saved = r.data;
      }

      if (saved) {
        // Actualiza la lista local de costos
        setCostos((prev) => {
          const others = prev.filter((c) => Number(c.id) !== Number(saved!.id));
          return [...others, saved!];
        });
      }
      setOpen(false);
    } catch (e: any) {
      setFormError(pickApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  // Estados de carga/permiso
  if (allowed === null) {
    return (
      <DashboardLayout title="Costos de Trabajo" subtitle="Verificando permisos...">
        <div className="min-h-64 flex items-center justify-center">
          <RefreshCw className="w-7 h-7 animate-spin text-blue-400" />
        </div>
      </DashboardLayout>
    );
  }

  if (allowed === false) {
    return (
      <DashboardLayout title="Costos de Trabajo" subtitle="Operaciones de mantenimiento">
        <div className="px-6 sm:px-10 py-10">
          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-10 text-center">
            <p className="text-slate-300">
              Acceso denegado. Esta vista está restringida a roles 1, 5 y 6.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Costos de Trabajo"
      subtitle="Gestiona y registra costos por orden de trabajo"
    >
      <main className="px-6 sm:px-10 py-8">
        {/* Barra de búsqueda */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por id, descripción o tipo..."
              className="w-full pl-10 pr-4 py-3 bg-slate-900/60 border border-slate-700/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={load}
            className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Recargar
          </button>
        </div>

        {/* Contenedor datos */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 overflow-hidden">
          {loading ? (
            <div className="p-10 text-center">
              <RefreshCw className="w-7 h-7 animate-spin text-blue-400 mx-auto mb-3" />
              <p className="text-slate-400">Cargando datos...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-400">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              No hay órdenes para mostrar.
            </div>
          ) : (
            <>
              {/* Tabla (md+) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-950/40 border-b border-slate-700/50">
                      <th className="text-left p-3 font-semibold text-slate-300">ID</th>
                      <th className="text-left p-3 font-semibold text-slate-300">
                        Descripción
                      </th>
                      <th className="text-left p-3 font-semibold text-slate-300">
                        Fecha
                      </th>
                      <th className="text-left p-3 font-semibold text-slate-300">Hora ID</th>
                      <th className="text-left p-3 font-semibold text-slate-300">Estado</th>
                      <th className="text-left p-3 font-semibold text-slate-300">Tipo</th>
                      <th className="text-left p-3 font-semibold text-slate-300">
                        Costo orden
                      </th>
                      <th className="text-left p-3 font-semibold text-slate-300">
                        Costotrabajo
                      </th>
                      <th className="text-right p-3 font-semibold text-slate-300">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((o) => {
                      const ct = costosByOrden.get(Number(o.id));
                      return (
                        <tr
                          key={o.id}
                          className="border-b border-slate-800/50 hover:bg-slate-800/30 transition"
                        >
                          <td className="p-3 text-white">{o.id}</td>
                          <td className="p-3 text-slate-200">{o.descripcion}</td>
                          <td className="p-3 text-slate-300">
                            {o.fecha_programada ? (
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                {new Date(o.fecha_programada).toLocaleDateString()}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="p-3 text-slate-300">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-4 h-4 text-slate-400" />
                              {o.hora_id}
                            </span>
                          </td>
                          <td className="p-3 text-slate-300">{o.estado_trabajo_id}</td>
                          <td className="p-3 text-slate-300">{o.tipo}</td>
                          <td className="p-3 text-slate-200">
                            {o.costo != null ? `Bs. ${Number(o.costo).toFixed(2)}` : "-"}
                          </td>
                          <td className="p-3">
                            {ct ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-300 border border-green-700/40">
                                <BadgeDollarSign className="w-3 h-3" />
                                {`Bs. ${Number(ct.costo_total || 0).toFixed(2)}`}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-900/30 text-yellow-300 border border-yellow-700/40">
                                Sin costo
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => openModal(o)}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-500 transition"
                            >
                              {ct ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                              {ct ? "Editar costo" : "Agregar costo"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Cards (mobile) */}
              <div className="md:hidden grid grid-cols-1 gap-3 p-3">
                {filtered.map((o) => {
                  const ct = costosByOrden.get(Number(o.id));
                  return (
                    <div
                      key={o.id}
                      className="rounded-xl border border-slate-700/50 bg-slate-950/40 p-4"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-white font-semibold">OT #{o.id}</h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium border ${
                            ct
                              ? "bg-green-900/30 text-green-300 border-green-700/40"
                              : "bg-yellow-900/30 text-yellow-300 border-yellow-700/40"
                          }`}
                        >
                          {ct
                            ? `Bs. ${Number(ct.costo_total || 0).toFixed(2)}`
                            : "Sin costo"}
                        </span>
                      </div>
                      <p className="text-slate-300 text-sm">{o.descripcion}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 mt-3">
                        <div>Fecha: {o.fecha_programada ? new Date(o.fecha_programada).toLocaleDateString() : "-"}</div>
                        <div>Hora ID: {o.hora_id}</div>
                        <div>Estado: {o.estado_trabajo_id}</div>
                        <div>Tipo: {o.tipo}</div>
                        <div className="col-span-2">
                          Costo orden: {o.costo != null ? `Bs. ${Number(o.costo).toFixed(2)}` : "-" }
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => openModal(o)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-500 transition"
                        >
                          {ct ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                          {ct ? "Editar" : "Agregar"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => !submitting && setOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-slate-700/60 bg-slate-900/80 backdrop-blur p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white">
                {form.id ? "Editar costo de trabajo" : "Agregar costo de trabajo"}
              </h3>
              <p className="text-slate-400 text-sm">
                Orden #{ordenSel?.id} — {ordenSel?.descripcion}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm text-slate-300 mb-1">Material</label>
                <textarea
                  name="material"
                  value={form.material}
                  onChange={onChange}
                  placeholder="Detalle de materiales utilizados"
                  className="w-full min-h-[84px] px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  Horas trabajadas
                </label>
                <input
                  type="number"
                  name="horas_trabajadas"
                  min={0}
                  value={form.horas_trabajadas}
                  onChange={onChange}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  Precio mano de obra (Bs.)
                </label>
                <input
                  type="number"
                  name="preciomanoobra"
                  min={0}
                  value={form.preciomanoobra}
                  onChange={onChange}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  Precio material (Bs.)
                </label>
                <input
                  type="number"
                  name="preciomaterial"
                  min={0}
                  value={form.preciomaterial}
                  onChange={onChange}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {formError && (
              <div className="mt-3 text-sm text-red-400">{formError}</div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => !submitting && setOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition inline-flex items-center gap-2"
              >
                {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                {form.id ? "Guardar cambios" : "Agregar costo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}