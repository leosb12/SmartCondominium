// src/pages/CondominiumDashboard.tsx
import React, { useEffect, useState } from "react";
import {
  Users,
  DollarSign,
  FileText,
  Bell,
  Building,
  Calendar,
  Wrench,
  BarChart3,
  Settings,
  LogOut,
  Home,
  Shield,
  Menu,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient"; // 👈 tu cliente Supabase

type UserProfile = {
  email: string;
  full_name: string;
};

interface DashboardCardProps {
  icon: React.ReactNode;
  title: string;
  description: string[];
  onClick?: () => void;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  icon,
  title,
  description,
  onClick,
}) => (
  <div
    className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 hover:bg-slate-800/70 transition-all duration-300 cursor-pointer group backdrop-blur-sm"
    onClick={onClick}
  >
    <div className="flex items-center mb-4">
      <div className="bg-blue-600/20 p-3 rounded-lg group-hover:bg-blue-600/30 transition-all duration-300">
        {icon}
      </div>
    </div>
    <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
    <ul className="space-y-2">
      {description.map((item, index) => (
        <li key={index} className="text-slate-300 text-sm flex items-start">
          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
          {item}
        </li>
      ))}
    </ul>
  </div>
);

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onLogout: () => Promise<void>;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  user,
  onLogout,
}) => {
  const initial = (user?.full_name || user?.email || "U")
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed left-0 top-0 h-full w-64 bg-slate-900/95 backdrop-blur-sm border-r border-slate-700/50 z-50 transform transition-transform duration-300 lg:translate-x-0
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
          <h2 className="text-xl font-bold text-blue-400">Smart Condominium</h2>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="p-6">
          <ul className="space-y-2">
            <li>
              <a
                href="#"
                className="flex items-center space-x-3 text-blue-400 bg-blue-600/20 p-3 rounded-lg"
              >
                <Home size={20} />
                <span>Dashboard</span>
              </a>
            </li>
            <li>
              <a
                href="#"
                className="flex items-center space-x-3 text-slate-300 hover:text-white hover:bg-slate-800/50 p-3 rounded-lg transition-all"
              >
                <Users size={20} />
                <span>Residentes</span>
              </a>
            </li>
            <li>
              <a
                href="#"
                className="flex items-center space-x-3 text-slate-300 hover:text-white hover:bg-slate-800/50 p-3 rounded-lg transition-all"
              >
                <Building size={20} />
                <span>Áreas Comunes</span>
              </a>
            </li>
            <li>
              <a
                href="#"
                className="flex items-center space-x-3 text-slate-300 hover:text-white hover:bg-slate-800/50 p-3 rounded-lg transition-all"
              >
                <DollarSign size={20} />
                <span>Finanzas</span>
              </a>
            </li>
            <li>
              <a
                href="#"
                className="flex items-center space-x-3 text-slate-300 hover:text-white hover:bg-slate-800/50 p-3 rounded-lg transition-all"
              >
                <Wrench size={20} />
                <span>Mantenimiento</span>
              </a>
            </li>
            <li>
              <a
                href="#"
                className="flex items-center space-x-3 text-slate-300 hover:text-white hover:bg-slate-800/50 p-3 rounded-lg transition-all"
              >
                <BarChart3 size={20} />
                <span>Reportes</span>
              </a>
            </li>
            <li>
              <a
                href="#"
                className="flex items-center space-x-3 text-slate-300 hover:text-white hover:bg-slate-800/50 p-3 rounded-lg transition-all"
              >
                <Shield size={20} />
                <span>Seguridad</span>
              </a>
            </li>
          </ul>
        </nav>

        {/* Usuario + Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-slate-700/50">
          <div className="flex items-center space-x-3 text-slate-300 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold">{initial}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                {user?.full_name || "Usuario"}
              </p>
              <p className="text-xs text-slate-400">{user?.email || "—"}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center space-x-3 text-slate-300 hover:text-red-400 transition-colors"
          >
            <LogOut size={16} />
            <span className="text-sm">Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </>
  );
};

const CondominiumDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔐 Cargar sesión + perfil
  useEffect(() => {
    let unsub: (() => void) | undefined;

    const load = async () => {
      try {
        // 1) Obtener sesión actual
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) {
          console.error("Error getSession:", error);
        }

        const u = session?.user || null;

        // Si no hay sesión → redirigir a /login
        if (!u) {
          setUser(null);
          setLoading(false);
          navigate("/login", { replace: true });
          return;
        }

        // 2) Email directo desde Auth
        const email = u.email ?? "";

        // 3) Intentar leer nombre desde la tabla profiles
        let fullName = "";

        const { data: profile, error: pErr } = await supabase
          .from("profiles")
          .select("first_name,last_name")
          .eq("id", u.id)
          .single();

        if (pErr) {
          // Si hay error (o tabla vacía), seguimos con metadatos
          // console.warn("No se encontró perfil, usando metadatos:", pErr.message);
        } else if (profile) {
          const fn = (profile.first_name ?? "").trim();
          const ln = (profile.last_name ?? "").trim();
          fullName = `${fn} ${ln}`.trim();
        }

        // 4) Respaldo: user_metadata.full_name o name (OAuth)
        if (!fullName) {
          fullName =
            (u.user_metadata?.full_name as string) ||
            (u.user_metadata?.name as string) ||
            "Usuario";
        }

        setUser({ email, full_name: fullName });
      } catch (e) {
        console.error("Error cargando usuario:", e);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    load();

    // Suscribirse a cambios de auth
    const sub = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user || null;
      if (!u) {
        setUser(null);
        navigate("/login", { replace: true });
        return;
      }
      // Reutilizamos la carga para refrescar perfil
      (async () => {
        const email = u.email ?? "";
        let fullName = "";

        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name,last_name")
          .eq("id", u.id)
          .single();

        if (profile) {
          const fn = (profile.first_name ?? "").trim();
          const ln = (profile.last_name ?? "").trim();
          fullName = `${fn} ${ln}`.trim();
        }

        if (!fullName) {
          fullName =
            (u.user_metadata?.full_name as string) ||
            (u.user_metadata?.name as string) ||
            "Usuario";
        }

        setUser({ email, full_name: fullName });
      })();
    });

    unsub = () => sub.data.subscription.unsubscribe();

    return () => {
      if (unsub) unsub();
    };
  }, [navigate]);

  // 🚪 Logout Supabase (+ limpia token de API si lo usas)
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("token"); // si guardas token de tu API Django
      navigate("/login", { replace: true });
    } catch (e) {
      console.error("Error al cerrar sesión:", e);
    }
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
      <div className="min-h-screen bg-slate-900 text-slate-300 flex items-center justify-center">
        <div className="animate-pulse text-sm opacity-80">
          Cargando panel...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-700/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-slate-400 hover:text-white"
              >
                <Menu size={24} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Panel de Administración
                </h1>
                <p className="text-slate-400">
                  Herramientas para gestionar residentes, finanzas, seguridad y
                  operaciones
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative">
                <button className="text-slate-400 hover:text-white transition-colors">
                  <Bell size={20} />
                </button>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </div>

              <button className="text-slate-400 hover:text-white transition-colors">
                <Settings size={20} />
              </button>
            </div>
          </div>
        </header>

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
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-blue-600/20 p-3 rounded-lg">
                  <Users className="text-blue-400" size={24} />
                </div>
                <span className="text-2xl font-bold text-white">248</span>
              </div>
              <h3 className="text-slate-300 text-sm">Residentes Activos</h3>
              <p className="text-green-400 text-xs mt-1">+12% este mes</p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-green-600/20 p-3 rounded-lg">
                  <DollarSign className="text-green-400" size={24} />
                </div>
                <span className="text-2xl font-bold text-white">$45,280</span>
              </div>
              <h3 className="text-slate-300 text-sm">Ingresos Mensuales</h3>
              <p className="text-green-400 text-xs mt-1">+8% este mes</p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-yellow-600/20 p-3 rounded-lg">
                  <Wrench className="text-yellow-400" size={24} />
                </div>
                <span className="text-2xl font-bold text-white">12</span>
              </div>
              <h3 className="text-slate-300 text-sm">Tareas Pendientes</h3>
              <p className="text-red-400 text-xs mt-1">3 urgentes</p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-purple-600/20 p-3 rounded-lg">
                  <Shield className="text-purple-400" size={24} />
                </div>
                <span className="text-2xl font-bold text-white">98.5%</span>
              </div>
              <h3 className="text-slate-300 text-sm">Seguridad IA</h3>
              <p className="text-green-400 text-xs mt-1">Funcionando óptimo</p>
            </div>
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
            <h3 className="text-lg font-semibold text-white mb-4">
              Acciones Rápidas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg transition-all duration-300 transform hover:scale-105">
                <Calendar className="mb-2" size={20} />
                <span className="block font-semibold">Nueva Reserva</span>
              </button>
              <button className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg transition-all duration-300 transform hover:scale-105">
                <Bell className="mb-2" size={20} />
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
