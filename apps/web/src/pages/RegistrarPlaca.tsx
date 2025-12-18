import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../Layouts/DashboardLayout";
import { IdentificationIcon } from "@heroicons/react/24/outline";
import { useRoles } from "../hooks/useRoles";
import { api } from "../services/api";

const ALLOWED_ROLE_IDS = new Set<number>([1, 2, 3]);
const ESTADOS = [
  { value: 1, label: "Activo" },
  { value: 2, label: "Inactivo" },
];

type Propiedad = {
  id: number;
  nro_casa: string;
};

type UserProfile = {
  id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
};

const RegistrarPlaca: React.FC<{
  user?: UserProfile | null;
  onLogout?: () => Promise<void>;
}> = ({ user = null, onLogout }) => {
  const [form, setForm] = useState({
    placa: "",
    modelo: "",
    marca: "",
    propiedad: "", // Se auto-asignará si el usuario tiene propiedad
    estado: 1,
  });
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [miPropiedad, setMiPropiedad] = useState<Propiedad | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const navigate = useNavigate();
  const { roles } = useRoles();

  useEffect(() => {
    if (!roles || roles.length === 0) return;
    const isAllowed = roles.some((r: any) => ALLOWED_ROLE_IDS.has(r.id));
    if (!isAllowed) {
      navigate("/dashboard", { replace: true });
    }
    // Verificar si es admin (rol 1 o 2)
    setIsAdmin(roles.some((r: any) => r.id === 1 || r.id === 2));
  }, [roles, navigate]);

  // Obtener la propiedad del usuario actual
  useEffect(() => {
    const fetchMiPropiedad = async () => {
      try {
        // Obtener mis propiedades desde el endpoint mis-registros
        const res = await api.get("/mis-registros/");
        const data = res.data?.data || res.data;

        // Si hay autos o mascotas, tomar el propiedad_id del primero
        const autos = data?.autos || [];
        const mascotas = data?.mascotas || [];

        let propiedadId = null;
        if (autos.length > 0) {
          propiedadId = autos[0].propiedad_id;
        } else if (mascotas.length > 0) {
          propiedadId = mascotas[0].propiedad_id;
        }

        if (propiedadId) {
          // Obtener detalles de la propiedad
          const propRes = await api.get(`/propiedades/${propiedadId}/`);
          setMiPropiedad(propRes.data);
          setForm((prev) => ({ ...prev, propiedad: String(propiedadId) }));
        }
      } catch (err) {
        console.error("Error obteniendo mi propiedad:", err);
      }
    };

    fetchMiPropiedad();
  }, []);

  // Solo admins pueden ver todas las propiedades
  useEffect(() => {
    if (isAdmin) {
      api
        .get("/propiedades/")
        .then((res) => setPropiedades(res.data))
        .catch(() => setPropiedades([]));
    }
  }, [isAdmin]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validate = () => {
    if (!form.placa.trim()) return "La placa es obligatoria";
    if (!form.modelo.trim()) return "El modelo es obligatorio";
    if (!form.marca.trim()) return "La marca es obligatoria";
    // Solo requerir propiedad si es admin y no hay propiedad asignada
    if (isAdmin && !form.propiedad) return "Debes seleccionar una casa";
    if (!form.estado) return "Selecciona el estado";
    return "";
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setResult(null);
    setError(null);

    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setLoading(true);

    // Si el usuario tiene propiedad asignada, enviar esa propiedad
    // Si no especifica propiedad, el backend la asignará automáticamente
    const payload: any = {
      placa: form.placa,
      modelo: form.modelo,
      marca: form.marca,
      estado: Number(form.estado),
    };

    // Solo incluir propiedad si está definida (admin o usuario con propiedad)
    if (form.propiedad) {
      payload.propiedad = Number(form.propiedad);
    }

    try {
      const res = await api.post("/autos/", payload);
      const data = res.data;
      setResult(
        `¡Auto registrado!\nPlaca: ${data.placa}\nModelo: ${
          data.modelo
        }\nMarca: ${data.marca}\nCasa: ${
          data.nro_casa || miPropiedad?.nro_casa || "—"
        }\nEstado: ${data.estado_nombre}`
      );
      setError(null);
      setForm({
        placa: "",
        modelo: "",
        marca: "",
        propiedad: miPropiedad ? String(miPropiedad.id) : "",
        estado: 1,
      });
    } catch (err: any) {
      if (err.response && err.response.data) {
        const data = err.response.data;
        const firstKey = Object.keys(data)[0];
        setError(
          Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey]
        );
      } else {
        setError("Error de red o del servidor");
      }
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="Registrar auto"
      subtitle="Registra tu auto en el condominio"
      icon={<IdentificationIcon className="w-8 h-8 text-blue-400" />}
      user={user}
      onLogout={onLogout}
    >
      <div className="w-full max-w-lg mx-auto bg-gray-900 rounded-2xl shadow-2xl p-8 border border-blue-800/40">
        <h2 className="text-2xl font-bold text-blue-300 mb-4 text-center">
          Datos del auto
        </h2>
        {error && (
          <div className="bg-red-600/90 text-white p-3 rounded-md mb-4 text-center text-sm font-medium">
            {error}
          </div>
        )}
        {result && (
          <div className="bg-green-600/90 text-white p-3 rounded-md mb-4 text-center text-sm font-medium whitespace-pre-line">
            {result}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="placa"
            placeholder="Placa"
            value={form.placa}
            required
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          <input
            type="text"
            name="modelo"
            placeholder="Modelo"
            value={form.modelo}
            required
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          <input
            type="text"
            name="marca"
            placeholder="Marca"
            value={form.marca}
            required
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />

          {/* Mostrar propiedad del usuario o selector para admin */}
          {miPropiedad && !isAdmin ? (
            <div className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white">
              <div className="text-sm text-gray-400 mb-1">Tu propiedad</div>
              <div className="font-semibold">Casa {miPropiedad.nro_casa}</div>
            </div>
          ) : isAdmin ? (
            <select
              name="propiedad"
              value={form.propiedad}
              required
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="">Selecciona casa</option>
              {propiedades.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.nro_casa}
                </option>
              ))}
            </select>
          ) : (
            <div className="w-full px-4 py-3 bg-yellow-900/30 border border-yellow-700 rounded-lg text-yellow-200 text-sm">
              ⚠️ No tienes una propiedad asignada. El auto se registrará
              automáticamente a tu cuenta.
            </div>
          )}

          <select
            name="estado"
            value={form.estado}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          >
            {ESTADOS.map((est) => (
              <option key={est.value} value={est.value}>
                {est.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold py-3 rounded-lg transition transform hover:scale-[1.02] active:scale-[0.98] shadow-md"
          >
            {loading ? "Registrando..." : "Registrar"}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default RegistrarPlaca;
