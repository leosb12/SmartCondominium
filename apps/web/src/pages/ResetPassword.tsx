import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../services/api";

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Función para extraer tokens tanto de query params como de hash
  const getTokensFromUrl = () => {
    // Primero intentar desde query parameters (?access_token=...)
    let accessToken = searchParams.get("access_token");
    let refreshToken = searchParams.get("refresh_token");

    // Si no están en query params, buscar en el hash (#access_token=...)
    if (!accessToken || !refreshToken) {
      const hash = window.location.hash.substring(1); // Remover el #
      const hashParams = new URLSearchParams(hash);
      accessToken = accessToken || hashParams.get("access_token");
      refreshToken = refreshToken || hashParams.get("refresh_token");
    }

    // También buscar variantes comunes que puede usar Supabase
    if (!accessToken || !refreshToken) {
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      accessToken = accessToken || hashParams.get("token");
      refreshToken = refreshToken || hashParams.get("refresh_token");
    }

    return { accessToken, refreshToken };
  };

  const tokens = getTokensFromUrl();
  const accessToken = tokens.accessToken;
  const refreshToken = tokens.refreshToken;

  useEffect(() => {
    // Debug: Mostrar toda la URL y parámetros
    console.log("=== DEBUG RESET PASSWORD ===");
    console.log("URL completa:", window.location.href);
    console.log("Search params:", window.location.search);
    console.log("Hash:", window.location.hash);
    console.log("Access token extraído:", accessToken);
    console.log("Refresh token extraído:", refreshToken);
    
    console.log("Query parameters:");
    searchParams.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });
    
    if (window.location.hash) {
      console.log("Hash parameters:");
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      hashParams.forEach((value, key) => {
        console.log(`  ${key}: ${value}`);
      });
    }
    console.log("=============================");

    // Verificar que existan los tokens necesarios con mensajes más específicos
    if (!accessToken && !refreshToken) {
      setError("Enlace de recuperación inválido. No se encontraron tokens de autenticación. Solicita un nuevo enlace.");
    } else if (!accessToken) {
      setError("Token de acceso faltante en el enlace. Solicita un nuevo enlace de recuperación.");
    } else if (!refreshToken) {
      setError("Token de actualización faltante en el enlace. Solicita un nuevo enlace de recuperación.");
    }
  }, [accessToken, refreshToken, searchParams]);

  const handleResetPassword = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      // Validaciones
      if (!newPassword || !confirmPassword) {
        setError("Por favor completa todos los campos");
        return;
      }

      if (newPassword.length < 6) {
        setError("La contraseña debe tener al menos 6 caracteres");
        return;
      }

      if (newPassword !== confirmPassword) {
        setError("Las contraseñas no coinciden");
        return;
      }

      if (!accessToken || !refreshToken) {
        setError("Tokens de recuperación inválidos");
        return;
      }

      const res = await api.post("/reset-password/", {
        access_token: accessToken,
        refresh_token: refreshToken,
        new_password: newPassword
      });

      if (res.data.success) {
        setSuccess("¡Contraseña actualizada exitosamente! Redirigiendo al login...");
        // Redirigir al login después de 3 segundos
        setTimeout(() => {
          navigate("/login", { replace: true });
        }, 3000);
      } else {
        setError(res.data.error || "Error al actualizar la contraseña");
      }
    } catch (err: unknown) {
      console.error("Error en reset password:", err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status?: number; data?: { error?: string } } };
        if (axiosError.response?.status === 401) {
          setError("El enlace de recuperación ha expirado. Solicita un nuevo enlace.");
        } else if (axiosError.response?.data?.error) {
          setError(axiosError.response.data.error);
        } else {
          setError("Error al actualizar la contraseña. Inténtalo de nuevo.");
        }
      } else {
        setError("Error al actualizar la contraseña. Inténtalo de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleResetPassword();
    }
  };

  // Función para evaluar la fortaleza de la contraseña
  const getPasswordStrength = (password: string) => {
    if (password.length < 6) return { strength: "weak", text: "Muy débil", color: "text-red-400" };
    if (password.length < 8) return { strength: "medium", text: "Débil", color: "text-yellow-400" };
    if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
      return { strength: "strong", text: "Fuerte", color: "text-green-400" };
    }
    return { strength: "medium", text: "Media", color: "text-yellow-400" };
  };

  const passwordStrength = newPassword ? getPasswordStrength(newPassword) : null;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-black via-gray-900 to-blue-950 p-4">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl shadow-2xl p-8 border border-blue-800/40">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-extrabold text-blue-400 mb-2 tracking-wide">
            Smart Condominium
          </h1>
          <h2 className="text-2xl font-bold text-white mb-2">
            Restablecer contraseña
          </h2>
          <p className="text-gray-400 text-sm">
            Ingresa tu nueva contraseña para completar el proceso
          </p>
        </div>

        {error && (
          <div className="bg-red-600/90 text-white p-3 rounded-md mb-4 text-center text-sm font-medium">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-600/90 text-white p-3 rounded-md mb-4 text-center text-sm font-medium">
            {success}
          </div>
        )}

        {!error.includes("inválido") && !error.includes("expirado") && (
          <div className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Nueva contraseña"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                disabled={loading}
              />
              {passwordStrength && (
                <p className={`text-xs mt-1 ${passwordStrength.color}`}>
                  Fortaleza: {passwordStrength.text}
                </p>
              )}
            </div>

            <input
              type="password"
              placeholder="Confirmar contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              disabled={loading}
            />

            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-400">
                Las contraseñas no coinciden
              </p>
            )}

            <button
              onClick={handleResetPassword}
              disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition transform hover:scale-[1.02] active:scale-[0.98] shadow-md"
            >
              {loading ? "Actualizando..." : "Actualizar contraseña"}
            </button>
          </div>
        )}

        <div className="mt-6 text-center space-y-2">
          <Link
            to="/login"
            className="block text-blue-400 hover:text-blue-300 text-sm transition"
          >
            ← Volver al inicio de sesión
          </Link>
          <Link
            to="/forgot-password"
            className="block text-gray-400 hover:text-blue-300 text-sm transition"
          >
            ¿Necesitas un nuevo enlace? <span className="text-blue-400 font-semibold">Solicítalo aquí</span>
          </Link>
        </div>
      </div>
    </div>
  );
}