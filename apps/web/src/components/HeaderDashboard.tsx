import React from "react";
import { Menu, Bell, Settings } from "lucide-react";

interface HeaderDashboardProps {
  onOpenSidebar: () => void;
}

const HeaderDashboard: React.FC<HeaderDashboardProps> = ({ onOpenSidebar }) => {
  return (
    <header className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-700/50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Botón menú mobile */}
          <button
            onClick={onOpenSidebar}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <Menu size={24} />
          </button>

          {/* Título */}
          <div>
            <h1 className="text-2xl font-bold text-white">
              Panel de Administración
            </h1>
            <p className="text-slate-400">
              Herramientas para gestionar residentes, finanzas, seguridad y operaciones
            </p>
          </div>
        </div>

        {/* Iconos de acciones */}
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
  );
};

export default HeaderDashboard;
