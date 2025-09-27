import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../Layouts/DashboardLayout";
import { useNavigate } from "react-router-dom";
import { useAdminCheck } from "../hooks/useRoles";
import { api } from "../services/api"; // ← ajusta la ruta si tu api.ts está en otra carpeta
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Filter, Download, RefreshCw, ShieldAlert } from "lucide-react";

/* ===================== Tipos (acorde a backend) ===================== */
type Riesgo = "alto" | "medio" | "bajo";

interface MorosidadTopItem {
  propiedad_id: number;
  nro_casa: string;
  saldo_total: number;
  riesgo: Riesgo;
  motivo: string;
}

interface MorosidadKPIs {
  porcentaje_alto: number;
  porcentaje_medio: number;
  porcentaje_bajo: number;
  saldo_total_expensas: number;
  saldo_total_reservas: number;
  saldo_total_multas: number;
  top5_propiedades: MorosidadTopItem[];
}

interface AreasTopHora {
  area_social_id: number;
  nombre_area: string;
  dow: number; // 0-6
  hora: number; // 0-23
  demanda_esperada: number;
}
interface AreasTopArea {
  area_social_id: number;
  nombre_area?: string;
  demanda_total_periodo: number;
}
interface AreasKPIs {
  top5_horas_pico: AreasTopHora[];
  top3_areas_por_demanda: AreasTopArea[];
}

interface SeguridadHotHour {
  hora: string; // ISO
  zscore: number;
}
interface SeguridadKPIs {
  horas_calientes_autos: SeguridadHotHour[];
  horas_calientes_personas: SeguridadHotHour[];
  anomalias_pendientes: number;
}

interface DashboardResp {
  morosidad: MorosidadKPIs;
  areas: AreasKPIs;
  seguridad: SeguridadKPIs;
  filtros: { torre_id?: number | null; desde?: string | null; hasta?: string | null; tz: string };
}

interface MorosidadItem {
  propiedad_id: number;
  nro_casa: string;
  saldo_expensas: number;
  saldo_reservas: number;
  saldo_multas: number;
  saldo_total: number;
  atraso_max_90d: number;
  pagos_a_tiempo_6m_pct: number | null;
  multas_recientes_90d_count: number;
  multas_recientes_90d_monto: number;
  multas_recientes_90d_sin_cubrir_count: number;
  score: number;
  riesgo: Riesgo;
  motivo: string;
}
interface MorosidadListResp {
  items: MorosidadItem[];
  total: number;
}

/* ===================== Utiles ===================== */
const COLORS = ["#3B82F6", "#1E40AF", "#60A5FA", "#93C5FD", "#DBEAFE"];

function dowName(dow: number) {
  const es = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  return es[Math.max(0, Math.min(6, dow))];
}

async function downloadCsv(params: Record<string, any>) {
  // /api/analytics/export?tipo=...
  const res = await api.get("/analytics/export", {
    params,
    responseType: "blob",
  });
  const contentDisp = res.headers["content-disposition"] || "";
  const match = /filename="?([^"]+)"?/i.exec(contentDisp);
  const fileName = match?.[1] || "reporte.csv";
  const blobUrl = URL.createObjectURL(new Blob([res.data], { type: res.data.type || "text/csv" }));
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}

