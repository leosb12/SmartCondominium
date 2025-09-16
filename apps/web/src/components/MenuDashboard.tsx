// src/components/MenuDashboard.tsx
import React from "react";
import { NavLink } from "react-router-dom";
import {
  Home, Users, Building, DollarSign, Wrench,
  BarChart3, Shield, X, LogOut
} from "lucide-react";

export type UserProfile = { email: string; full_name: string };

export interface MenuDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onLogout: () => Promise<void>;
}

const baseItem =
  "flex items-center space-x-3 p-3 rounded-lg transition-all text-slate-300 hover:text-white hover:bg-slate-800/50";
const activeItem =
  "text-blue-400 bg-blue-600/20 hover:bg-blue-600/20";

const MenuDashboard: React.FC<MenuDashboardProps> = ({
  isOpen, onClose, user, onLogout,
}) => {
  const initial = (user?.full_name || user?.email || "U").trim().charAt(0).toUpperCase();

  const items = [
    { to: "/dashboard", label: "Dashboard", icon: <Home size={20} /> },
    { to: "/residentes", label: "Residentes", icon: <Users size={20} /> },
    { to: "/areas-comunes", label: "Áreas Comunes", icon: <Building size={20} /> },
    { to: "/finanzas", label: "Finanzas", icon: <DollarSign size={20} /> },
    { to: "/mantenimiento", label: "Mantenimiento", icon: <Wrench size={20} /> },
    { to: "/reportes", label: "Reportes", icon: <BarChart3 size={20} /> },
    { to: "/seguridad", label: "Seguridad", icon: <Shield size={20} /> },
  ];

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-slate-900/95 backdrop-blur-sm
        border-r border-slate-700/50 z-50 transform transition-transform duration-300
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
          <h2 className="text-xl font-bold text-blue-400">Smart Condominium</h2>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Nav */}
        <nav className="p-6">
          <ul className="space-y-2">
            {items.map((it) => (
              <li key={it.to}>
                <NavLink
                  to={it.to}
                  className={({ isActive }) =>
                    `${baseItem} ${isActive ? activeItem : ""}`
                  }
                  onClick={onClose}
                >
                  {it.icon}
                  <span>{it.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-slate-700/50">
          <div className="flex items-center space-x-3 text-slate-300 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold">{initial}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-white">{user?.full_name || "Usuario"}</p>
              <p className="text-xs text-slate-400">{user?.email || "—"}</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center space-x-3 text-slate-300 hover:text-red-400 transition-colors"
          >
            <LogOut size={16} />
            <span className="text-sm">Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default MenuDashboard;
