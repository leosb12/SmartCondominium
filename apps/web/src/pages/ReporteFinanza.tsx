// src/pages/ReporteFinanza.tsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  CalendarClock,
  Home,
  Download,
  RefreshCw,
  CircleDollarSign,
  Wallet,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import DashboardLayout from "../Layouts/DashboardLayout";
import { api } from "../services/api";
import { useAdminCheck } from "../hooks/useRoles";

type SerieMes = { mes: string; generado: string; cobrado: string };

type Totales = {
  generado: string;
  generado_expensas: string;
  generado_multas: string;
  cobrado: string;
  deuda: string;
  deuda_expensas: string;
  deuda_multas: string;
  vencido_expensas: string;
};

type ReporteFinanciero = {
  filtros: { desde?: string; hasta?: string; propiedad_id?: number | null };
  totales: Totales;
  series_mensuales: SerieMes[];
  top_deudores: { propiedad_id: number; deuda: string; vencido: string }[];
  detalle: {
    expensas: Array<{
      id: number;
      propiedad_id: number;
      fecha: string;
      total: string;
      pagado: string;
      pendiente: string;
      fecha_vencimiento?: string | null;
    }>;
    multas: Array<{
      id: number;
      propiedad_id: number;
      fecha: string;
      total: string;
      pagado: string;
      pendiente: string;
    }>;
    pagos: Array<{
      id: number;
      fecha: string;
      monto_total: string;
      estado_pago_id: number;
      tipo_pago_id: number | null;
    }>;
  };
};

type ApiError = {
  response?: { data?: any; status?: number };
  message?: string;
};

const fmtMoney = (v?: string | number | null) =>
  new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    maximumFractionDigits: 2,
  }).format(Number(v || 0));

const cls = (...xs: Array<string | false | null | undefined>) =>
  xs.filter(Boolean).join(" ");

const MetricCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: "emerald" | "sky" | "violet" | "amber" | "rose";
}> = ({ icon, label, value, accent = "sky" }) => {
  const ring =
    {
      emerald: "ring-emerald-500/30 bg-emerald-600/15",
      sky: "ring-sky-500/30 bg-sky-600/15",
      violet: "ring-violet-500/30 bg-violet-600/15",
      amber: "ring-amber-500/30 bg-amber-600/15",
      rose: "ring-rose-500/30 bg-rose-600/15",
    }[accent] || "ring-sky-500/30 bg-sky-600/15";
  return (
    <div className="rounded-2xl border border-slate-800/70 bg-gradient-to-br from-slate-900 to-slate-950 p-5">
      <div className="flex items-center gap-3">
        <div className={cls("h-11 w-11 grid place-items-center rounded-xl ring-1", ring)}>
          {icon}
        </div>
        <div>
          <p className="text-slate-400 text-xs">{label}</p>
          <p className="text-slate-100 text-lg font-semibold">{value}</p>
        </div>
      </div>
    </div>
  );
};

