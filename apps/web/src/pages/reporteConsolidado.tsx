import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../Layouts/DashboardLayout";
import { useAdminCheck } from "../hooks/useRoles";
import { api } from "../services/api";
import {
  BarChart3,
  Shield,
  ClipboardList,
  Building2,
  CalendarClock,
  Home,
  Download,
  RefreshCw,
  ShieldAlert,
  Users,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  CircleDollarSign,
} from "lucide-react";

/* ===================== Tipos ===================== */
// Finanzas (idéntico a tu página existente)
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

// Reservas (idéntico a tu reporte de áreas comunes)
interface AreaSocial {
  id: number;
  nombre: string;
  precioxhora: string;
}
interface Reserva {
  id: number;
  fecha: string; // YYYY-MM-DD
  hora_inicio_id: number | null;
  hora_fin_id: number | null;
  total: string | null;
  created_at: string | null;
  nro_casa?: string | null;
  propiedad_id?: number | null;
  area_social: AreaSocial;
}

// Mantenimiento (resumen mínimo)
type CostoTrabajo = {
  id: number;
  costo_total: number | null;
  material: string | null;
  preciomaterial: number | null;
  preciomanoobra: number | null;
  horas_trabajadas: number | null;
};
type HistorialItem = {
  id: number;
  descripcion: string;
  costo: number | null;
  fecha_programada: string | null;
  estado_trabajo: string | null;
  estado_trabajo_id: number | null;
  catalogo_id: number | null;
  catalogo_nombre: string | null;
  creado_por: string | null;
  ordenado_a: string | null;
  hora_valor: string | null;
  hora_id: number | null;
  tipo: string | null;
  costos: CostoTrabajo[];
};

// Seguridad (nuestro endpoint público)
type IngresoSeg = {
  id: number;
  usuario_id: string;
  invitado: boolean;
  ts: string; // ISO
  resultado: "Permitido" | "Rechazado" | string;
  nombre_invitado: string | null;
};

type ApiError = {
  response?: { data?: any; status?: number };
  message?: string;
};

/* ===================== Utils ===================== */
const fmtMoney = (v?: string | number | null) =>
  new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    maximumFractionDigits: 2,
  }).format(Number(v || 0));

const cls = (...xs: Array<string | false | null | undefined>) =>
  xs.filter(Boolean).join(" ");

const toISODate = (d?: string) => (d ? new Date(d).toISOString() : undefined);

