import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      if (!email) {
        setError("Por favor ingresa tu correo electrónico");
        return;
      }

      // Validación básica de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError("Por favor ingresa un correo electrónico válido");
        return;
      }

      const res = await api.post("/forgot-password/", { email });
      
      if (res.data.success) {
        setSuccess("Si el correo existe en nuestro sistema, se ha enviado un enlace de recuperación. Revisa tu bandeja de entrada.");
        setEmail(""); // Limpiar el campo
      } else {
        setError(res.data.error || "Error al procesar la solicitud");
      }
    } catch (err: any) {
      console.error("Error en forgot password:", err);
      if (err.response?.status === 400 && err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError("Error al procesar la solicitud. Inténtalo de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleForgotPassword();
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-black via-gray-900 to-blue-950 p-4">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl shadow-2xl p-8 border border-blue-800/40">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-extrabold text-blue-400 mb-2 tracking-wide">
            Smart Condominium
          </h1>
          <h2 className="text-2xl font-bold text-white mb-2">
            ¿Olvidaste tu contraseña?
          </h2>
          <p className="text-gray-400 text-sm">
            Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña
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

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            disabled={loading}
          />

          <button
            onClick={handleForgotPassword}
            disabled={loading || !email}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition transform hover:scale-[1.02] active:scale-[0.98] shadow-md"
          >
            {loading ? "Enviando..." : "Enviar enlace de recuperación"}
          </button>
        </div>

        <div className="mt-6 text-center space-y-2">
          <Link
            to="/login"
            className="block text-blue-400 hover:text-blue-300 text-sm transition"
          >
            ← Volver al inicio de sesión
          </Link>
          <Link
            to="/register"
            className="block text-gray-400 hover:text-blue-300 text-sm transition"
          >
            ¿No tienes cuenta? <span className="text-blue-400 font-semibold">Regístrate</span>
          </Link>
        </div>
      </div>
    </div>
  );
}