/* ===================== Página ===================== */
const Predictivo: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminCheck();

  // Filtros simples para dashboard
  const [desde, setDesde] = useState<string>("");
  const [hasta, setHasta] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(true);
  const [dash, setDash] = useState<DashboardResp | null>(null);
  const [morosidadList, setMorosidadList] = useState<MorosidadItem[]>([]);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAdmin, adminLoading, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [d, m] = await Promise.all([
        api
          .get<DashboardResp>("/analytics/dashboard", {
            params: {
              desde: desde || undefined,
              hasta: hasta || undefined,
            },
          })
          .then((r) => r.data),
        api
          .get<MorosidadListResp>("/analytics/morosidad", {
            params: { ordering: "-score", limit: 10 },
          })
          .then((r) => r.data),
      ]);
      setDash(d);
      setMorosidadList(m.items || []);
    } catch (_e) {
      setDash(null);
      setMorosidadList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const distribRiesgo = useMemo(() => {
    if (!dash) return [];
    return [
      { name: "Alto", value: dash.morosidad.porcentaje_alto || 0 },
      { name: "Medio", value: dash.morosidad.porcentaje_medio || 0 },
      { name: "Bajo", value: dash.morosidad.porcentaje_bajo || 0 },
    ];
  }, [dash]);

  if (adminLoading) {
    return (
      <DashboardLayout title="Predictivo" subtitle="Analítica por riesgo, demanda y seguridad">
        <div className="flex items-center justify-center min-h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      </DashboardLayout>
    );
  }
  if (!isAdmin) return null;

  return (
    <DashboardLayout
      title="Predictivo"
      subtitle="Demanda esperada por áreas, distribución de riesgo y horas calientes de seguridad"
    >
      {/* Filtros y acciones */}
      <div className="bg-gray-800 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Filter size={20} className="text-blue-400" />
            Filtros
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setDesde("");
                setHasta("");
              }}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
            >
              Limpiar
            </button>
            <button
              onClick={loadData}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm"
            >
              Aplicar
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Fecha desde</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Fecha hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Export rápido */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-300 mb-2">Exportaciones</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => downloadCsv({ tipo: "csv_morosidad", desde: desde || undefined, hasta: hasta || undefined })}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm"
              >
                <Download size={16} /> Morosidad CSV
              </button>
              <button
                onClick={() => downloadCsv({ tipo: "csv_areas" })}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm"
              >
                <Download size={16} /> Áreas CSV
              </button>
              <button
                onClick={() => downloadCsv({ tipo: "csv_seguridad" })}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm"
              >
                <Download size={16} /> Seguridad CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Estado de carga */}
      {loading && (
        <div className="flex items-center justify-center min-h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      )}

      {!loading && dash && (
        <div className="max-w-7xl mx-auto w-full space-y-8">
          {/* KPIs resumidos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6">
              <p className="text-blue-100 text-sm">Saldos Expensas</p>
              <p className="text-3xl text-white font-bold">
                {dash.morosidad.saldo_total_expensas.toFixed(2)}
              </p>
            </div>
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl p-6">
              <p className="text-indigo-100 text-sm">Saldos Reservas</p>
              <p className="text-3xl text-white font-bold">
                {dash.morosidad.saldo_total_reservas.toFixed(2)}
              </p>
            </div>
            <div className="bg-gradient-to-br from-sky-600 to-sky-700 rounded-xl p-6">
              <p className="text-sky-100 text-sm">Saldos Multas</p>
              <p className="text-3xl text-white font-bold">
                {dash.morosidad.saldo_total_multas.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Distribución de Riesgo (Pie) y Top Áreas (Bar) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Pie: distribución de riesgo */}
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Distribución de riesgo</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={distribRiesgo}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${(value * 100).toFixed(1)}%`}
                  >
                    {distribRiesgo.map((_, idx) => (
                      <Cell key={`cell-r-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: 8,
                      color: "#E5E7EB",
                    }}
                    formatter={(v: any) => [`${(Number(v) * 100).toFixed(1)}%`, "Porcentaje"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Barras: top áreas por demanda prevista */}
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Top áreas por demanda</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dash.areas.top3_areas_por_demanda}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="nombre_area" tick={{ fill: "#9CA3AF" }} />
                  <YAxis tick={{ fill: "#9CA3AF" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: 8,
                      color: "#E5E7EB",
                    }}
                  />
                  <Bar dataKey="demanda_total_periodo" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Horas pico (tabla compacta) + Top5 propiedades en riesgo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Horas pico por área (compacto) */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Horas pico (últimas 8 semanas)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left p-3 text-gray-300 font-medium">Área</th>
                      <th className="text-left p-3 text-gray-300 font-medium">Día</th>
                      <th className="text-left p-3 text-gray-300 font-medium">Hora</th>
                      <th className="text-right p-3 text-gray-300 font-medium">Demanda esperada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dash.areas.top5_horas_pico.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-gray-400">Sin datos</td>
                      </tr>
                    ) : (
                      dash.areas.top5_horas_pico.map((h, i) => (
                        <tr key={i} className="border-b border-gray-700 hover:bg-gray-700/50">
                          <td className="p-3 text-blue-400">{h.nombre_area}</td>
                          <td className="p-3 text-white">{dowName(h.dow)}</td>
                          <td className="p-3 text-white">{h.hora}:00</td>
                          <td className="p-3 text-right text-green-400">{h.demanda_esperada.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top 5 propiedades en riesgo */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Top propiedades por riesgo</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left p-3 text-gray-300 font-medium">Propiedad</th>
                      <th className="text-left p-3 text-gray-300 font-medium">Riesgo</th>
                      <th className="text-right p-3 text-gray-300 font-medium">Saldo total</th>
                      <th className="text-left p-3 text-gray-300 font-medium">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dash.morosidad.top5_propiedades || []).map((p, i) => (
                      <tr key={i} className="border-b border-gray-700 hover:bg-gray-700/50">
                        <td className="p-3 text-white">{p.nro_casa || `#${p.propiedad_id}`}</td>
                        <td className="p-3">
                          <span
                            className={
                              p.riesgo === "alto"
                                ? "px-2 py-1 rounded bg-red-500/20 text-red-300 text-xs"
                                : p.riesgo === "medio"
                                ? "px-2 py-1 rounded bg-amber-500/20 text-amber-300 text-xs"
                                : "px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 text-xs"
                            }
                          >
                            {p.riesgo.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 text-right text-green-400 font-medium">
                          {p.saldo_total.toFixed(2)}
                        </td>
                        <td className="p-3 text-gray-300">{p.motivo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Si quieres más detalle, usamos morosidadList cargado aparte */}
                {morosidadList.length > 0 && (
                  <p className="mt-3 text-xs text-gray-400">
                    Mostrando ranking por score. Usa la página de Morosidad para filtrar/ordenar.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Seguridad: horas calientes y anomalias pendientes */}
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Seguridad (resumen)</h3>
              {dash.seguridad.anomalias_pendientes > 0 && (
                <div className="flex items-center gap-2 text-amber-300">
                  <ShieldAlert className="h-5 w-5" />
                  {dash.seguridad.anomalias_pendientes} anomalía(s) pendiente(s)
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm text-gray-300 mb-2">Horas calientes — Autos</h4>
                <div className="space-y-2">
                  {(dash.seguridad.horas_calientes_autos || []).slice(0, 5).map((h, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-700/60 rounded-lg px-3 py-2">
                      <span className="text-white">{new Date(h.hora).toLocaleString()}</span>
                      <span className="text-blue-300 text-sm">z={h.zscore.toFixed(2)}</span>
                    </div>
                  ))}
                  {(!dash.seguridad.horas_calientes_autos || dash.seguridad.horas_calientes_autos.length === 0) && (
                    <p className="text-gray-400 text-sm">Sin anomalías destacadas.</p>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-sm text-gray-300 mb-2">Horas calientes — Personas</h4>
                <div className="space-y-2">
                  {(dash.seguridad.horas_calientes_personas || []).slice(0, 5).map((h, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-700/60 rounded-lg px-3 py-2">
                      <span className="text-white">{new Date(h.hora).toLocaleString()}</span>
                      <span className="text-blue-300 text-sm">z={h.zscore.toFixed(2)}</span>
                    </div>
                  ))}
                  {(!dash.seguridad.horas_calientes_personas || dash.seguridad.horas_calientes_personas.length === 0) && (
                    <p className="text-gray-400 text-sm">Sin anomalías destacadas.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && !dash && (
        <div className="rounded-xl border border-amber-800/40 bg-amber-900/20 p-4 text-amber-200">
          No se pudieron cargar los datos de analítica.
        </div>
      )}
    </DashboardLayout>
  );
};

export default Predictivo;