/* ===================== UI helpers (reutilizados) ===================== */
const MetricCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent?: "emerald" | "sky" | "violet" | "amber" | "rose" | "blue";
}> = ({ icon, label, value, accent = "sky" }) => {
  const ring =
    {
      emerald: "ring-emerald-500/30 bg-emerald-600/15",
      sky: "ring-sky-500/30 bg-sky-600/15",
      violet: "ring-violet-500/30 bg-violet-600/15",
      amber: "ring-amber-500/30 bg-amber-600/15",
      rose: "ring-rose-500/30 bg-rose-600/15",
      blue: "ring-blue-500/30 bg-blue-600/15",
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
}> = ({ cols, rows, emptyMsg = "Sin datos" }) => {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800/60 p-6 text-center text-slate-500">
        {emptyMsg}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mobile: tarjetas apiladas */}
      <div className="grid gap-3 sm:hidden">
        {rows.map((cells, i) => (
          <div key={i} className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-4">
            <dl className="grid grid-cols-1 gap-2">
              {cells.map((cell, j) => (
                <div key={j} className="flex items-start justify-between gap-3">
                  <dt className="text-slate-400 text-xs">{cols[j]}</dt>
                  <dd className="text-slate-100 text-sm text-right">{cell}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      {/* Desktop/Tablet: tabla tradicional */}
      <div className="hidden sm:block overflow-x-auto rounded-2xl border border-slate-800/60">
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
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-slate-900/40">
                {r.map((cell, j) => (
                  <td key={j} className="px-4 py-3 text-slate-200">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ===================== Página principal ===================== */
const ReporteConsolidado: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminCheck(); // solo rol 1

  // Filtros globales (por defecto vacíos -> carga TODO)
  const [desde, setDesde] = useState<string>("");
  const [hasta, setHasta] = useState<string>("");
  const [propiedadId, setPropiedadId] = useState<string>("");

  // Estado fetch
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Datos
  const [finanzas, setFinanzas] = useState<ReporteFinanciero | null>(null);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  // @ts-ignore
    const [areas, setAreas] = useState<AreaSocial[]>([]);
  const [mantenimiento, setMantenimiento] = useState<HistorialItem[]>([]);
  const [seguridad, setSeguridad] = useState<IngresoSeg[]>([]);

  // Helpers
  const canSubmit = useMemo(() => !loading && !adminLoading && isAdmin, [loading, adminLoading, isAdmin]);

  // CARGA AUTOMÁTICA APENAS ENTRA (sin filtros -> TODO el histórico)
  useEffect(() => {
    if (!adminLoading && isAdmin) {
      void loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminLoading, isAdmin]);

  // Función central de carga (usa los filtros actuales si están seteados)
  const loadData = async () => {
    if (!isAdmin) return;

    setLoading(true);
    setError(null);

    try {
      // Finanzas (POST con token explícito como en tu página)
      const finBody: any = {};
      if (desde) finBody.desde = toISODate(desde);
      if (hasta) finBody.hasta = toISODate(hasta);
      if (propiedadId) finBody.propiedad_id = Number(propiedadId);

      const token = localStorage.getItem("access_token") || "";

      const finanzaP = api
        .post<ReporteFinanciero>("/reportesfinanza/financieros/generar", finBody, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((r) => r.data)
        .catch((_e) => null);

      // Reservas (GET listas y calculamos en cliente)
      const reservasP = Promise.all([
        api.get<AreaSocial[]>("/areas-sociales/").then((r) => r.data).catch(() => [] as AreaSocial[]),
        api.get<Reserva[]>("/reservas-areas/").then((r) => r.data).catch(() => [] as Reserva[]),
      ]);

      // Mantenimiento (GET con posibles filtros de fecha)
      const mantParams: any = {};
      if (desde) mantParams.fecha_desde = desde;
      if (hasta) mantParams.fecha_hasta = hasta;

      const mantenimientoP = api
        .get<HistorialItem[]>("/historial-mantenimiento/", { params: mantParams })
        .then((r) => (Array.isArray(r.data) ? r.data : []))
        .catch(() => [] as HistorialItem[]);

      // Seguridad (GET de nuestro endpoint público — lo llamamos vía api igualmente)
      const segParams: any = {};
      if (desde) segParams.fecha_desde = desde;
      if (hasta) segParams.fecha_hasta = hasta;

      const seguridadP = api
        .get<IngresoSeg[]>("/reportes-consolidados/ingresos/", { params: segParams })
        .then((r) => (Array.isArray(r.data) ? r.data : []))
        .catch(() => [] as IngresoSeg[]);

      const [finR, [areasR, reservasR], mantR, segR] = await Promise.all([
        finanzaP,
        reservasP,
        mantenimientoP,
        seguridadP,
      ]);

      setFinanzas(finR);
      setAreas(Array.isArray(areasR) ? areasR : []);

      // Filtro de reservas por fecha en cliente solo si el usuario puso rango
      let resList = Array.isArray(reservasR) ? reservasR : [];
      if (desde) resList = resList.filter((r) => r.fecha >= desde);
      if (hasta) resList = resList.filter((r) => r.fecha <= hasta);
      setReservas(resList);

      setMantenimiento(mantR);
      setSeguridad(segR);
    } catch (err) {
      const e = err as ApiError;
      const detail =
        e.response?.data?.detail ||
        e.response?.data?.error ||
        e.message ||
        "Error generando reporte consolidado";
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  // Submit del formulario (recarga con los filtros actuales)
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await loadData();
  };

  /* ===================== Agregaciones ===================== */
  // Reservas
  const reservasStats = useMemo(() => {
    const total = reservas.length;
    const ingresoTotal = reservas.reduce((acc, r) => acc + parseFloat(r.total || "0"), 0);
    const casasUnicas = new Set(
      reservas.map((r) => (r.nro_casa ?? r.propiedad_id ?? "") as string | number)
    ).size;
    // por área
    const byArea: Record<number, { nombre: string; cantidad: number; ingresos: number }> = {};
    for (const r of reservas) {
      const id = r.area_social?.id;
      if (!id) continue;
      if (!byArea[id]) byArea[id] = { nombre: r.area_social.nombre, cantidad: 0, ingresos: 0 };
      byArea[id].cantidad++;
      byArea[id].ingresos += parseFloat(r.total || "0");
    }
    const tablaAreas = Object.values(byArea)
      .sort((a, b) => b.cantidad - a.cantidad)
      .map((x) => [x.nombre, x.cantidad, fmtMoney(x.ingresos)]);
    return { total, ingresoTotal, casasUnicas, tablaAreas };
  }, [reservas]);

  // Mantenimiento
  const mantStats = useMemo(() => {
    const total = mantenimiento.length;
    let costoOrden = 0;
    let costoLineas = 0;
    let cerradas = 0;
    for (const it of mantenimiento) {
      if (typeof it.costo === "number") costoOrden += it.costo;
      const sum = (it.costos || []).reduce((a, c) => a + (c.costo_total || 0), 0);
      costoLineas += sum;
      const est = (it.estado_trabajo || "").toLowerCase();
      if (["cerrada", "cerrado", "completado"].includes(est)) cerradas++;
    }
    return { total, costoOrden, costoLineas, cerradas, abiertas: total - cerradas };
  }, [mantenimiento]);

  // Seguridad
  const segStats = useMemo(() => {
    const total = seguridad.length;
    const permitidos = seguridad.filter((x) => x.resultado === "Permitido").length;
    const rechazados = seguridad.filter((x) => x.resultado === "Rechazado").length;
    const invitados = seguridad.filter((x) => !!x.invitado).length;
    return { total, permitidos, rechazados, invitados };
  }, [seguridad]);

  // Tablas
  const seriesRows =
    finanzas?.series_mensuales?.map((s) => [s.mes, fmtMoney(s.generado), fmtMoney(s.cobrado)]) ?? [];

  const deudoresRows =
    finanzas?.top_deudores?.map((d) => [
      `Propiedad #${d.propiedad_id}`,
      fmtMoney(d.deuda),
      fmtMoney(d.vencido),
    ]) ?? [];

  const mantRows = useMemo(() => {
    return (mantenimiento || [])
      .slice(0, 15)
      .map((it) => [
        `#${it.id}`,
        it.descripcion || "—",
        it.estado_trabajo || "—",
        it.fecha_programada ? new Date(it.fecha_programada).toLocaleDateString() : "—",
        fmtMoney(it.costo ?? 0),
        fmtMoney((it.costos || []).reduce((a, c) => a + (c.costo_total || 0), 0)),
      ]);
  }, [mantenimiento]);

  const segRows = useMemo(() => {
    return (seguridad || [])
      .slice(0, 20)
      .map((x) => [
        new Date(x.ts).toLocaleString(),
        (x.nombre_invitado && x.nombre_invitado.trim()) || "—",
        x.invitado ? "Invitado" : "Residente",
        x.resultado,
        x.usuario_id.slice(0, 8) + "…",
      ]);
  }, [seguridad]);

  /* ===================== Render ===================== */
  if (adminLoading) {
    return (
      <DashboardLayout title="Reporte consolidado" subtitle="Cargando…">
        <div className="flex items-center justify-center min-h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title="Reporte consolidado" subtitle="Acceso restringido">
        <div className="mb-6 mx-2 sm:mx-0 rounded-xl border border-amber-800/50 bg-amber-900/20 p-4 text-amber-200 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" />
          Solo los administradores (rol 1) pueden ver este reporte.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Reporte consolidado"
      subtitle="Finanzas, Seguridad, Reservas y Mantenimiento"
      icon={<BarChart3 className="h-5 w-5 text-blue-400" />}
    >
      {/* Filtros */}
      <form
        onSubmit={onSubmit}
        className="mb-8 rounded-2xl border border-slate-800/60 bg-gradient-to-r from-blue-950/60 via-slate-900 to-slate-950 p-4 sm:p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="flex flex-col gap-1">
            <span className="text-slate-300 text-xs flex items-center gap-2">
              <CalendarClock className="h-4 w-4" /> Desde
            </span>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="rounded-xl bg-slate-950/60 border border-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 ring-blue-600/40"
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
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-slate-300 text-xs flex items-center gap-2">
              <Home className="h-4 w-4" /> Propiedad (finanzas opcional)
            </span>
            <input
              type="number"
              min={1}
              placeholder="ID propiedad"
              value={propiedadId}
              onChange={(e) => setPropiedadId(e.target.value)}
              className="rounded-xl bg-slate-950/60 border border-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 ring-blue-600/40"
            />
          </label>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={!canSubmit}
              className={cls(
                "inline-flex justify-center items-center gap-2 rounded-xl px-4 py-2 font-medium transition",
                "bg-blue-600/90 text-white ring-1 ring-inset ring-blue-500/40 hover:brightness-110",
                loading && "opacity-60 cursor-not-allowed",
                "w-full sm:w-auto"
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
              onClick={() => window.print()}
              className="rounded-xl px-4 py-2 text-slate-300 border border-slate-700/60 hover:bg-slate-900/50 w-full sm:w-auto"
            >
              <Download className="h-4 w-4 inline mr-2" />
              Imprimir / Guardar PDF
            </button>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-xl px-4 py-2 text-slate-300 border border-slate-700/60 hover:bg-slate-900/50 w-full sm:w-auto"
            >
              Volver
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 text-rose-400 text-sm" role="alert" aria-live="assertive">
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        )}
      </form>

      {/* Resumen general */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 mb-8">
        <MetricCard
          icon={<CircleDollarSign className="h-5 w-5 text-emerald-400" />}
          label="Finanzas · Generado"
          value={fmtMoney(finanzas?.totales.generado || 0)}
          accent="emerald"
        />
        <MetricCard
          icon={<Wallet className="h-5 w-5 text-sky-400" />}
          label="Finanzas · Cobrado"
          value={fmtMoney(finanzas?.totales.cobrado || 0)}
          accent="sky"
        />
        <MetricCard
          icon={<Users className="h-5 w-5 text-violet-400" />}
          label="Reservas · Total"
          value={reservasStats.total}
          accent="violet"
        />
        <MetricCard
          icon={<ClipboardList className="h-5 w-5 text-amber-400" />}
          label="Mantenimiento · Órdenes"
          value={mantStats.total}
          accent="amber"
        />
        <MetricCard
          icon={<Shield className="h-5 w-5 text-blue-400" />}
          label="Seguridad · Registros"
          value={segStats.total}
          accent="blue"
        />
        <MetricCard
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />}
          label="Seguridad · Permitidos"
          value={segStats.permitidos}
          accent="emerald"
        />
        <MetricCard
          icon={<AlertTriangle className="h-5 w-5 text-rose-400" />}
          label="Seguridad · Rechazados"
          value={segStats.rechazados}
          accent="rose"
        />
        <MetricCard
          icon={<Building2 className="h-5 w-5 text-purple-300" />}
          label="Reservas · Ingreso total"
          value={fmtMoney(reservasStats.ingresoTotal)}
          accent="violet"
        />
      </div>

      {/* Sección Finanzas */}
      <section className="mb-10">
        <h2 className="text-slate-200 font-semibold mb-3 flex items-center gap-2">
          <Wallet className="h-5 w-5 text-sky-400" /> Finanzas
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="text-slate-300 text-sm mb-2">Series mensuales</h3>
            <Table cols={["Mes", "Generado", "Cobrado"]} rows={seriesRows} emptyMsg="Sin series." />
          </div>
          <div>
            <h3 className="text-slate-300 text-sm mb-2">Top deudores</h3>
            <Table cols={["Propiedad", "Deuda", "Vencido (expensas)"]} rows={deudoresRows} emptyMsg="Sin deudores." />
          </div>
        </div>
      </section>

      {/* Sección Reservas */}
      <section className="mb-10">
        <h2 className="text-slate-200 font-semibold mb-3 flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-blue-400" /> Reservas
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard icon={<Users className="h-5 w-5 text-purple-300" />} label="Propiedades únicas" value={reservasStats.casasUnicas} accent="violet" />
          <MetricCard icon={<CircleDollarSign className="h-5 w-5 text-emerald-300" />} label="Ingreso total" value={fmtMoney(reservasStats.ingresoTotal)} accent="emerald" />
          <MetricCard
            icon={<BarChart3 className="h-5 w-5 text-orange-300" />}
            label="Promedio por reserva"
            value={
              reservasStats.total > 0
                ? fmtMoney(reservasStats.ingresoTotal / reservasStats.total)
                : fmtMoney(0)
            }
            accent="amber"
          />
        </div>
        <div className="mt-4">
          <h3 className="text-slate-300 text-sm mb-2">Actividad por área</h3>
          <Table cols={["Área", "Reservas", "Ingresos"]} rows={reservasStats.tablaAreas} emptyMsg="Sin reservas." />
        </div>
      </section>

      {/* Sección Mantenimiento */}
      <section className="mb-10">
        <h2 className="text-slate-200 font-semibold mb-3 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-amber-400" /> Mantenimiento
        </h2>
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard icon={<ClipboardList className="h-5 w-5 text-slate-200" />} label="Órdenes" value={mantStats.total} accent="blue" />
          <MetricCard icon={<CheckCircle2 className="h-5 w-5 text-emerald-300" />} label="Cerradas" value={mantStats.cerradas} accent="emerald" />
          <MetricCard icon={<AlertTriangle className="h-5 w-5 text-amber-300" />} label="Abiertas" value={mantStats.abiertas} accent="amber" />
          <MetricCard icon={<Wallet className="h-5 w-5 text-sky-300" />} label="Costos (orden + trabajos)" value={fmtMoney(mantStats.costoOrden + mantStats.costoLineas)} accent="sky" />
        </div>
        <div className="mt-4">
          <h3 className="text-slate-300 text-sm mb-2">Últimas órdenes</h3>
          <Table
            cols={["ID", "Descripción", "Estado", "Fecha", "Costo orden", "Costos trabajos"]}
            rows={mantRows}
            emptyMsg="Sin historial."
          />
        </div>
      </section>

      {/* Sección Seguridad */}
      <section className="mb-10">
        <h2 className="text-slate-200 font-semibold mb-3 flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-400" /> Seguridad (Registro de ingresos)
        </h2>
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard icon={<Shield className="h-5 w-5 text-blue-400" />} label="Registros" value={segStats.total} accent="blue" />
          <MetricCard icon={<Users className="h-5 w-5 text-violet-300" />} label="Invitados" value={segStats.invitados} accent="violet" />
          <MetricCard icon={<CheckCircle2 className="h-5 w-5 text-emerald-300" />} label="Permitidos" value={segStats.permitidos} accent="emerald" />
          <MetricCard icon={<AlertTriangle className="h-5 w-5 text-rose-300" />} label="Rechazados" value={segStats.rechazados} accent="rose" />
        </div>
        <div className="mt-4">
          <h3 className="text-slate-300 text-sm mb-2">Eventos recientes</h3>
          <Table
            cols={["Fecha/Hora", "Nombre", "Tipo", "Resultado", "Usuario"]}
            rows={segRows}
            emptyMsg="Sin registros de ingreso."
          />
        </div>
      </section>
    </DashboardLayout>
  );
};

export default ReporteConsolidado;