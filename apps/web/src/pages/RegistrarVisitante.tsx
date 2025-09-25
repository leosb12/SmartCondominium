import React, { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../Layouts/DashboardLayout";
import { IdentificationIcon } from "@heroicons/react/24/outline";
import { identityApi } from "../services/identityAPI"; // Ajusta la ruta según tu estructura
import { useRoles } from "../hooks/useRoles";

const API_KEY = "clave-interna-identity"; // Cambia si tu API key es diferente

const DOC_TYPES = [
  { value: "DNI", label: "DNI" },
  { value: "PASAPORTE", label: "Pasaporte" },
  { value: "OTRO", label: "Otro" },
];

const ALLOWED_ROLE_IDS = new Set<number>([1, 2, 3]);

const RegistrarVisitante: React.FC<{
  user?: UserProfile | null;
  onLogout?: () => Promise<void>;
}> = ({ user = null, onLogout }) => {
  const [form, setForm] = useState({
    fullName: "",
    docType: "DNI",
    docNumber: "",
    phone: "",
  });
  const [faceImage, setFaceImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const navigate = useNavigate();
  const { roles } = useRoles();

  // Solo dejar pasar a rol 1, 2 o 3 (admin, propietario, inquilino)
  useEffect(() => {
    // Si aún no hay roles cargados, no redirijas
    if (!roles || roles.length === 0) return;
    const isAllowed = roles.some((r: any) => ALLOWED_ROLE_IDS.has(r.id));
    if (!isAllowed) {
      navigate("/dashboard", { replace: true });
    }
  }, [roles, navigate]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFaceImage(e.target.files[0]);
      setPreviewUrl(URL.createObjectURL(e.target.files[0]));
    }
  };

  const validate = () => {
    if (!form.fullName.trim()) return "El nombre es obligatorio";
    if (!form.docType) return "Selecciona el tipo de documento";
    if (!form.docNumber.trim()) return "El número de documento es obligatorio";
    if (!faceImage) return "Por favor selecciona una foto de rostro";
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

    const formData = new FormData();
    formData.append("full_name", form.fullName);
    formData.append("doc_type", form.docType);
    formData.append("doc_number", form.docNumber);
    formData.append("phone", form.phone);
    formData.append("face_images", faceImage!);

    try {
      const res = await identityApi.post("/visitors/enroll", formData, {
        headers: {
          "X-IDENTITY-KEY": API_KEY,
          // No pongas 'Content-Type': axios la setea automáticamente con boundaries para multipart
        },
      });

      const data = res.data;

      setResult(
        `¡Visitante registrado!\nID: ${data.visitor_id}\nRostros válidos: ${data.faces}\nEstado: ${data.status}`
      );
      setError(null);
      setForm({ fullName: "", docType: "DNI", docNumber: "", phone: "" });
      setFaceImage(null);
      setPreviewUrl(null);
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
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
      title="Registrar visitante"
      subtitle="Registra un visitante y asocia su rostro"
      icon={<IdentificationIcon className="w-8 h-8 text-blue-400" />}
      user={user}
      onLogout={onLogout}
    >
      <div className="w-full max-w-lg mx-auto bg-gray-900 rounded-2xl shadow-2xl p-8 border border-blue-800/40">
        <h2 className="text-2xl font-bold text-blue-300 mb-4 text-center">Datos del visitante</h2>
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
            name="fullName"
            placeholder="Nombre completo"
            value={form.fullName}
            required
            onChange={handleChange}
            autoComplete="name"
            className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          <select
            name="docType"
            value={form.docType}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          >
            {DOC_TYPES.map((dt) => (
              <option key={dt.value} value={dt.value}>
                {dt.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            name="docNumber"
            placeholder="Número de documento"
            value={form.docNumber}
            required
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          <input
            type="text"
            name="phone"
            placeholder="Teléfono (opcional)"
            value={form.phone}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          <div>
            <label className="block text-gray-400 mb-1 font-medium">Foto de rostro:</label>
            <input
              type="file"
              accept="image/*"
              required
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-800 file:text-white
                hover:file:bg-blue-700"
            />
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Preview"
                className="mt-3 rounded-md border border-blue-900 w-32 h-32 object-cover mx-auto"
              />
            )}
          </div>
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

export default RegistrarVisitante;