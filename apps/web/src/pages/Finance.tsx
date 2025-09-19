// src/pages/Finance.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, ShieldAlert, BarChart3, FileText, Settings } from "lucide-react";
import DashboardLayout from "../Layouts/DashboardLayout";
import { useRoles } from "../hooks/useRoles";

const Card: React.FC<{icon: React.ReactNode; title: string; desc: string; onClick: () => void;}> = ({ icon, title, desc, onClick }) => (
  <button
    onClick={onClick}
    className="group flex flex-col items-start rounded-2xl border border-slate-800/70 bg-gradient-to-br from-slate-900 to-slate-950 p-8 shadow-xl hover:from-blue-950 hover:to-slate-900 hover:border-blue-600/60 transition-all duration-300 text-left"
  >
    <div className="flex items-center gap-4">
      <div className="grid h-14 w-14 place-items-center rounded-xl bg-blue-600/20 ring-1 ring-inset ring-blue-500/30 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-slate-100 group-hover:text-blue-400">{title}</h3>
    </div>
    <p className="mt-3 text-slate-400 text-sm">{desc}</p>
  </button>
);

const Finance: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useRoles();

  return (
    <DashboardLayout
      title="Módulo de Finanzas"
      subtitle="Gestiona multas, reportes y documentos en un solo lugar"
      icon={<DollarSign className="h-5 w-5 text-blue-400" />}
    >
      {/* Hero */}
      <div className="mb-8 rounded-2xl border border-slate-800/60 bg-gradient-to-r from-blue-950/60 via-slate-900 to-slate-950 p-8">
        <p className="text-slate-300">Centro de gestión financiera del condominio</p>
      </div>

      {/* Grid responsive real */}
      <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
        <Card
          icon={<ShieldAlert className="h-7 w-7 text-blue-400" />}
          title="Gestionar multas y expensas"
          desc="Crea, administra y asigna multas a propiedades o controla las expensas."
          onClick={() => navigate("/finanzas/gestionar-multas-expensas")}
        />
        
        {/* Card solo para administradores */}
        {isAdmin && (
          <Card
            icon={<Settings className="h-7 w-7 text-blue-400" />}
            title="Cuotas ordinarias y extraordinarias"
            desc="Administra tarifas por m², extraordinarias y generación de expensas."
            onClick={() => navigate("/finanzas/administrar-cuotas")}
          />
        )}
        
        <Card
          icon={<BarChart3 className="h-7 w-7 text-blue-400" />}
          title="Reportes financieros"
          desc="Crea reportes de ingresos y morosidad con filtros por rango de fechas, propiedades y estados."
          onClick={() => navigate("reporte-finanza")}
        />
        <Card
          icon={<FileText className="h-7 w-7 text-blue-400" />}
          title="Documentos y comprobantes"
          desc="Accede a comprobantes digitales y estados (próximamente)."
          onClick={() => {}}
        />
      </div>
    </DashboardLayout>
  );
};

export default Finance;
