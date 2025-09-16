// src/components/HeaderDashboard.tsx
import React from "react";
import { Menu, Bell, Settings } from "lucide-react";

export interface HeaderDashboardProps {
  onOpenSidebar: () => void;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

const HeaderDashboard: React.FC<HeaderDashboardProps> = ({
  onOpenSidebar,
  title = "Panel de Administración",
  subtitle = "Herramientas para gestionar residentes, finanzas, seguridad y operaciones",
  icon,
}) => {
  return (
    <header className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-700/50 p-4 sticky top-0 z-30">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Botón menú mobile */}
          <button
            onClick={onOpenSidebar}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <Menu size={24} />
          </button>

          {/* Título dinámico */}
          <div className="flex items-center gap-3">
            {icon && (
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 ring-1 ring-inset ring-blue-500/30">
                {icon}
              </span>
            )}
            <div>
              <h1 className="text-2xl font-bold text-white">{title}</h1>
              <p className="text-slate-400">{subtitle}</p>
            </div>
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
