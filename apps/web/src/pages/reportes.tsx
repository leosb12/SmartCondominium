import React from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, Layers, FileDown, ShieldAlert, RefreshCw } from "lucide-react";
import DashboardLayout from "../Layouts/DashboardLayout";
import { useAdminCheck } from "../hooks/useRoles";

const Card: React.FC<{
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}> = ({ icon, title, desc, onClick }) => (
  <button
    onClick={onClick}
    className="group flex flex-col items-start rounded-2xl border border-slate-800/70 bg-gradient-to-br from-slate-900 to-slate-950 p-8 shadow-xl hover:from-blue-950 hover:to-slate-900 hover:border-blue-600/60 transition-all duration-300 text-left"
  >
    <div className="flex items-center gap-4">
      <div className="grid h-14 w-14 place-items-center rounded-xl bg-blue-600/20 ring-1 ring-inset ring-blue-500/30 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-slate-100 group-hover:text-blue-400">
        {title}
      </h3>
    </div>
    <p className="mt-3 text-slate-400 text-sm">{desc}</p>
  </button>
);

const Reportes: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminCheck();

  // Cargando estado de rol
  if (adminLoading) {
    return (
      <DashboardLayout
        title="Reportes"
        subtitle="Genera y consulta reportes financieros del condominio"
        icon={<BarChart3 className="h-5 w-5 text-blue-400" />}
      >
        <div className="flex items-center gap-2 text-slate-300">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Verificando permisos...
        </div>
      </DashboardLayout>
    );
  }

  // Acceso denegado para no administradores
  if (!isAdmin) {
    return (
      <DashboardLayout
        title="Reportes"
        subtitle="Genera y consulta reportes financieros del condominio"
        icon={<BarChart3 className="h-5 w-5 text-blue-400" />}
      >
        <div className="mb-6 rounded-xl border border-amber-800/50 bg-amber-900/20 p-4 text-amber-200 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" />
          Acceso restringido. Solo los administradores pueden ver esta sección.
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-xl px-4 py-2 text-slate-300 border border-slate-700/60 hover:bg-slate-900/50"
        >
          Volver
        </button>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Reportes"
      subtitle="Genera y consulta reportes financieros del condominio"
      icon={<BarChart3 className="h-5 w-5 text-blue-400" />}
    >
      {/* Hero */}
      <div className="mb-8 rounded-2xl border border-slate-800/60 bg-gradient-to-r from-blue-950/60 via-slate-900 to-slate-950 p-8">
        <p className="text-slate-300">
          Centro de reportes y analítica financiera
        </p>
      </div>

      {/* Grid de opciones */}
      <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
        <Card
          icon={<Layers className="h-7 w-7 text-blue-400" />}
          title="Reportes consolidados"
          desc="Visualiza todos los reportes del condominio: finanzas, seguridad, reservas y mantenimiento en un solo lugar."
          onClick={() => navigate("reporteconsolidado")}
        />

        <Card
          icon={<FileDown className="h-7 w-7 text-blue-400" />}
          title="Exportar Reporte"
          desc="Exporta tus reportes en formatos PDF y Excel."
          onClick={() => navigate("exportar-reporte")}
        />
      </div>
    </DashboardLayout>
  );
};

export default Reportes;