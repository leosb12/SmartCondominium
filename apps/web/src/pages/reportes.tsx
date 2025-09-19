// src/pages/Reportes.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, FileBarChart } from "lucide-react";
import DashboardLayout from "../Layouts/DashboardLayout";

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

      {/* Grid responsive (preparado para más cards a futuro) */}
      <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
        <Card
          icon={<FileBarChart className="h-7 w-7 text-blue-400" />}
          title="Generar reporte financiero"
          desc="Crea reportes de ingresos, egresos y morosidad con filtros por rango de fechas, propiedades y estados."
          onClick={() => navigate("reporte-finanza")}
        />
      </div>
    </DashboardLayout>
  );
};

export default Reportes;
