import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../Layouts/DashboardLayout";
import { useAdminCheck } from "../hooks/useRoles";
import { bitacoraService, type BitacoraRecord } from "../services/bitacoraService";
import {
  FileText,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Filter,
  ArrowUpDown,
  Download,
  ShieldCheck,
} from "lucide-react";
import JSONPreview from "../components/JSONpreview";

type ApiError = { message?: string };

const PAGE_SIZE = 20;

function toLocal(dt: string) {
  try {
    const d = new Date(dt);
    return d.toLocaleString();
  } catch {
    return dt;
  }
}

function toISO(dtLocal: string | null): string | undefined {
  if (!dtLocal) return undefined;
  // input datetime-local -> ISO Z
  const d = new Date(dtLocal);
  return d.toISOString();
}

function csvEscape(v: unknown) {
  const s = typeof v === "string" ? v : JSON.stringify(v ?? "");
  const needsQuote = /[",\n]/.test(s);
  return needsQuote ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function BitacoraPage() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminCheck();

  const [items, setItems] = useState<BitacoraRecord[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // filtros
  const [q, setQ] = useState("");
  const [tableName, setTableName] = useState("");
  const [eventType, setEventType] = useState("");
  const [userId, setUserId] = useState("");
  const [createdFrom, setCreatedFrom] = useState<string>("");
  const [createdTo, setCreatedTo] = useState<string>("");
  const [ordering, setOrdering] = useState<string>("-created_at");

  // paginación
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAdmin, adminLoading, navigate]);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      setError("");
      const resp = await bitacoraService.list({
        q: q || undefined,
        table_name: tableName || undefined,
        event_type: eventType || undefined,
        user_id: userId || undefined,
        created_from: toISO(createdFrom) || undefined,
        created_to: toISO(createdTo) || undefined,
        ordering,
        page,
        page_size: PAGE_SIZE,
      });
      setItems(resp.results);
      setCount(resp.count);
    } catch (e) {
      const er = e as ApiError;
      setError(er.message || "Error cargando bitácora");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, q, tableName, eventType, userId, createdFrom, createdTo, ordering, page]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(count / PAGE_SIZE)),
    [count]
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const clearFilters = () => {
    setQ("");
    setTableName("");
    setEventType("");
    setUserId("");
    setCreatedFrom("");
    setCreatedTo("");
    setOrdering("-created_at");
    setPage(1);
    setSuccess("Filtros limpiados");
    setTimeout(() => setSuccess(""), 1200);
  };

  const exportCSV = () => {
    const headers = [
      "id",
      "created_at",
      "event_type",
      "table_name",
      "row_id",
      "user_id",
      "first_name",
      "last_name",
      "title",
      "details",
    ];
    const rows = items.map((r) => [
      r.id,
      r.created_at,
      r.event_type,
      r.table_name,
      r.row_id,
      r.user_id ?? "",
      r.first_name ?? "",
      r.last_name ?? "",
      r.title ?? "",
      JSON.stringify(r.details ?? null),
    ]);
    const csv =
      headers.join(",") +
      "\n" +
      rows.map((row) => row.map(csvEscape).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bitacora_page${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (adminLoading) {
    return (
      <DashboardLayout title="Bitácora" subtitle="Cargando...">
        <div className="flex items-center justify-center min-h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) return null;

  return (
    <DashboardLayout title="Bitácora" subtitle="Registros de auditoría del sistema">
      {/* Mensajes */}
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
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <FileText className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Bitácora</h1>
              <p className="text-slate-400">
                {count} registros • Página {page} de {totalPages}
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <div className="inline-flex items-center gap-1 text-blue-300 bg-blue-900/30 border border-blue-800/50 px-3 py-1 rounded-full text-xs">
              <ShieldCheck size={14} />
              Solo administradores
            </div>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
            >
              <Download size={16} />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Filtros */}
        <form onSubmit={onSubmit} className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4 sm:p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar (título, nombres, tabla, evento, row_id...)"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-700/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <input
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="Tabla (ej: expensas)"
                className="w-full px-3 py-2.5 bg-slate-900/60 border border-slate-700/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <input
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                placeholder="Evento (INSERT/UPDATE/DELETE)"
                className="w-full px-3 py-2.5 bg-slate-900/60 border border-slate-700/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Usuario (UUID)"
                className="w-full px-3 py-2.5 bg-slate-900/60 border border-slate-700/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="datetime-local"
                  value={createdFrom}
                  onChange={(e) => setCreatedFrom(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-900/60 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-[10px] text-slate-400">Desde</p>
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="datetime-local"
                  value={createdTo}
                  onChange={(e) => setCreatedTo(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-900/60 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-[10px] text-slate-400">Hasta</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    value={ordering}
                    onChange={(e) => setOrdering(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-900/60 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="-created_at">Orden: más recientes</option>
                    <option value="created_at">Orden: más antiguos</option>
                    <option value="-id">ID desc</option>
                    <option value="id">ID asc</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition inline-flex items-center gap-2"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
                  Aplicar
                </button>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
                >
                  Limpiar
                </button>
              </div>
            </div>
            {/* Botón export en mobile */}
            <div className="lg:hidden">
              <button
                type="button"
                onClick={exportCSV}
                className="w-full mt-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
              >
                <Download size={16} />
                Exportar CSV
              </button>
            </div>
          </div>
        </form>

        {/* Tabla */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-950/50 border-b border-slate-700/50">
                  <th className="text-left p-3 font-semibold text-slate-300">Fecha</th>
                  <th className="text-left p-3 font-semibold text-slate-300">Tabla</th>
                  <th className="text-left p-3 font-semibold text-slate-300">Evento</th>
                  <th className="text-left p-3 font-semibold text-slate-300">Row ID</th>
                  <th className="text-left p-3 font-semibold text-slate-300">Usuario</th>
                  <th className="text-left p-3 font-semibold text-slate-300">Título</th>
                  <th className="text-left p-3 font-semibold text-slate-300">Detalles</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-400 mx-auto mb-2" />
                      <p className="text-slate-400">Cargando registros...</p>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center">
                      <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">Sin resultados</p>
                    </td>
                  </tr>
                ) : (
                  items.map((r) => (
                    <tr key={r.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="p-3 text-slate-200 whitespace-nowrap">{toLocal(r.created_at)}</td>
                      <td className="p-3 text-slate-200">{r.table_name}</td>
                      <td className="p-3">
                        <span
                          className={
                            "px-2 py-1 rounded text-xs font-medium border " +
                            (r.event_type === "INSERT"
                              ? "bg-green-900/30 text-green-400 border-green-800/50"
                              : r.event_type === "UPDATE"
                              ? "bg-yellow-900/30 text-yellow-400 border-yellow-800/50"
                              : "bg-red-900/30 text-red-400 border-red-800/50")
                          }
                        >
                          {r.event_type}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300">{r.row_id}</td>
                      <td className="p-3 text-slate-200">
                        <div className="leading-tight">
                          <div className="text-white">
                            {(r.first_name || "") + " " + (r.last_name || "")}
                          </div>
                          <div className="text-xs text-slate-400">{r.user_id ? r.user_id.slice(0, 8) + "..." : "—"}</div>
                        </div>
                      </td>
                      <td className="p-3 text-slate-200">{r.title || "—"}</td>
                      <td className="p-3">
                        <JSONPreview data={r.details} />
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
                Mostrando {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, count)} de {count}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 transition"
                >
                  Anterior
                </button>
                <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-lg text-sm font-medium">
                  {page}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 transition"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}