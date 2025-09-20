// src/pages/AreasComunes.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Plus, Calendar } from "lucide-react";
import DashboardLayout from "../Layouts/DashboardLayout";
import { useAdminCheck } from "../hooks/useRoles";

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

const AreasComunes: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAdminCheck();

  return (
    <DashboardLayout
      title="Módulo Área Común"
      subtitle="Gestiona las áreas sociales y reservas del condominio"
      icon={<MapPin className="h-5 w-5 text-blue-400" />}
    >
      {/* Hero */}
      <div className="mb-8 rounded-2xl border border-slate-800/60 bg-gradient-to-r from-blue-950/60 via-slate-900 to-slate-950 p-8">
        <p className="text-slate-300">Centro de gestión de áreas comunes y reservas</p>
      </div>

      {/* Grid responsive real */}
      <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
        {/* Card solo para administradores */}
        {isAdmin && (
          <Card
            icon={<Plus className="h-7 w-7 text-blue-400" />}
            title="Registrar Área Común"
            desc="Agrega nuevas áreas sociales al condominio"
            onClick={() => navigate("/registrar-area-comun")}
          />
        )}
        
        <Card
          icon={<Calendar className="h-7 w-7 text-blue-400" />}
          title="Mis Reservas"
          desc="Consulta y gestiona tus reservas de áreas sociales"
          onClick={() => navigate("/mis-reservas")}
        />
      </div>
    </DashboardLayout>
  );
};

export default AreasComunes;