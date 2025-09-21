import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../Layouts/DashboardLayout";
import { useAdminCheck } from "../hooks/useRoles";
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
  LineChart,
  Line,
} from "recharts";
import {
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  Filter,
  Download,
  RefreshCw,
} from "lucide-react";

/* ===================== Tipos ===================== */
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
  nro_casa?: string | null; // por compatibilidad
  propiedad_id?: number | null; // por compatibilidad
  area_social: AreaSocial;
}
interface ReservaPorArea {
  nombre: string;
  cantidad: number;
  ingresos: number;
  [key: string]: string | number;
}
type ReservasPorMes = Record<string, number>;
interface ChartDataMes {
  mes: string;
  cantidad: number;
  [key: string]: string | number;
}

/* ===================== Config mínima ===================== */
// API base: .env VITE_API_URL o 127.0.0.1:8001/api por defecto
const API_BASE =
  ((import.meta as any)?.env?.VITE_API_URL as string | undefined)?.replace(/\/+$/, "") ||
  "http://127.0.0.1:8001/api";

function buildUrl(path: string) {
  const u = `${API_BASE}/${path.replace(/^\/+/, "")}`;
  return u.endsWith("/") ? u : `${u}/`;
}

async function fetchJSON<T>(path: string): Promise<T> {
  const u = buildUrl(path);
  const res = await fetch(u);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${u} ${text}`);
    }
  const text = await res.text();
  return (text ? (JSON.parse(text) as unknown) : ([] as unknown)) as T;
}

function todayYYYYMMDD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* ===================== Componente ===================== */
const ReportesAreasComunes: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminCheck();

  const [areas, setAreas] = useState<AreaSocial[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);

  // Filtros (cliente)
  const [selectedArea, setSelectedArea] = useState<string>("");
  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");

  const COLORS = ["#3B82F6", "#1E40AF", "#60A5FA", "#93C5FD", "#DBEAFE"];

  // Redirección como tu Gestión de Roles
  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAdmin, adminLoading, navigate]);

  // Cargar datos SIN headers ni tokens
  useEffect(() => {
    const load = async () => {
      if (!isAdmin) return;
      try {
        const [areasData, reservasData] = await Promise.all([
          fetchJSON<AreaSocial[]>("areas-sociales/"),
          fetchJSON<Reserva[]>("reservas-areas/"),
        ]);
        setAreas(Array.isArray(areasData) ? areasData : []);
        setReservas(Array.isArray(reservasData) ? reservasData : []);
      } catch (_e: unknown) {
        // Si ocurre error, dejamos vacíos sin mostrar anotaciones ni errores en pantalla
        setAreas([]);
        setReservas([]);
      }
    };
    load();
  }, [isAdmin]);

  // Filtrado en cliente
  const filteredReservas = useMemo(() => {
    let data = reservas.slice();
    if (selectedArea) data = data.filter((r) => r.area_social.id.toString() === selectedArea);
    if (fechaDesde) data = data.filter((r) => r.fecha >= fechaDesde);
    if (fechaHasta) data = data.filter((r) => r.fecha <= fechaHasta);
    return data;
  }, [reservas, selectedArea, fechaDesde, fechaHasta]);

  // División pasadas/futuras según fecha
  const hoy = todayYYYYMMDD();
  const { futuras, pasadas } = useMemo(() => {
    const futurasArr: Reserva[] = [];
    const pasadasArr: Reserva[] = [];
    for (const r of filteredReservas) {
      // Futuras incluye hoy
      if (r.fecha >= hoy) futurasArr.push(r);
      else pasadasArr.push(r);
    }
    // Orden opcional: futuras ascendente por fecha, pasadas descendente por fecha
    futurasArr.sort((a, b) => a.fecha.localeCompare(b.fecha));
    pasadasArr.sort((a, b) => b.fecha.localeCompare(a.fecha));
    return { futuras: futurasArr, pasadas: pasadasArr };
  }, [filteredReservas, hoy]);

  // Estadísticas
  const estadisticas = useMemo(() => {
    const totalReservas = filteredReservas.length;
    const ingresoTotal = filteredReservas.reduce((acc, r) => acc + parseFloat(r.total || "0"), 0);
    const casasUnicas = new Set(
      filteredReservas.map((r) => (r.nro_casa ?? r.propiedad_id ?? "") as string | number)
    ).size;

    const reservasPorArea: ReservaPorArea[] = areas.map((area) => ({
      nombre: area.nombre,
      cantidad: filteredReservas.filter((r) => r.area_social.id === area.id).length,
      ingresos: filteredReservas
        .filter((r) => r.area_social.id === area.id)
        .reduce((acc, r) => acc + parseFloat(r.total || "0"), 0),
    }));

    const reservasPorMes = filteredReservas.reduce<ReservasPorMes>((acc, r) => {
      const mes = r.fecha.substring(0, 7); // YYYY-MM
      acc[mes] = (acc[mes] || 0) + 1;
      return acc;
    }, {});

    const chartDataMeses: ChartDataMes[] = Object.entries(reservasPorMes).map(
      ([mes, cantidad]) => ({ mes, cantidad })
    );

    return { totalReservas, ingresoTotal, casasUnicas, reservasPorArea, chartDataMeses };
  }, [filteredReservas, areas]);

  const clearFilters = () => {
    setSelectedArea("");
    setFechaDesde("");
    setFechaHasta("");
  };

  // Loading por admin (igual que antes)
  if (adminLoading) {
    return (
      <DashboardLayout title="Reporte de Áreas Comunes" subtitle="Cargando...">
        <div className="flex items-center justify-center min-h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      </DashboardLayout>
    );
  }
  if (!isAdmin) return null;

  // Tabla reutilizable
  const TablaReservas: React.FC<{ titulo: string; data: Reserva[] }> = ({ titulo, data }) => (
    <div className="bg-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{titulo}</h3>
        <span className="text-sm text-gray-400">
          {data.length} registro{data.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left p-3 text-gray-300 font-medium">ID</th>
              <th className="text-left p-3 text-gray-300 font-medium">Fecha</th>
              <th className="text-left p-3 text-gray-300 font-medium">Área</th>
              <th className="text-left p-3 text-gray-300 font-medium">Casa/Propiedad</th>
              <th className="text-left p-3 text-gray-300 font-medium">Hora Inicio</th>
              <th className="text-left p-3 text-gray-300 font-medium">Hora Fin</th>
              <th className="text-left p-3 text-gray-300 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center p-8 text-gray-400">
                  No hay reservas en esta categoría
                </td>
              </tr>
            ) : (
              data.slice(0, 50).map((reserva) => (
                <tr key={reserva.id} className="border-b border-gray-700 hover:bg-gray-700 transition-colors">
                  <td className="p-3 text-gray-400 text-xs">#{reserva.id}</td>
                  <td className="p-3 text-white">
                    {new Date(reserva.fecha).toLocaleDateString("es-ES")}
                  </td>
                  <td className="p-3 text-blue-400">{reserva.area_social.nombre}</td>
                  <td className="p-3 text-white">
                    {reserva.nro_casa ?? reserva.propiedad_id ?? "N/A"}
                  </td>
                  <td className="p-3 text-white">{reserva.hora_inicio_id ?? "N/A"}</td>
                  <td className="p-3 text-white">{reserva.hora_fin_id ?? "N/A"}</td>
                  <td className="p-3 text-green-400 font-medium">
                    ${reserva.total || "0.00"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {data.length > 50 && (
          <div className="text-center mt-4">
            <p className="text-gray-400">
              Mostrando 50 de {data.length} reservas. Usa los filtros para refinar la búsqueda.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <DashboardLayout title="Reporte de Áreas Comunes" subtitle="Análisis de utilización y rentabilidad">
      <div className="max-w-7xl mx-auto w-full">
        {/* Estado y export */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-400">
            Mostrando {filteredReservas.length} de {reservas.length} reservas totales
          </p>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            onClick={() => window.print()}
          >
            <Download size={18} />
            Exportar PDF
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-gray-800 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Filter size={20} className="text-blue-400" />
              Filtros de Reporte
            </h3>
            <button
              onClick={clearFilters}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
            >
              Limpiar Filtros
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Área Social</label>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Todas las áreas</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id.toString()}>
                    {area.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Fecha Desde</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Fecha Hasta</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Reservas</p>
                <p className="text-white text-3xl font-bold">{estadisticas.totalReservas}</p>
              </div>
              <Calendar className="text-blue-200" size={28} />
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Ingresos Total</p>
                <p className="text-white text-3xl font-bold">${estadisticas.ingresoTotal.toFixed(2)}</p>
              </div>
              <DollarSign className="text-green-200" size={28} />
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Propiedades</p>
                <p className="text-white text-3xl font-bold">{estadisticas.casasUnicas}</p>
              </div>
              <Users className="text-purple-200" size={28} />
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Promedio/Reserva</p>
                <p className="text-white text-3xl font-bold">
                  $
                  {estadisticas.totalReservas > 0
                    ? (estadisticas.ingresoTotal / estadisticas.totalReservas).toFixed(2)
                    : "0.00"}
                </p>
              </div>
              <TrendingUp className="text-orange-200" size={28} />
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Pie: reservas por área */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Distribución por Área</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={estadisticas.reservasPorArea}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ nombre, cantidad }) => `${nombre}: ${cantidad}`}
                  outerRadius={80}
                  dataKey="cantidad"
                >
                  {estadisticas.reservasPorArea.map((_, idx) => (
                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: 8,
                    color: "#E5E7EB",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Barras: ingresos por área */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Ingresos por Área</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={estadisticas.reservasPorArea}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="nombre" tick={{ fill: "#9CA3AF" }} />
                <YAxis tick={{ fill: "#9CA3AF" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: 8,
                    color: "#E5E7EB",
                  }}
                />
                <Bar dataKey="ingresos" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Línea: tendencia por mes */}
        {estadisticas.chartDataMeses.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Tendencia de Reservas por Mes</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={estadisticas.chartDataMeses}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="mes" tick={{ fill: "#9CA3AF" }} />
                <YAxis tick={{ fill: "#9CA3AF" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: 8,
                    color: "#E5E7EB",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="cantidad"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={{ fill: "#3B82F6", strokeWidth: 2, r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Detalle dividido */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <TablaReservas titulo="Reservas Futuras (incluye hoy)" data={futuras} />
          <TablaReservas titulo="Reservas Pasadas" data={pasadas} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ReportesAreasComunes;