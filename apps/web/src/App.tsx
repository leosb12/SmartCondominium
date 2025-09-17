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
          <Route path="/finanzas/gestionar-multas" element={<GestionarMultas />} />
          <Route path="/autenticacion-seguridad" element={<AutenticacionSeguridad />} />
          <Route path="/gestionrol" element={<GestionRoles />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
