// src/pages/RegistrarAreaComun.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import DashboardLayout from "../Layouts/DashboardLayout";
import { useAdminCheck } from "../hooks/useRoles";
import {
  MapPin,
  Save,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  DollarSign
} from "lucide-react";

interface NewAreaData {
  nombre: string;
  precioxhora: number;
}

export default function RegistrarAreaComun() {
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const navigate = useNavigate();

  // Estados del formulario
  const [formData, setFormData] = useState<NewAreaData>({
    nombre: "",
    precioxhora: 0
  });

  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Verificar permisos de admin
  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/areas-comunes");
    }
  }, [isAdmin, adminLoading, navigate]);

  // Limpiar mensajes después de 5 segundos
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess("");
        setError("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  // Formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Manejar cambios en el formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? 0 : parseFloat(value) || 0) : value
    }));
  };

  // Enviar formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre.trim()) {
      setError("El nombre del área es obligatorio");
      return;
    }

    if (formData.precioxhora <= 0) {
      setError("El precio por hora debe ser mayor a 0");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const token = localStorage.getItem("access_token");
      await api.post("/reservas/areas-sociales/", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      setSuccess("Área social registrada exitosamente");
      
      // Limpiar formulario
      setFormData({
        nombre: "",
        precioxhora: 0
      });

      // Redirigir después de 2 segundos
      setTimeout(() => {
        navigate("/areas-comunes");
      }, 2000);
      
    } catch (error: unknown) {
      console.error("Error registrando área:", error);
      const apiError = error as { response?: { data?: { nombre?: string } } };
      if (apiError.response?.data?.nombre) {
        setError("Ya existe un área social con este nombre");
      } else {
        setError("Error al registrar el área social. Intenta nuevamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Mostrar loading mientras verifica permisos
  if (adminLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </DashboardLayout>
    );
  }

  // Si no es admin, la redirección se maneja en useEffect
  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-900/60 px-6 sm:px-10 py-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate("/areas-comunes")}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-slate-400" />
          </button>
          <div className="p-2 bg-blue-600/20 rounded-lg">
            <MapPin className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Registrar Área Común</h1>
            <p className="text-slate-400">Agrega una nueva área social al condominio</p>
          </div>
        </div>

        {/* Mensajes de estado */}
        {success && (
          <div className="mt-4 rounded-lg border border-green-700/50 bg-green-900/30 px-4 py-3 text-sm flex items-center gap-2">
            <CheckCircle size={16} className="text-green-400" />
            {success}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-lg border border-red-700/50 bg-red-900/30 px-4 py-3 text-sm flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400" />
            {error}
          </div>
        )}
      </div>

      {/* Contenido principal */}
      <main className="px-6 sm:px-10 py-8">
        <div className="max-w-2xl mx-auto">
          <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 shadow-xl">
            <div className="p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-blue-600/20 rounded-lg">
                  <MapPin className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Información del Área Social</h2>
                  <p className="text-slate-400">Completa los datos del área común</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Nombre del área */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Nombre del Área Social *
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    placeholder="Ej: Piscina, Salón de eventos, Cancha de tenis..."
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    required
                  />
                </div>

                {/* Precio por hora */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Precio por Hora *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="w-5 h-5 text-slate-400" />
                    </div>
                    <input
                      type="number"
                      name="precioxhora"
                      value={formData.precioxhora === 0 ? "" : formData.precioxhora}
                      onChange={handleInputChange}
                      placeholder="Ingresa el precio por hora"
                      min="1"
                      className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                      required
                    />
                  </div>
                  {formData.precioxhora > 0 && (
                    <p className="mt-2 text-sm text-slate-400">
                      Precio: {formatCurrency(formData.precioxhora)}
                    </p>
                  )}
                </div>

                {/* Botones de acción */}
                <div className="flex gap-4 pt-6">
                  <button
                    type="button"
                    onClick={() => navigate("/areas-comunes")}
                    className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition flex items-center justify-center gap-2"
                    disabled={loading}
                  >
                    <ArrowLeft size={18} />
                    Volver
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition flex items-center justify-center gap-2"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        Registrando...
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        Registrar Área
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </main>
    </DashboardLayout>
  );
}