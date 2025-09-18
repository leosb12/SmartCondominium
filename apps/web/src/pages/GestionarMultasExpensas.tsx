// src/pages/GestionarMultasExpensas.tsx

import { Link } from "react-router-dom";
import DashboardLayout from "../Layouts/DashboardLayout";
import { useAdminCheck } from "../hooks/useRoles";

export default function GestionarMultasExpensas() {
  const { isAdmin, loading } = useAdminCheck();

  if (loading) {
    return (
      <DashboardLayout title="Autenticación y Seguridad">
        <div className="p-6 text-slate-400">Verificando rol de administrador...</div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title="Acceso restringido">
        <div className="p-6 text-red-400">
          No tienes permisos para acceder a esta sección.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Gestión de Multas y Expensas"
      subtitle="Selecciona qué deseas administrar"
    >
      <main className="px-6 sm:px-10 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card: Gestionar Multa */}
          <Link
            to="/finanzas/gestionar-multas"
            className="rounded-2xl border border-blue-900/50 bg-slate-900/60 shadow-xl p-8 flex flex-col items-center justify-center hover:bg-slate-800/60 transition"
          >
            <h2 className="text-xl font-semibold text-slate-100 mb-2">
              Gestionar Multa
            </h2>
            <p className="text-slate-400 text-sm text-center">
              Crea, edita y administra las multas registradas en el sistema.
            </p>
          </Link>

          {/* Card: Gestionar Expensas */}
          <Link
            to="/gestionar-expensas"
            className="rounded-2xl border border-emerald-900/50 bg-slate-900/60 shadow-xl p-8 flex flex-col items-center justify-center hover:bg-slate-800/60 transition"
          >
            <h2 className="text-xl font-semibold text-slate-100 mb-2">
              Gestionar Expensas
            </h2>
            <p className="text-slate-400 text-sm text-center">
              Controla las expensas.
            </p>
          </Link>
        </div>
      </main>
    </DashboardLayout>
  );
}
