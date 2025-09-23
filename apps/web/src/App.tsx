// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import Finance from "./pages/Finance";
import GestionarMultas from "./pages/GestionarMulta";
import AutenticacionSeguridad from "./pages/AutenticacionSeguridad";
import GestionRoles from "./pages/GestionRoles";
import GestionarMultasExpensas from  "./pages/GestionarMultasExpensas";
import AdministrarCuotas from "./pages/AdministrarCuotas";
import GestionarExpensas from "./pages/GestionarExpensa";
import Reportes from "./pages/reportes";
import ReporteFinanza from "./pages/ReporteFinanza";
import Comunicacion from "./pages/Comunicacion";
import Mensajes from "./pages/Mensajes";
import AreasComunes from "./pages/AreasComunes";
import RegistrarAreaComun from "./pages/RegistrarAreaComun";
import MisReservas from "./pages/MisReservas";
import Mantenimiento from "./pages/Mantenimiento";
import ProgramarPreventivo from "./pages/ProgramarPreventivo";
import AsignarTareas from "./pages/AsignarTareas";
import HistorialComunicados from "./pages/HistorialComunicados";
import ReportesAreasComunes from "./pages/ReportesAreasComunes";
import EstadoMantenimiento from "./pages/EstadoMantenimiento";
import AgregarComunicado from "./pages/AgregarComunicado";
import CostoMaterial from   "./pages/Costo_Material.tsx"
import HistorialMantenimiento from  "./pages/HistorialMantenimiento"
import ReporteConsolidado from "./pages/reporteConsolidado"
import ExportarReporte from "./pages/ExportarReporte"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Privadas */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/finanzas" element={<Finance />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/finanzas/gestionar-multas" element={<GestionarMultas />} />
          <Route path="gestionar-expensas" element={<GestionarExpensas/>} />
          <Route path="/finanzas/administrar-cuotas" element={<AdministrarCuotas />} />
          <Route path="/autenticacion-seguridad" element={<AutenticacionSeguridad />} />
          <Route path="/gestionrol" element={<GestionRoles />} />
          <Route path="/comunicacion" element={<Comunicacion />} />
          <Route path="/comunicacion/mensajes" element={<Mensajes />} />
          <Route path="/finanzas/reporte-finanza" element={<ReporteFinanza />} />
          <Route path="/finanzas/gestionar-multas-expensas" element={<GestionarMultasExpensas />} />
          <Route path="/areas-comunes" element={<AreasComunes />} />
          <Route path="/registrar-area-comun" element={<RegistrarAreaComun />} />
          <Route path="/mis-reservas" element={<MisReservas />} />
          <Route path="/mantenimiento" element={<Mantenimiento />} />
          <Route path="/mantenimiento/programar-preventivo" element={<ProgramarPreventivo />} />
          <Route path="/mantenimiento/asignar-tareas" element={<AsignarTareas />} />
          <Route path="/comunicacion/historial" element={<HistorialComunicados />} />
          <Route path="/reportes/areas-comunes" element={<ReportesAreasComunes />} />
          <Route path="/estado-mantenimiento" element={<EstadoMantenimiento />} />
          <Route path="/comunicacion/agregarcomunicado" element={<AgregarComunicado />} />
          <Route path="/costo_material" element={<CostoMaterial />} />
          <Route path="/historial-mantenimiento" element={<HistorialMantenimiento />} />
          <Route path="/reportes/reporteconsolidado" element={<ReporteConsolidado />} />
          <Route path="/reportes/exportar-reporte" element={<ExportarReporte />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}