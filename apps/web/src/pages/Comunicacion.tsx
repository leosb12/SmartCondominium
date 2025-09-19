import React from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquareText, History } from "lucide-react";
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

const Comunicacion: React.FC = () => {
  const navigate = useNavigate();

  return (
    <DashboardLayout
      title="Comunicación"
      subtitle="Centro de mensajes del condominio"
      icon={<MessageSquareText className="h-5 w-5 text-blue-400" />}
    >
      {/* Hero */}
      <div className="mb-8 rounded-2xl border border-slate-800/60 bg-gradient-to-r from-blue-950/60 via-slate-900 to-slate-950 p-8">
        <p className="text-slate-300">
          Gestiona la comunicación entre administración y residentes
        </p>
      </div>

      {/* Grid responsive */}
      <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
        <Card
          icon={<MessageSquareText className="h-7 w-7 text-blue-400" />}
          title="Mensajes"
          desc="Envía, recibe y administra mensajes y avisos del condominio."
          onClick={() => navigate("mensajes")}
        />
        <Card
          icon={<History className="h-7 w-7 text-blue-400" />}
          title="Historial de Comunicados"
          desc="Consulta los comunicados publicados previamente, ordenados por fecha."
          onClick={() => navigate("historial")}
        />
      </div>
    </DashboardLayout>
  );
};

export default Comunicacion;