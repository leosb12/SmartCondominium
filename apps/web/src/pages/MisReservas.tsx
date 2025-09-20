// src/pages/MisReservas.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import DashboardLayout from "../Layouts/DashboardLayout";
import {
  Calendar,
  Clock,
  MapPin,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  RefreshCw
} from "lucide-react";

// Interfaces
interface Reserva {
  id: number;
  area_social_id?: number;
  area_social_nombre?: string;
  fecha?: string;
  hora_inicio_valor?: string;
  hora_fin_valor?: string;
  estado?: string;
  total?: number;
  created_at?: string;
  fecha_vencimiento?: string;
}

export default function MisReservas() {
  const navigate = useNavigate();

  // Estados
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Utilidades
  const formatCurrency = (amount: number) => {
    if (amount === null || amount === undefined || isNaN(amount)) return "$0";
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "No definida";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "Fecha inválida";
    return date.toLocaleDateString("es-CO");
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return "--";
    
    // Si está en formato HH:MM:SS, quitar los segundos
    if (timeStr.includes(':')) {
      return timeStr.substring(0, 5); // Tomar solo HH:MM
    }
    
    return timeStr;
  };

  // Cargar reservas
  const loadReservas = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");
      
      const response = await api.get("/reservas/mis-reservas/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Manejar formato de respuesta {status: 'success', data: [...]}
      let reservasData = [];
      
      if (Array.isArray(response.data)) {
        reservasData = response.data;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        reservasData = response.data.data;
      } else if (response.data && response.data.results && Array.isArray(response.data.results)) {
        reservasData = response.data.results;
      }
      
      console.log("📋 Datos finales de reservas:", reservasData);
      if (reservasData.length > 0) {
        console.log("🔍 Primera reserva completa:", JSON.stringify(reservasData[0], null, 2));
      }
      
      setReservas(reservasData);
    } catch (error) {
      console.error("Error cargando reservas:", error);
      setError("Error al cargar las reservas");
    } finally {
      setLoading(false);
    }
  };

  // Carga inicial
  useEffect(() => {
    loadReservas();
  }, []);

  // Limpiar error después de 5 segundos
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-900/60 px-6 sm:px-10 py-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate("/areas-comunes")}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-slate-400" />
          </button>
          <div className="p-2 bg-purple-600/20 rounded-lg">
            <Calendar className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Mis Reservas</h1>
            <p className="text-slate-400">Consulta y gestiona tus reservas de áreas sociales</p>
          </div>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className="mt-4 rounded-lg border border-red-700/50 bg-red-900/30 px-4 py-3 text-sm flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400" />
            {error}
          </div>
        )}
      </div>

      {/* Contenido principal */}
      <main className="px-6 sm:px-10 py-8">
        <div className="max-w-4xl mx-auto">
          <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 shadow-xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-600/20 rounded-lg">
                  <Calendar className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Historial de Reservas</h2>
                  <p className="text-slate-400">Todas tus reservas de áreas sociales</p>
                </div>
              </div>

              {/* Lista de reservas */}
              <div className="space-y-4">
                {reservas.map((reserva) => (
                  <div key={reserva.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-purple-600/20 rounded-lg">
                          <MapPin className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white mb-1">{reserva.area_social_nombre || 'Área no definida'}</h3>
                          <div className="space-y-1 text-sm text-slate-400">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} />
                              <span>Fecha: {reserva.fecha ? formatDate(reserva.fecha) : 'No definida'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock size={14} />
                              <span>Horario: {formatTime(reserva.hora_inicio_valor || '')} - {formatTime(reserva.hora_fin_valor || '')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle size={14} />
                              <span className={`px-2 py-1 rounded text-xs ${
                                reserva.estado === 'confirmada' ? 'bg-green-600/20 text-green-400' :
                                reserva.estado === 'confirmada' ? 'bg-yellow-600/20 text-yellow-400' :
                                reserva.estado === 'confirmada' ? 'bg-red-600/20 text-red-400' :
                                'bg-blue-600/20 text-blue-400'
                              }`}>
                                {reserva.estado ? 
                                  reserva.estado.charAt(0).toUpperCase() + reserva.estado.slice(1) : 
                                  'Confirmada'
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-white">{reserva.total ? formatCurrency(reserva.total) : '$0'}</div>
                        <div className="text-xs text-slate-400">
                          Vence: {reserva.fecha_vencimiento ? formatDate(reserva.fecha_vencimiento) : 'No definida'}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Reservado: {reserva.created_at ? formatDate(reserva.created_at) : 'No definida'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {reservas.length === 0 && (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-400 mb-2">No tienes reservas</h3>
                    <p className="text-slate-500 mb-4">Aún no has realizado reservas de áreas sociales</p>
                    <button
                      onClick={() => navigate("/areas-comunes")}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
                    >
                      Explorar Áreas Comunes
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </DashboardLayout>
  );
}