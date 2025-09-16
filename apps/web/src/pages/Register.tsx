// src/pages/Register.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { supabase } from "../lib/supabaseClient";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
    nombre: "",
    apellido: "",
    telefono: "",
    fecha_nacimiento: "", // "YYYY-MM-DD"
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { name, value } = e.target;
    if (name === "telefono") value = value.replace(/[^\d+]/g, "");
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    if (!form.nombre.trim()) return "El nombre es obligatorio";
    if (!form.apellido.trim()) return "El apellido es obligatorio";
    if (!form.email.trim()) return "El correo es obligatorio";
    const emailRe = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRe.test(form.email)) return "Correo inválido";
    if (!form.password || form.password.length < 6)
      return "La contraseña debe tener al menos 6 caracteres";
    if (form.fecha_nacimiento && !/^\d{4}-\d{2}-\d{2}$/.test(form.fecha_nacimiento))
      return "La fecha de nacimiento debe tener formato YYYY-MM-DD";
    return "";
  };

  const handleRegister = async () => {
    const v = validate();
    if (v) {
      setError(v);
      setSuccess("");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const payload = {
        email: form.email.trim(),
        password: form.password,
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        telefono: form.telefono.trim(),
        fecha_nacimiento: form.fecha_nacimiento || null,
      };

      // 1) Registrar en tu backend
      const res = await api.post("/register/", payload);
      console.log("Registro exitoso:", res.data);

      // ✅ Muestra solo tu mensaje verde
      setSuccess("Usuario registrado correctamente. Revisa tu correo para confirmar la cuenta.");

      // 2) Intento de auto-login (opcional)
      try {
        const loginRes = await api.post("/login/", {
          email: payload.email,
          password: payload.password,
        });

        const { access_token, refresh_token, token } = loginRes.data;

        // 3) Instalar sesión de Supabase en el navegador
        const { error: sErr } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (sErr) {
          // No ensucies con error; deja el mensaje verde
          console.warn("No se pudo iniciar sesión automáticamente:", sErr.message);
          // Puedes redirigir al login si prefieres:
          // navigate("/login");
          return;
        }

        if (token) localStorage.setItem("token", token);

        // 4) Redirigir al dashboard si el auto-login funcionó
        navigate("/dashboard", { replace: true });
      } catch (e: any) {
        // Si el backend devuelve “email not confirmed” u otro 401,
        // NO muestres cartel rojo: deja solo el verde y manda al login.
        const msg = e?.response?.data?.error?.toString().toLowerCase() || "";
        if (msg.includes("confirm")) {
          console.info("Login bloqueado por email no confirmado. Mostrando solo mensaje verde.");
        } else {
          console.info("No se pudo hacer auto-login:", msg || e.message);
        }
        // Redirige al login luego de unos segundos o inmediato:
        setTimeout(() => navigate("/login"), 1200);
      }
    } catch (err: any) {
      console.error("Error en register:", err);
      setSuccess("");
      setError(err?.response?.data?.error || err?.message || "Error al registrarse");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loading) handleRegister();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-black via-gray-900 to-blue-950 p-4">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl shadow-2xl p-8 border border-blue-800/40">
        <h1 className="text-4xl font-extrabold text-center text-blue-400 mb-2 tracking-wide">
          Smart Condominium
        </h1>
        <p className="text-gray-400 text-center mb-6">
          Crea tu cuenta para acceder al sistema
        </p>

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

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="nombre"
            placeholder="Nombre"
            value={form.nombre}
            onChange={handleChange}
            autoComplete="given-name"
            className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          <input
            type="text"
            name="apellido"
            placeholder="Apellido"
            value={form.apellido}
            onChange={handleChange}
            autoComplete="family-name"
            className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          <input
            type="tel"
            name="telefono"
            placeholder="Teléfono"
            value={form.telefono}
            onChange={handleChange}
            autoComplete="tel"
            className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          <input
            type="date"
            name="fecha_nacimiento"
            value={form.fecha_nacimiento}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          <input
            type="email"
            name="email"
            placeholder="Correo electrónico"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          <input
            type="password"
            name="password"
            placeholder="Contraseña"
            value={form.password}
            onChange={handleChange}
            autoComplete="new-password"
            className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold py-3 rounded-lg transition transform hover:scale-[1.02] active:scale-[0.98] shadow-md"
          >
            {loading ? "Registrando..." : "Registrarse"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/login" className="text-blue-400 hover:text-blue-300 text-sm transition">
            ¿Ya tienes cuenta? Inicia sesión
          </a>
        </div>
      </div>
    </div>
  );
}
