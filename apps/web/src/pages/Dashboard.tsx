// src/pages/CondominiumDashboard.tsx
import React, { useEffect, useState } from "react";
import {
  Users,
  DollarSign,
  FileText,
  Building,
  Calendar,
  Wrench,
  BarChart3,
  Shield,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";

// 🧩 Componentes separados (en src/components/*.tsx)
import MenuDashboard from "../components/MenuDashboard";
import type { UserProfile as MenuUser } from "../components/MenuDashboard";
import HeaderDashboard from "../components/HeaderDashboard";
import StatsCard from "../components/cards/StatsCards";
import DashboardCard from "../components/cards/DashboardCard";

type UserProfile = MenuUser;

const CondominiumDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Cargar perfil usando tu token (sin Supabase en el cliente)
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    (async () => {
      try {
        const res = await api.get("/me/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser({
          email: res.data.email ?? "usuario@dominio.com",
          full_name: res.data.full_name ?? "Usuario",
        });
      } catch {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        navigate("/login", { replace: true });
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  // 🚪 Logout: limpiar tokens y salir
  const handleLogout = async () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    navigate("/login", { replace: true });
  };

  const dashboardItems = [
    {
      icon: <FileText className="text-blue-400" size={24} />,
      title: "Gestión Administrativa",
      description: [
        "Registro de usuarios, roles y unidades.",
        "Administración de cuotas y reportes financieros.",
        "Configuración de expensas, multas y otros precios.",
        "Publicación de avisos generales.",
      ],
    },
    {
      icon: <Building className="text-green-400" size={24} />,
      title: "Gestión de Áreas Comunes",
      description: [
        "Configuración de disponibilidad y horarios.",
        "Reportes de uso de instalaciones.",
        "Generación de ingresos por alquiler de espacios.",
      ],
    },
    {
      icon: <Wrench className="text-red-400" size={24} />,
      title: "Mantenimiento",
      description: [
        "Asignación de tareas a personal interno/externo.",
        "Seguimiento de mantenimientos preventivos.",
        "Reportes de costos asociados a reparaciones.",
      ],
    },
    {
      icon: <BarChart3 className="text-purple-400" size={24} />,
      title: "Reportes y Analítica",
      description: [
        "Indicadores financieros (morosidad, ingresos/egresos).",
        "Uso de áreas y servicios por período.",
        "Estadísticas de seguridad con IA (incidentes, accesos).",
        "Reportes visuales para decisiones.",
      ],
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-3 00 flex items-center justify-center">
        <div className="animate-pulse text-sm opacity-80">Cargando panel...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* ⬅️ Menú lateral desacoplado */}
      <MenuDashboard
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onLogout={handleLogout}
      />

      {/* Contenido principal */}
      <div className="lg:ml-64">
        {/* Header desacoplado (mismo contenido) */}
        <HeaderDashboard onOpenSidebar={() => setSidebarOpen(true)} />

        {/* Dashboard Content */}
        <main className="p-6">
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-2">
              Acciones operativas del día a día
            </h2>
            <div className="w-16 h-1 bg-blue-600 rounded-full"></div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              icon={
                <div className="bg-blue-600/20 p-3 rounded-lg">
                  <Users className="text-blue-400" size={24} />
                </div>
              }
              value="248"
              label="Residentes Activos"
              hint="+12% este mes"
              hintColor="text-green-400"
            />
            <StatsCard
              icon={
                <div className="bg-green-600/20 p-3 rounded-lg">
                  <DollarSign className="text-green-400" size={24} />
                </div>
              }
              value="$45,280"
              label="Ingresos Mensuales"
              hint="+8% este mes"
              hintColor="text-green-400"
            />
            <StatsCard
              icon={
                <div className="bg-yellow-600/20 p-3 rounded-lg">
                  <Wrench className="text-yellow-400" size={24} />
                </div>
              }
              value="12"
              label="Tareas Pendientes"
              hint="3 urgentes"
              hintColor="text-red-400"
            />
            <StatsCard
              icon={
                <div className="bg-purple-600/20 p-3 rounded-lg">
                  <Shield className="text-purple-400" size={24} />
                </div>
              }
              value="98.5%"
              label="Seguridad IA"
              hint="Funcionando óptimo"
              hintColor="text-green-400"
            />
          </div>

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {dashboardItems.map((item, index) => (
              <DashboardCard
                key={index}
                icon={item.icon}
                title={item.title}
                description={item.description}
                onClick={() => console.log(`Clicked: ${item.title}`)}
              />
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-white mb-4">Acciones Rápidas</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg transition-all duration-300 transform hover:scale-105">
                <Calendar className="mb-2" size={20} />
                <span className="block font-semibold">Nueva Reserva</span>
              </button>
              <button className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg transition-all duration-300 transform hover:scale-105">
                <FileText className="mb-2" size={20} />
                <span className="block font-semibold">Enviar Aviso</span>
              </button>
              <button className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg transition-all duration-300 transform hover:scale-105">
                <FileText className="mb-2" size={20} />
                <span className="block font-semibold">Generar Reporte</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CondominiumDashboard;
