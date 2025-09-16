import React, { useState } from "react";
import MenuDashboard from "../components/MenuDashboard";
import type { UserProfile } from "../components/MenuDashboard";
import HeaderDashboard from "../components/HeaderDashboard";

type DashboardLayoutProps = {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  user?: UserProfile | null;
  onLogout?: () => Promise<void>;
};

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  title,
  subtitle,
  icon,
  children,
  user = null,
  onLogout = async () => {},
}) => {
  // controla el menú solo en móvil
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <MenuDashboard
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        user={user}
        onLogout={onLogout}
      />

      {/* Contenido principal */}
      <div className="relative min-h-screen flex flex-col lg:pl-64">
        <HeaderDashboard
          title={title}
          subtitle={subtitle}
          icon={icon}
          onOpenSidebar={() => setIsOpen(true)} // hamburguesa abre menú en móvil
        />
        <main className="px-6 py-8">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