const Table: React.FC<{
  cols: string[];
  rows: React.ReactNode[][];
  emptyMsg?: string;
}> = ({ cols, rows, emptyMsg = "Sin datos" }) => (
  <div className="overflow-x-auto rounded-2xl border border-slate-800/60">
    <table className="min-w-full text-sm">
      <thead className="bg-slate-900/60 text-slate-300">
        <tr>
          {cols.map((c, i) => (
            <th key={i} className="px-4 py-3 text-left font-medium">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-800/70">
        {rows.length === 0 ? (
          <tr>
            <td className="px-4 py-6 text-slate-500" colSpan={cols.length}>
              {emptyMsg}
            </td>
          </tr>
        ) : (
          rows.map((r, i) => (
            <tr key={i} className="hover:bg-slate-900/40">
              {r.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-slate-200">
                  {cell}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

const ReporteFinanza: React.FC = () => {
  const navigate = useNavigate();

  // ✅ Verificación de admin como en tu ejemplo
  const { isAdmin, loading: adminLoading } = useAdminCheck();

  const [desde, setDesde] = useState<string>("");
  const [hasta, setHasta] = useState<string>("");
  const [propiedadId, setPropiedadId] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReporteFinanciero | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => !loading && !adminLoading && isAdmin, [loading, adminLoading, isAdmin]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const body: any = {};
      if (desde) body.desde = new Date(desde).toISOString();
      if (hasta) body.hasta = new Date(hasta).toISOString();
      if (propiedadId) body.propiedad_id = Number(propiedadId);

      // ejemplo dentro de onSubmit (ya tenés import { api } from "../services/api")
const token = localStorage.getItem("access_token") || "";
const res = await api.post<ReporteFinanciero>(
  "/reportesfinanza/financieros/generar",
  body,
  { headers: { Authorization: `Bearer ${token}` } }
);


      setData(res.data);
    } catch (err) {
      const e = err as ApiError;
      const detail =
        e.response?.data?.detail ||
        e.response?.data?.error ||
        e.message ||
        "Error generando reporte";
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  const seriesRows =
    data?.series_mensuales?.map((s) => [s.mes, fmtMoney(s.generado), fmtMoney(s.cobrado)]) ?? [];

  const deudoresRows =
    data?.top_deudores?.map((d) => [
      `Propiedad #${d.propiedad_id}`,
      fmtMoney(d.deuda),
      fmtMoney(d.vencido),
    ]) ?? [];

  return (
    <DashboardLayout
      title="Reporte financiero"
      subtitle="Genera y analiza ingresos, deudas y morosidad"
      icon={<BarChart3 className="h-5 w-5 text-blue-400" />}
    >
      {/* Mensaje si no es admin */}
      {!adminLoading && !isAdmin && (
        <div className="mb-6 mx-2 sm:mx-0 rounded-xl border border-amber-800/50 bg-amber-900/20 p-4 text-amber-200 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" />
          Solo los administradores pueden generar reportes financieros.
        </div>
      )}

      {/* Filtros */}
      <form
        onSubmit={onSubmit}
        className="mb-8 rounded-2xl border border-slate-800/60 bg-gradient-to-r from-blue-950/60 via-slate-900 to-slate-950 p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1">
            <span className="text-slate-300 text-xs flex items-center gap-2">
              <CalendarClock className="h-4 w-4" /> Desde
            </span>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="rounded-xl bg-slate-950/60 border border-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 ring-blue-600/40"
              disabled={!isAdmin || adminLoading}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-slate-300 text-xs flex items-center gap-2">
              <CalendarClock className="h-4 w-4" /> Hasta
            </span>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="rounded-xl bg-slate-950/60 border border-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 ring-blue-600/40"
              disabled={!isAdmin || adminLoading}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-slate-300 text-xs flex items-center gap-2">
              <Home className="h-4 w-4" /> Propiedad (opcional)
            </span>
            <input
              type="number"
              min={1}
              placeholder="ID propiedad"
              value={propiedadId}
              onChange={(e) => setPropiedadId(e.target.value)}
              className="rounded-xl bg-slate-950/60 border border-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 ring-blue-600/40"
              disabled={!isAdmin || adminLoading}
            />
          </label>

          <div className="flex items-end gap-3">
            <button
              type="submit"
              disabled={!canSubmit}
              className={cls(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 font-medium transition",
                "bg-blue-600/90 text-white ring-1 ring-inset ring-blue-500/40 hover:brightness-110",
                (!isAdmin || loading) && "opacity-60 cursor-not-allowed"
              )}
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Generando…
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4" /> Generar
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-xl px-4 py-2 text-slate-300 border border-slate-700/60 hover:bg-slate-900/50"
            >
              Volver
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 text-rose-400 text-sm">
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        )}
      </form>

      {/* Resultados */}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
            <MetricCard
              icon={<CircleDollarSign className="h-5 w-5 text-emerald-400" />}
              label="Total generado"
              value={fmtMoney(data.totales.generado)}
              accent="emerald"
            />
            <MetricCard
              icon={<Wallet className="h-5 w-5 text-sky-400" />}
              label="Total cobrado"
              value={fmtMoney(data.totales.cobrado)}
              accent="sky"
            />
            <MetricCard
              icon={<AlertTriangle className="h-5 w-5 text-amber-400" />}
              label="Deuda total"
              value={fmtMoney(data.totales.deuda)}
              accent="amber"
            />
            <MetricCard
              icon={<AlertTriangle className="h-5 w-5 text-rose-400" />}
              label="Vencido (expensas)"
              value={fmtMoney(data.totales.vencido_expensas)}
              accent="rose"
            />
          </div>

          <div className="mb-8">
            <h3 className="text-slate-200 font-semibold mb-3">Series mensuales</h3>
            <Table cols={["Mes", "Generado", "Cobrado"]} rows={seriesRows} emptyMsg="No hay series para el rango seleccionado." />
          </div>

          <div className="mb-8">
            <h3 className="text-slate-200 font-semibold mb-3">Top deudores</h3>
            <Table cols={["Propiedad", "Deuda", "Vencido (expensas)"]} rows={deudoresRows} emptyMsg="Sin deudas en el rango seleccionado." />
          </div>

          <div className="grid gap-8">
            <section>
              <h3 className="text-slate-200 font-semibold mb-3">Detalle de expensas</h3>
              <Table
                cols={["ID", "Propiedad", "Fecha", "Total", "Pagado", "Pendiente", "Vencimiento"]}
                rows={
                  data.detalle.expensas.map((e) => [
                    `#${e.id}`,
                    e.propiedad_id,
                    new Date(e.fecha).toLocaleDateString(),
                    fmtMoney(e.total),
                    fmtMoney(e.pagado),
                    fmtMoney(e.pendiente),
                    e.fecha_vencimiento ? new Date(e.fecha_vencimiento).toLocaleString() : "—",
                  ]) || []
                }
              />
            </section>

            <section>
              <h3 className="text-slate-200 font-semibold mb-3">Detalle de multas</h3>
              <Table
                cols={["ID", "Propiedad", "Fecha", "Total", "Pagado", "Pendiente"]}
                rows={
                  data.detalle.multas.map((m) => [
                    `#${m.id}`,
                    m.propiedad_id,
                    new Date(m.fecha).toLocaleDateString(),
                    fmtMoney(m.total),
                    fmtMoney(m.pagado),
                    fmtMoney(m.pendiente),
                  ]) || []
                }
              />
            </section>

            <section>
              <h3 className="text-slate-200 font-semibold mb-3">Pagos</h3>
              <Table
                cols={["ID", "Fecha", "Monto", "Estado", "Tipo de pago"]}
                rows={
                  data.detalle.pagos.map((p) => [
                    `#${p.id}`,
                    new Date(p.fecha).toLocaleString(),
                    fmtMoney(p.monto_total),
                    p.estado_pago_id === 2 ? "Pagado" : "Pendiente",
                    p.tipo_pago_id ?? "—",
                  ]) || []
                }
              />
            </section>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 border border-slate-700/60 text-slate-200 hover:bg-slate-900/60"
              onClick={() => window.print()}
            >
              <Download className="h-4 w-4" /> Imprimir / Guardar PDF
            </button>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default ReporteFinanza;
