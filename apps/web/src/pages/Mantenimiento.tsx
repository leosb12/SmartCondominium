import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wrench, CalendarPlus, UserCog, Settings, ClipboardCheck } from "lucide-react";
import DashboardLayout from "../Layouts/DashboardLayout";
import { useRoles } from "../hooks/useRoles";
import { roleService, type Role } from "../services/roleService";

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
      <h3 className="text-xl font-semibold text-slate-100 group-hover:text-blue-400">{title}</h3>
    </div>
    <p className="mt-3 text-slate-400 text-sm">{desc}</p>
  </button>
);

const ALLOWED_ROLE_IDS_FOR_ESTADO = new Set<number>([1, 5, 6]); // admin + mantenimiento interno/externo

const Mantenimiento: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useRoles();

  // Permiso SOLO para la card "Actualizar estado de mantenimiento"
  const [canUpdateEstado, setCanUpdateEstado] = useState<boolean>(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const roles: Role[] = await roleService.getMyRoles();
        const allowed = roles?.some((r) => ALLOWED_ROLE_IDS_FOR_ESTADO.has(r.id));
        if (alive) setCanUpdateEstado(Boolean(allowed));
      } catch {
        if (alive) setCanUpdateEstado(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const showRestricted = !isAdmin && !canUpdateEstado;

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

      {/* Grid responsive */}
      <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
        {/* Card visible para roles 1,5,6 */}
        {canUpdateEstado && (
          <Card
            icon={<ClipboardCheck className="h-7 w-7 text-blue-400" />}
            title="Actualizar Estado de Mantenimiento"
            desc="Consulta y actualiza el estado de las órdenes de trabajo de forma rápida."
            onClick={() => navigate("/estado-mantenimiento")}
          />
        )}

        {/* Cards SOLO para administradores (id 1) */}
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

        {/* Mensaje cuando no pertenece a ningún rol permitido */}
        {showRestricted && (
          <div className="col-span-full text-center py-12">
            <div className="rounded-2xl border border-slate-800/60 bg-gradient-to-r from-slate-900/60 via-slate-900 to-slate-950 p-8">
              <Settings className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-300 mb-2">Acceso Restringido</h3>
              <p className="text-slate-400">
                Esta sección es solo para administradores o personal de mantenimiento autorizado.
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Mantenimiento;