import { useEffect, useMemo, useState, useCallback } from "react";
import DashboardLayout from "../Layouts/DashboardLayout";
import { api } from "../services/api";
import { roleService } from "../services/roleService";
import {
  Search,
  RefreshCw,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Printer,
  LayoutGrid,
  List,
} from "lucide-react";

/**
 * Tipos que retornan desde /api/historial-mantenimiento/
 */
type CostoTrabajo = {
  id: number;
  material: string | null;
  preciomaterial: number | null;
  preciomanoobra: number | null;
  horas_trabajadas: number | null;
  costo_total: number | null;
};

type HistorialItem = {
  id: number;
  descripcion: string;
  costo: number | null;
  fecha_programada: string | null; // ISO
  tipo: string | null;

  catalogo_id: number | null;
  creado_por_id: string | null;
  ordenado_a_id: string | null;
  estado_trabajo_id: number | null;
  hora_id: number | null;

  catalogo_nombre: string | null;
  creado_por: string | null;
  ordenado_a: string | null;
  estado_trabajo: string | null;
  hora_valor: string | null;

  costos: CostoTrabajo[];
};

/**
 * Guard: solo roles 1, 5 y 6.
 */
const allowedRoleIds = [1, 5, 6];

/**
 * Utils
 */
const pickApiError = (e: any): string =>
  e?.response?.data?.detail ||
  e?.response?.data?.error ||
  (typeof e?.response?.data === "string" ? e.response.data : "") ||
  e?.message ||
  "Error";

const fmtMoney = (n: number | null | undefined) =>
  typeof n === "number" && !Number.isNaN(n) ? `Bs. ${n.toFixed(2)}` : "-";

