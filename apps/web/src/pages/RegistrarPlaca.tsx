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

const RegistrarPlaca: React.FC<{
  user?: UserProfile | null;
  onLogout?: () => Promise<void>;
}> = ({ user = null, onLogout }) => {
  const [form, setForm] = useState({
    placa: "",
    modelo: "",
    marca: "",
    propiedad: "", // aquí irá el id de la propiedad
    estado: 1,
  });
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { roles } = useRoles();

  useEffect(() => {
    if (!roles || roles.length === 0) return;
    const isAllowed = roles.some((r: any) => ALLOWED_ROLE_IDS.has(r.id));
    if (!isAllowed) {
      navigate("/dashboard", { replace: true });
    }
  }, [roles, navigate]);

  // Traer propiedades al montar
  useEffect(() => {
    api.get("/propiedades/")
      .then(res => setPropiedades(res.data))
      .catch(() => setPropiedades([]));
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validate = () => {
    if (!form.placa.trim()) return "La placa es obligatoria";
    if (!form.modelo.trim()) return "El modelo es obligatorio";
    if (!form.marca.trim()) return "La marca es obligatoria";
    if (!form.propiedad) return "Debes seleccionar una casa";
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

    const payload = {
      placa: form.placa,
      modelo: form.modelo,
      marca: form.marca,
      propiedad: Number(form.propiedad), // <-- aquí va el ID
      estado: Number(form.estado),
    };

    try {
      const res = await api.post("/autos/", payload);
      const data = res.data;
      setResult(
        `¡Auto registrado!\nPlaca: ${data.placa}\nModelo: ${data.modelo}\nMarca: ${data.marca}\nCasa: ${data.nro_casa}\nEstado: ${data.estado_nombre}`
      );
      setError(null);
      setForm({ placa: "", modelo: "", marca: "", propiedad: "", estado: 1 });
    } catch (err: any) {
      if (err.response && err.response.data) {
        // Muestra el mensaje detallado de error
        const data = err.response.data;
        const firstKey = Object.keys(data)[0];
        setError(Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey]);
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
        <h2 className="text-2xl font-bold text-blue-300 mb-4 text-center">Datos del auto</h2>
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