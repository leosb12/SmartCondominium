// src/pages/Mantenimiento.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { Wrench, CalendarPlus, UserCog, Settings } from "lucide-react";
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

const Mantenimiento: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useRoles();

  return (
    <DashboardLayout
      title="Módulo de Mantenimiento"
      subtitle="Gestiona mantenimientos preventivos y asignación de tareas"
      icon={<Wrench className="h-5 w-5 text-blue-400" />}
    >
      {/* Hero */}
      <div className="mb-8 rounded-2xl border border-slate-800/60 bg-gradient-to-r from-blue-950/60 via-slate-900 to-slate-950 p-8">
        <p className="text-slate-300">Centro de gestión de mantenimiento del condominio</p>
      </div>

      {/* Grid responsive real */}
      <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
        {/* Cards solo para administradores */}
        {isAdmin && (
          <>
            <Card
              icon={<CalendarPlus className="h-7 w-7 text-blue-400" />}
              title="Programar Mantenimiento Preventivo"
              desc="Crea y programa ordenes de trabajo preventivo con asignación de personal."
              onClick={() => navigate("/mantenimiento/programar-preventivo")}
            />
            
            <Card
              icon={<UserCog className="h-7 w-7 text-blue-400" />}
              title="Asignar Tarea"
              desc="Asigna ordenes de trabajo existentes a personal interno o externo."
              onClick={() => navigate("/mantenimiento/asignar-tareas")}
            />
          </>
        )}
        
        {/* Mensaje cuando no es admin */}
        {!isAdmin && (
          <div className="col-span-full text-center py-12">
            <div className="rounded-2xl border border-slate-800/60 bg-gradient-to-r from-slate-900/60 via-slate-900 to-slate-950 p-8">
              <Settings className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-300 mb-2">Acceso Restringido</h3>
              <p className="text-slate-400">
                Solo los administradores pueden acceder a las funciones de mantenimiento.
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Mantenimiento;