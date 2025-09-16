// src/routes/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";

interface ProtectedRouteProps {
  children: ReactNode;
}

// Considera autenticado si hay sesión de Supabase o si tienes tu token propio del backend
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState<boolean>(false);

  useEffect(() => {
    let unsub: (() => void) | undefined;

    const check = async () => {
      try {
        // 1) revisar sesión actual de Supabase
        const { data: { session } } = await supabase.auth.getSession();

        // 2) revisar tu token propio (si lo usas)
        const apiToken = localStorage.getItem("token");

        setIsAuthed(!!session || !!apiToken);

        // 3) suscribirse a cambios de auth (login/logout)
        const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
          const hasSession = !!newSession;
          const stillHasApiToken = !!localStorage.getItem("token");
          setIsAuthed(hasSession || stillHasApiToken);
        });

        unsub = () => sub.subscription.unsubscribe();
      } finally {
        setLoading(false);
      }
    };

    check();
    return () => { if (unsub) unsub(); };
  }, []);

  if (loading) {
    // Puedes poner un spinner bonito aquí
    return null;
  }

  if (!isAuthed) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
