import React from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, CarFront } from "lucide-react";
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

const ALLOWED_ROLE_IDS = new Set<number>([1, 2, 3]);

const Residente: React.FC = () => {
  const navigate = useNavigate();
  const { roles } = useRoles();

  const canSeeCard = roles.some((r: any) => ALLOWED_ROLE_IDS.has(r.id));

  return (
    <DashboardLayout
      title="Módulo de Residentes"
      subtitle="Gestiona las visitas de tu propiedad"
      icon={<UserPlus className="h-5 w-5 text-blue-400" />}
    >
      <div className="mb-8 rounded-2xl border border-slate-800/60 bg-gradient-to-r from-blue-950/60 via-slate-900 to-slate-950 p-8">
        <p className="text-slate-300">Aquí puedes registrar y gestionar las visitas a tu unidad.</p>
      </div>

      {!canSeeCard ? (
        <div className="bg-red-700/80 text-white p-5 rounded-xl text-center mb-6 font-bold shadow">
          Acceso denegado
          <p className="text-slate-200 mt-2 font-normal text-base">
            Esta sección es solo para administradores, propietarios e inquilinos.
          </p>
        </div>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
          <Card
            icon={<UserPlus className="h-7 w-7 text-blue-400" />}
            title="Registrar visita"
            desc="Registra visitantes autorizados para tu departamento o casa."
            onClick={() => navigate("/registrarvisitante")}
          />
          <Card
            icon={<CarFront className="h-7 w-7 text-blue-400" />}
            title="Registrar placa"
            desc="Registra la placa de tu vehículo para habilitar el acceso automático por escáner."
            onClick={() => navigate("/registrarplaca")}
          />
        </div>
      )}
    </DashboardLayout>
  );
};

export default Residente;