const toISO = (d?: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");

/**
 * Página única: Historial de Mantenimiento
 */
export default function HistorialMantenimiento() {
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

  // Estado principal
  const [items, setItems] = useState<HistorialItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Filtros
  const [q, setQ] = useState<string>("");
  const [estadoId, setEstadoId] = useState<number | "">("");
  const [catalogoId, setCatalogoId] = useState<number | "">("");
  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");
  const [view, setView] = useState<"table" | "cards">("table");

  // Expand rows
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const toggleRow = (id: number) =>
    setExpanded((p) => ({ ...p, [id]: !p[id] }));

  // Opciones dinámicas (derivadas de la data)
  const estadoOptions = useMemo(() => {
    const uniq = new Map<number, string>();
    items.forEach((it) => {
      if (it.estado_trabajo_id != null) {
        uniq.set(Number(it.estado_trabajo_id), it.estado_trabajo || `Estado ${it.estado_trabajo_id}`);
      }
    });
    return Array.from(uniq.entries()).map(([value, label]) => ({ value, label }));
  }, [items]);

  const catalogoOptions = useMemo(() => {
    const uniq = new Map<number, string>();
    items.forEach((it) => {
      if (it.catalogo_id != null) {
        uniq.set(Number(it.catalogo_id), it.catalogo_nombre || `Catálogo ${it.catalogo_id}`);
      }
    });
    return Array.from(uniq.entries()).map(([value, label]) => ({ value, label }));
  }, [items]);

  // Stats
  const stats = useMemo(() => {
    const total = items.length;
    let totalOrden = 0;
    let totalCostos = 0;
    const estadosCount = new Map<string, number>();

    for (const it of items) {
      if (typeof it.costo === "number") totalOrden += it.costo;
      for (const c of it.costos || []) {
        if (typeof c.costo_total === "number") totalCostos += c.costo_total;
      }
      const est = (it.estado_trabajo || "N/A").toLowerCase();
      estadosCount.set(est, (estadosCount.get(est) || 0) + 1);
    }

    const cerradas =
      (estadosCount.get("cerrada") || 0) +
      (estadosCount.get("cerrado") || 0) +
      (estadosCount.get("completado") || 0);

    const abiertas = total - cerradas;

    return {
      total,
      totalOrden,
      totalCostos,
      cerradas,
      abiertas,
    };
  }, [items]);

  // API call
  const load = useCallback(async () => {
    if (allowed !== true) return;
    setLoading(true);
    setError("");
    try {
      const params: any = {};
      if (q.trim()) params.search = q.trim();
      if (estadoId !== "") params.estado_id = Number(estadoId);
      if (catalogoId !== "") params.catalogo_id = Number(catalogoId);
      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;

      // api.get usa prefijo /api, por eso el path corto:
      const res = await api.get("/historial-mantenimiento/", { params });
      const data = Array.isArray(res.data) ? (res.data as HistorialItem[]) : [];
      setItems(data);
    } catch (e: any) {
      setError(pickApiError(e));
    } finally {
      setLoading(false);
    }
  }, [allowed, q, estadoId, catalogoId, fechaDesde, fechaHasta]);

  useEffect(() => {
    if (allowed === true) load();
    if (allowed === false) setLoading(false);
  }, [allowed, load]);

  // Export CSV
  const exportCSV = () => {
    const rows: string[] = [];
    const header = [
      "id",
      "descripcion",
      "fecha_programada",
      "tipo",
      "catalogo_id",
      "catalogo_nombre",
      "estado_trabajo_id",
      "estado_trabajo",
      "hora_id",
      "hora_valor",
      "creado_por",
      "ordenado_a",
      "costo_orden",
      "costo_linea_id",
      "material",
      "preciomaterial",
      "preciomanoobra",
      "horas_trabajadas",
      "costo_total_linea",
    ];
    rows.push(header.join(","));

    for (const it of items) {
      if (!it.costos || it.costos.length === 0) {
        rows.push(
          [
            it.id,
            `"${(it.descripcion || "").replace(/"/g, '""')}"`,
            toISO(it.fecha_programada),
            it.tipo || "",
            it.catalogo_id ?? "",
            `"${(it.catalogo_nombre || "").replace(/"/g, '""')}"`,
            it.estado_trabajo_id ?? "",
            `"${(it.estado_trabajo || "").replace(/"/g, '""')}"`,
            it.hora_id ?? "",
            `"${(it.hora_valor || "").replace(/"/g, '""')}"`,
            `"${(it.creado_por || "").replace(/"/g, '""')}"`,
            `"${(it.ordenado_a || "").replace(/"/g, '""')}"`,
            it.costo ?? "",
            "",
            "",
            "",
            "",
            "",
            "",
          ].join(",")
        );
      } else {
        for (const c of it.costos) {
          rows.push(
            [
              it.id,
              `"${(it.descripcion || "").replace(/"/g, '""')}"`,
              toISO(it.fecha_programada),
              it.tipo || "",
              it.catalogo_id ?? "",
              `"${(it.catalogo_nombre || "").replace(/"/g, '""')}"`,
              it.estado_trabajo_id ?? "",
              `"${(it.estado_trabajo || "").replace(/"/g, '""')}"`,
              it.hora_id ?? "",
              `"${(it.hora_valor || "").replace(/"/g, '""')}"`,
              `"${(it.creado_por || "").replace(/"/g, '""')}"`,
              `"${(it.ordenado_a || "").replace(/"/g, '""')}"`,
              it.costo ?? "",
              c.id ?? "",
              `"${(c.material || "").replace(/"/g, '""')}"`,
              c.preciomaterial ?? "",
              c.preciomanoobra ?? "",
              c.horas_trabajadas ?? "",
              c.costo_total ?? "",
            ].join(",")
          );
        }
      }
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    a.download = `historial-mantenimiento-${ts}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Orden visual
  const visible = useMemo(() => {
    const arr = [...items].sort((a, b) => {
      const ad = a.fecha_programada ? new Date(a.fecha_programada).getTime() : 0;
      const bd = b.fecha_programada ? new Date(b.fecha_programada).getTime() : 0;
      if (ad !== bd) return bd - ad;
      return Number(b.id) - Number(a.id);
    });
    // Filtro rápido local por q (además del servidor)
    if (!q.trim()) return arr;
    const s = q.toLowerCase();
    return arr.filter(
      (it) =>
        String(it.id).includes(s) ||
        (it.descripcion || "").toLowerCase().includes(s) ||
        (it.catalogo_nombre || "").toLowerCase().includes(s) ||
        (it.creado_por || "").toLowerCase().includes(s) ||
        (it.ordenado_a || "").toLowerCase().includes(s)
    );
  }, [items, q]);

  // Estados de carga/permiso
  if (allowed === null) {
    return (
      <DashboardLayout title="Historial de Mantenimiento" subtitle="Verificando permisos...">
        <div className="min-h-64 flex items-center justify-center">
          <RefreshCw className="w-7 h-7 animate-spin text-blue-400" />
        </div>
      </DashboardLayout>
    );
  }

  if (allowed === false) {
    return (
      <DashboardLayout title="Historial de Mantenimiento" subtitle="Acceso restringido">
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
    <DashboardLayout title="Historial de Mantenimiento" subtitle="Consulta completa de órdenes y costos">
      <main className="px-4 sm:px-8 py-6">
        {/* Barra superior acciones */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-5">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por descripción, catálogo o persona…"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={load}
              className="px-3 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white inline-flex items-center gap-2"
              title="Recargar"
            >
              <RefreshCw className="w-4 h-4" />
              Recargar
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setView((v) => (v === "table" ? "cards" : "table"))}
              className="px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700/60 text-slate-200 hover:bg-slate-800/60 inline-flex items-center gap-2"
              title="Cambiar vista"
            >
              {view === "table" ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
              {view === "table" ? "Cards" : "Tabla"}
            </button>
            <button
              onClick={exportCSV}
              className="px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700/60 text-slate-200 hover:bg-slate-800/60 inline-flex items-center gap-2"
              title="Exportar CSV"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700/60 text-slate-200 hover:bg-slate-800/60 inline-flex items-center gap-2"
              title="Imprimir"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
          </div>
        </div>

        {/* Panel de filtros */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4 mb-6">
          <div className="flex items-center gap-2 text-slate-300 font-semibold mb-3">
            <Filter className="w-4 h-4 text-blue-400" />
            Filtros
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <select
              className="w-full px-3 py-2 rounded-lg bg-slate-950/40 border border-slate-700/60 text-white"
              value={estadoId}
              onChange={(e) => setEstadoId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Todos los estados</option>
              {estadoOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label} (ID {o.value})
                </option>
              ))}
            </select>

            <select
              className="w-full px-3 py-2 rounded-lg bg-slate-950/40 border border-slate-700/60 text-white"
              value={catalogoId}
              onChange={(e) => setCatalogoId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Todos los catálogos</option>
              {catalogoOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label} (ID {o.value})
                </option>
              ))}
            </select>

            <input
              type="date"
              className="w-full px-3 py-2 rounded-lg bg-slate-950/40 border border-slate-700/60 text-white"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
            />
            <input
              type="date"
              className="w-full px-3 py-2 rounded-lg bg-slate-950/40 border border-slate-700/60 text-white"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
            />

            <div className="flex gap-2">
              <button
                onClick={load}
                className="flex-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white"
              >
                Aplicar
              </button>
              <button
                onClick={() => {
                  setQ("");
                  setEstadoId("");
                  setCatalogoId("");
                  setFechaDesde("");
                  setFechaHasta("");
                  setTimeout(load, 0);
                }}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl border border-slate-700/50 bg-gradient-to-b from-slate-900/70 to-slate-950/50 p-4">
            <div className="text-slate-400 text-xs mb-1">Órdenes</div>
            <div className="text-blue-400 font-extrabold text-xl">{stats.total}</div>
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-gradient-to-b from-slate-900/70 to-slate-950/50 p-4">
            <div className="text-slate-400 text-xs mb-1">Costo Orden (suma)</div>
            <div className="text-sky-300 font-extrabold text-xl">{fmtMoney(stats.totalOrden)}</div>
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-gradient-to-b from-slate-900/70 to-slate-950/50 p-4">
            <div className="text-slate-400 text-xs mb-1">Costo Trabajos (suma)</div>
            <div className="text-emerald-300 font-extrabold text-xl">{fmtMoney(stats.totalCostos)}</div>
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-gradient-to-b from-slate-900/70 to-slate-950/50 p-4">
            <div className="text-slate-400 text-xs mb-1">Estado</div>
            <div className="flex gap-2 items-center">
              <span className="inline-flex gap-1 items-center text-green-300">
                <CheckCircle2 className="w-4 h-4" /> {stats.cerradas}
              </span>
              <span className="inline-flex gap-1 items-center text-yellow-300">
                <AlertTriangle className="w-4 h-4" /> {stats.abiertas}
              </span>
            </div>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 overflow-hidden">
          {loading ? (
            <div className="p-10 text-center">
              <RefreshCw className="w-7 h-7 animate-spin text-blue-400 mx-auto mb-3" />
              <p className="text-slate-400">Cargando historial...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-400">{error}</div>
          ) : visible.length === 0 ? (
            <div className="p-10 text-center text-slate-400">No hay datos para mostrar.</div>
          ) : view === "table" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-950/40 border-b border-slate-700/50">
                  <tr>
                    <th className="text-left p-3 text-slate-300 font-semibold">ID</th>
                    <th className="text-left p-3 text-slate-300 font-semibold">Descripción</th>
                    <th className="text-left p-3 text-slate-300 font-semibold">Catálogo</th>
                    <th className="text-left p-3 text-slate-300 font-semibold">Estado</th>
                    <th className="text-left p-3 text-slate-300 font-semibold">Creado por</th>
                    <th className="text-left p-3 text-slate-300 font-semibold">Ordenado a</th>
                    <th className="text-left p-3 text-slate-300 font-semibold">Fecha</th>
                    <th className="text-left p-3 text-slate-300 font-semibold">Hora</th>
                    <th className="text-left p-3 text-slate-300 font-semibold">Tipo</th>
                    <th className="text-left p-3 text-slate-300 font-semibold">Costo Orden</th>
                    <th className="text-left p-3 text-slate-300 font-semibold">Costo Trabajos</th>
                    <th className="text-right p-3 text-slate-300 font-semibold">Detalles</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((it) => {
                    const sumCostos = (it.costos || []).reduce((acc, c) => acc + (c.costo_total || 0), 0);
                    const open = !!expanded[it.id];
                    return (
                      <tr key={it.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="p-3 text-white">{it.id}</td>
                        <td className="p-3 text-slate-200">{it.descripcion}</td>
                        <td className="p-3 text-slate-300">
                          {(it.catalogo_nombre || "-")}{" "}
                          {it.catalogo_id != null && (
                            <span className="ml-1 text-xs text-slate-400">(ID {it.catalogo_id})</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-1 rounded-full text-xs font-medium border border-slate-600/60 text-slate-200">
                            {(it.estado_trabajo || "-")} {it.estado_trabajo_id != null ? `(ID ${it.estado_trabajo_id})` : ""}
                          </span>
                        </td>
                        <td className="p-3 text-slate-300">{it.creado_por || "-"}</td>
                        <td className="p-3 text-slate-300">{it.ordenado_a || "-"}</td>
                        <td className="p-3 text-slate-300">
                          {it.fecha_programada ? (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              {new Date(it.fecha_programada).toLocaleDateString()}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="p-3 text-slate-300">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-4 h-4 text-slate-400" />
                            {it.hora_valor || it.hora_id || "-"}
                          </span>
                        </td>
                        <td className="p-3 text-slate-300">{it.tipo || "-"}</td>
                        <td className="p-3 text-slate-200">{fmtMoney(it.costo)}</td>
                        <td className="p-3 text-emerald-300">{fmtMoney(sumCostos)}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => toggleRow(it.id)}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/70 hover:bg-slate-700/70 text-white"
                          >
                            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            {open ? "Ocultar" : "Ver"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Detalles expandibles debajo de la tabla */}
              {visible.map((it) => {
                if (!expanded[it.id]) return null;
                const sumCostos = (it.costos || []).reduce((acc, c) => acc + (c.costo_total || 0), 0);
                return (
                  <div key={`detail-${it.id}`} className="border-t border-slate-800/60 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                      <div className="rounded-lg bg-slate-950/40 border border-slate-700/60 p-3">
                        <div className="text-slate-400 text-xs">Creado por</div>
                        <div className="text-slate-200 font-semibold">{it.creado_por || "-"}</div>
                      </div>
                      <div className="rounded-lg bg-slate-950/40 border border-slate-700/60 p-3">
                        <div className="text-slate-400 text-xs">Ordenado a</div>
                        <div className="text-slate-200 font-semibold">{it.ordenado_a || "-"}</div>
                      </div>
                      <div className="rounded-lg bg-slate-950/40 border border-slate-700/60 p-3">
                        <div className="text-slate-400 text-xs">Suma costos trabajo</div>
                        <div className="text-emerald-300 font-semibold">{fmtMoney(sumCostos)}</div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-950/40">
                          <tr>
                            <th className="text-left p-2 text-slate-300 font-semibold">ID</th>
                            <th className="text-left p-2 text-slate-300 font-semibold">Material</th>
                            <th className="text-left p-2 text-slate-300 font-semibold">Precio material</th>
                            <th className="text-left p-2 text-slate-300 font-semibold">Precio mano de obra</th>
                            <th className="text-left p-2 text-slate-300 font-semibold">Horas</th>
                            <th className="text-left p-2 text-slate-300 font-semibold">Costo total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(it.costos || []).length === 0 ? (
                            <tr>
                              <td className="p-2 text-slate-400" colSpan={6}>
                                No hay costos registrados para esta orden.
                              </td>
                            </tr>
                          ) : (
                            it.costos.map((c) => (
                              <tr key={c.id} className="border-b border-slate-800/50">
                                <td className="p-2 text-white">{c.id}</td>
                                <td className="p-2 text-slate-200">{c.material || "-"}</td>
                                <td className="p-2 text-slate-300">{fmtMoney(c.preciomaterial || 0)}</td>
                                <td className="p-2 text-slate-300">{fmtMoney(c.preciomanoobra || 0)}</td>
                                <td className="p-2 text-slate-300">{c.horas_trabajadas ?? "-"}</td>
                                <td className="p-2 text-emerald-300">{fmtMoney(c.costo_total || 0)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Vista Cards
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-3">
              {visible.map((it) => {
                const sumCostos = (it.costos || []).reduce((acc, c) => acc + (c.costo_total || 0), 0);
                const open = !!expanded[it.id];
                return (
                  <div key={`card-${it.id}`} className="rounded-xl border border-slate-700/60 bg-slate-950/40 p-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-white font-semibold">OT #{it.id}</div>
                      <div className="text-xs px-2 py-1 rounded-full border border-slate-600/60 text-slate-300">
                        {it.estado_trabajo || "Estado"}
                      </div>
                    </div>
                    <div className="text-slate-300 mb-2">{it.descripcion}</div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                      <div className="col-span-2">Catálogo: {it.catalogo_nombre || "-"} {it.catalogo_id != null && <span className="text-slate-500">(ID {it.catalogo_id})</span>}</div>
                      <div className="col-span-2">Creado por: <span className="text-slate-200">{it.creado_por || "-"}</span></div>
                      <div className="col-span-2">Ordenado a: <span className="text-slate-200">{it.ordenado_a || "-"}</span></div>
                      <div>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {it.fecha_programada ? new Date(it.fecha_programada).toLocaleDateString() : "-"}
                        </span>
                      </div>
                      <div>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {it.hora_valor || it.hora_id || "-"}
                        </span>
                      </div>
                      <div>Tipo: {it.tipo || "-"}</div>
                      <div className="text-slate-200">Costo orden: {fmtMoney(it.costo)}</div>
                      <div className="text-emerald-300">Costos: {fmtMoney(sumCostos)}</div>
                    </div>

                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => toggleRow(it.id)}
                        className="px-3 py-2 rounded-lg bg-slate-800/70 hover:bg-slate-700/70 text-white inline-flex items-center gap-2"
                      >
                        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        {open ? "Ocultar" : "Ver"}
                      </button>
                    </div>

                    {open && (
                      <div className="mt-3 border-t border-slate-800/60 pt-3">
                        {(it.costos || []).length === 0 ? (
                          <div className="text-sm text-slate-400">Sin costos registrados.</div>
                        ) : (
                          <div className="space-y-2">
                            {it.costos.map((c) => (
                              <div key={c.id} className="rounded-lg border border-slate-700/60 p-2 text-xs">
                                <div className="text-slate-300 font-semibold">#{c.id} - {c.material || "Material"}</div>
                                <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1">
                                  <div>Precio material: {fmtMoney(c.preciomaterial || 0)}</div>
                                  <div>Precio mano de obra: {fmtMoney(c.preciomanoobra || 0)}</div>
                                  <div>Horas: {c.horas_trabajadas ?? "-"}</div>
                                  <div className="text-emerald-300">Total: {fmtMoney(c.costo_total || 0)}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}