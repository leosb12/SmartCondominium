// src/components/ProtectedRoute.tsx
import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";

export default function ProtectedRoute() {
  const [checking, setChecking] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    setIsAuth(!!token); // true si hay token válido
    setChecking(false);
  }, []);

  if (checking) {
    // mientras lee localStorage → evita parpadeo/redirect
    return <div className="text-white">Cargando...</div>;
  }

  return isAuth ? <Outlet /> : <Navigate to="/login" replace />;
}
