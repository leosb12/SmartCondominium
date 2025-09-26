import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, CarFront, AlertTriangle } from "lucide-react";
import DashboardLayout from "../Layouts/DashboardLayout";
import { useRoles } from "../hooks/useRoles";

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

const ALLOWED_ROLE_IDS = new Set<number>([1, 4]);

const Seguridad: React.FC = () => {
  const navigate = useNavigate();
  const { roles } = useRoles();

  // Solo admin (1) y personal de seguridad (4)
  const canAccess = roles.some((r: any) => ALLOWED_ROLE_IDS.has(r.id));

  return (
    <DashboardLayout
      title="Módulo de Seguridad"
      subtitle="Herramientas para el control de visitas y acceso"
      icon={<ShieldCheck className="h-5 w-5 text-blue-400" />}
    >
      <div className="mb-8 rounded-2xl border border-slate-800/60 bg-gradient-to-r from-blue-950/60 via-slate-900 to-slate-950 p-8">
        <p className="text-slate-300">
          Gestión de visitas y control de identidad para el personal autorizado.
        </p>
      </div>

      {!canAccess ? (
        <div className="bg-red-700/80 text-white p-5 rounded-xl text-center mb-6 font-bold shadow">
          Acceso denegado
          <p className="text-slate-200 mt-2 font-normal text-base">
            Esta sección es solo para administradores y personal de seguridad.
          </p>
        </div>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
          <Card
            icon={<ShieldCheck className="h-7 w-7 text-blue-400" />}
            title="Detectar Visita"
            desc="Accede a la detección facial y verificación de visitantes en tiempo real."
            onClick={() => navigate("/detectarvisitante")}
          />
          <Card
            icon={<CarFront className="h-7 w-7 text-blue-400" />}
            title="Detectar Placa"
            desc="Permite el ingreso automático de vehículos autorizados al condominio mediante reconocimiento de placa."
            onClick={() => navigate("/detectarplaca")}
          />
          <Card
            icon={<AlertTriangle className="h-7 w-7 text-yellow-400" />}
            title="Anomalías"
            desc="Consulta y gestiona registros de accesos irregulares (personas o autos desconocidos) detectados por el sistema de seguridad."
            onClick={() => navigate("/anomalias")}
          />
        </div>
      )}
    </DashboardLayout>
  );
};

export default Seguridad;